using Microsoft.EntityFrameworkCore;
using Domains.Entities;
using Infrastructures.Data.Interfaces;

namespace Infrastructures.Data.Implementations;

public sealed class UserRepository(ApplicationDbContext db) : IUserRepository
{
    public async Task<IReadOnlyList<User>> ListUsersAsync(CancellationToken cancellationToken = default)
        => await db.Users
            .OrderBy(u => u.Status == Domains.Enums.AccountStatus.PendingApproval ? 0 : 1)
            .ThenByDescending(u => u.CreatedAt)
            .ToListAsync(cancellationToken);

    public Task<User?> FindUserAsync(Guid userId, CancellationToken cancellationToken = default)
        => db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

    public async Task<IReadOnlyList<RefreshToken>> FindActiveRefreshTokensAsync(
        Guid userId, DateTime utcNow, CancellationToken cancellationToken = default)
        => await db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null && t.ExpiresAt > utcNow)
            .ToListAsync(cancellationToken);
}
