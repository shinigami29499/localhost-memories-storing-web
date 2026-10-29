using Microsoft.EntityFrameworkCore;
using Domains.Entities;
using Domains.Enums;
using Infrastructures.Data.Interfaces;
using Services.Models.Users;

namespace Infrastructures.Data.Implementations;

public sealed class UserRepository(ApplicationDbContext db) : IUserRepository
{
    public async Task<IReadOnlyList<User>> ListUsersAsync(CancellationToken cancellationToken = default)
        => await db.Users
            .OrderBy(u => u.Status == Domains.Enums.AccountStatus.PendingApproval ? 0 : 1)
            .ThenByDescending(u => u.CreatedAt)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<UserMentionCandidateDto>> FindMentionCandidatesAsync(
        string usernamePrefix, int limit, CancellationToken cancellationToken = default)
    {
        var escapedPrefix = usernamePrefix
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("_", "\\_", StringComparison.Ordinal);
        var pattern = $"{escapedPrefix}%";

        return await db.Users
            .AsNoTracking()
            .Where(user => user.Status == AccountStatus.Active
                && EF.Functions.ILike(user.Username, pattern, "\\"))
            .OrderBy(user => user.Username)
            .Take(limit)
            .Select(user => new UserMentionCandidateDto(user.Id, user.Username))
            .ToListAsync(cancellationToken);
    }

    public Task<User?> FindUserAsync(Guid userId, CancellationToken cancellationToken = default)
        => db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

    public async Task<IReadOnlyList<RefreshToken>> FindActiveRefreshTokensAsync(
        Guid userId, DateTime utcNow, CancellationToken cancellationToken = default)
        => await db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null && t.ExpiresAt > utcNow)
            .ToListAsync(cancellationToken);
}
