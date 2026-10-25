using Domains.Entities;

namespace Infrastructures.Data.Interfaces;

public interface IAuthRepository
{
    Task<bool> UsernameExistsAsync(string username, CancellationToken cancellationToken = default);
    Task<User?> FindUserByUsernameAsync(string username, CancellationToken cancellationToken = default);
    Task<User?> FindUserByIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<RefreshToken?> FindRefreshTokenAsync(string tokenHash, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RefreshToken>> FindActiveRefreshTokensAsync(
        Guid userId, DateTime utcNow, CancellationToken cancellationToken = default);
    void AddUser(User user);
    void AddRefreshToken(RefreshToken token);
}
