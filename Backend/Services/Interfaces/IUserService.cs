using Services.Responses.Auth;
using Services.Models.Users;
using Services.Requests.Users;
using Services.Responses.Users;

namespace Services.Interfaces;

public interface IUserService
{
    Task<IReadOnlyList<UserResponse>> ListAsync(CancellationToken cancellationToken = default);
    Task<UserPageResponse> GetPageAsync(int page, int limit, bool pendingOnly, bool blockedOnly,
        CancellationToken cancellationToken = default);
    Task<DateTime> HeartbeatAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<UserResponse> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default);
    Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken cancellationToken = default);
    Task<UserResponse> SetAvatarAsync(
        Guid userId, SetAvatarRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<UserMentionCandidateDto>> SearchMentionCandidatesAsync(
        string usernamePrefix, CancellationToken cancellationToken = default);
    Task<UserResponse> ApproveAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<UserResponse> DisableAsync(Guid userId, Guid disabledBy, CancellationToken cancellationToken = default);
    Task<UserResponse> ActivateAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<UserResponse> UpdateRoleAsync(Guid userId, Guid updatedBy, UpdateUserRoleRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid userId, Guid deletedBy, CancellationToken cancellationToken = default);
    Task<HomeLocationDto?> GetHomeLocationAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<HomeLocationDto> SetHomeLocationAsync(
        Guid userId, SetHomeLocationRequest request, CancellationToken cancellationToken = default);
    Task ClearHomeLocationAsync(Guid userId, CancellationToken cancellationToken = default);
}
