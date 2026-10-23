using Microsoft.EntityFrameworkCore;
using Service.Core;
using Service.Exceptions;
using Service.Interfaces;
using Service.Responses.Auth;
using Data;
using Domain.Entities;
using Domain.Enums;

namespace Service.Implementations;

public class UserService(ApplicationDbContext db, IMapper mapper) : IUserService
{
    private readonly ApplicationDbContext _db = db;

    public async Task<IReadOnlyList<UserResponse>> ListAsync(CancellationToken cancellationToken = default)
    {
        // Pending accounts first so the admin approval queue is immediately visible.
        var users = await _db.Users
            .OrderBy(u => u.Status == AccountStatus.PendingApproval ? 0 : 1)
            .ThenByDescending(u => u.CreatedAt)
            .ToListAsync(cancellationToken);

        return users.Select(mapper.Map).ToList();
    }

    public async Task<UserResponse> ApproveAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null || user.DeletedAt is not null)
            throw new NotFoundException("User not found.");

        if (user.Status != AccountStatus.PendingApproval)
            throw new ConflictException("Only pending accounts can be approved.");

        user.Status = AccountStatus.Active;
        await _db.SaveChangesAsync(cancellationToken);
        return mapper.Map(user);
    }

    public async Task DeleteAsync(Guid userId, Guid deletedBy, CancellationToken cancellationToken = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null || user.DeletedAt is not null)
            throw new NotFoundException("User not found.");

        var utcNow = DateTime.UtcNow;
        user.DeletedAt = utcNow;
        user.DeletedBy = deletedBy;

        // Revoke active sessions so a deleted account cannot stay signed in.
        var activeTokens = await _db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null && t.ExpiresAt > utcNow)
            .ToListAsync(cancellationToken);
        foreach (var token in activeTokens)
        {
            token.RevokedAt = utcNow;
            token.RevokedReason = Constants.Auth.RevocationReasons.UserDeleted;
            token.RevokedBy = deletedBy;
        }

        await _db.SaveChangesAsync(cancellationToken);
    }
}
