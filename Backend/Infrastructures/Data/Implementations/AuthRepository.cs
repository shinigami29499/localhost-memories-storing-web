using Microsoft.EntityFrameworkCore;
using Domains.Entities;
using Infrastructures.Data.Interfaces;

namespace Infrastructures.Data.Implementations;

public sealed class AuthRepository(ApplicationDbContext db) : IAuthRepository
{
    public Task<bool> UsernameExistsAsync(string username, CancellationToken cancellationToken = default)
        => db.Users.AnyAsync(u => u.Username == username, cancellationToken);

    public Task<User?> FindUserByUsernameAsync(string username, CancellationToken cancellationToken = default)
        => db.Users.FirstOrDefaultAsync(u => u.Username == username, cancellationToken);

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
