using Microsoft.EntityFrameworkCore;
using Domains.Entities;
using Infrastructures.Data.Interfaces;

namespace Infrastructures.Data.Implementations;

public sealed class AuthRepository(ApplicationDbContext db) : IAuthRepository
{
    public async Task<User?> LockUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await db.Users.FromSqlInterpolated($"SELECT * FROM users WHERE id = {userId} FOR UPDATE")
            .FirstOrDefaultAsync(cancellationToken);
        if (user is not null) await db.Entry(user).ReloadAsync(cancellationToken);
        return user;
    }

    public Task ReloadTokenAsync(RefreshToken token, CancellationToken cancellationToken = default)
        => db.Entry(token).ReloadAsync(cancellationToken);

    // Username comparisons are case-insensitive in PostgreSQL via lower(), matching the
    // trimmed input supplied by the application layer.
    public Task<bool> UsernameExistsAsync(string username, CancellationToken cancellationToken = default)
        => db.Users.AnyAsync(u => u.Username.ToLower() == username.ToLower(), cancellationToken);

    public Task<User?> FindUserByUsernameAsync(string username, CancellationToken cancellationToken = default)
        => db.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == username.ToLower(), cancellationToken);

    public Task<User?> FindUserByIdAsync(Guid userId, CancellationToken cancellationToken = default)
        => db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

    public Task<RefreshToken?> FindRefreshTokenAsync(
        string tokenHash, CancellationToken cancellationToken = default)
        => db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == tokenHash, cancellationToken);

    public async Task<IReadOnlyList<RefreshToken>> FindActiveRefreshTokensAsync(
        Guid userId, DateTime utcNow, CancellationToken cancellationToken = default)
        => await db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null && t.ExpiresAt > utcNow)
            .ToListAsync(cancellationToken);

    public void AddUser(User user) => db.Users.Add(user);

    public void AddRefreshToken(RefreshToken token) => db.RefreshTokens.Add(token);
}
