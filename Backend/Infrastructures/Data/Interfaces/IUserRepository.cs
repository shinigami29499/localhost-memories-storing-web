using Domains.Entities;
using Services.Models.Users;

namespace Infrastructures.Data.Interfaces;

public interface IUserRepository
{
    Task<IReadOnlyList<User>> ListUsersAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<UserMentionCandidateDto>> FindMentionCandidatesAsync(
        string usernamePrefix, int limit, CancellationToken cancellationToken = default);
    Task<SharedHomeLocation> GetSharedHomeLocationAsync(CancellationToken cancellationToken = default);
    Task<User?> FindUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<User>> FindOnlineUsersAsync(DateTime sinceUtc, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RefreshToken>> FindActiveRefreshTokensAsync(
        Guid userId, DateTime utcNow, CancellationToken cancellationToken = default);
}
