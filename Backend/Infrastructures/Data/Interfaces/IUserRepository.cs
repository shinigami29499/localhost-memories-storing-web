using Domains.Entities;

namespace Infrastructures.Data.Interfaces;

public interface IUserRepository
{
    Task<IReadOnlyList<User>> ListUsersAsync(CancellationToken cancellationToken = default);
    Task<User?> FindUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RefreshToken>> FindActiveRefreshTokensAsync(
        Guid userId, DateTime utcNow, CancellationToken cancellationToken = default);
}
