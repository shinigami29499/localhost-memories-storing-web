using Services.Responses.Auth;
using Services.Models.Users;
using Services.Requests.Users;

namespace Services.Interfaces;

public interface IUserService
{
    Task<IReadOnlyList<UserResponse>> ListAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<UserMentionCandidateDto>> SearchMentionCandidatesAsync(
        string usernamePrefix, CancellationToken cancellationToken = default);
    Task<UserResponse> ApproveAsync(Guid userId, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid userId, Guid deletedBy, CancellationToken cancellationToken = default);
    Task<HomeLocationDto?> GetHomeLocationAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<HomeLocationDto> SetHomeLocationAsync(
        Guid userId, SetHomeLocationRequest request, CancellationToken cancellationToken = default);
    Task ClearHomeLocationAsync(Guid userId, CancellationToken cancellationToken = default);
}
