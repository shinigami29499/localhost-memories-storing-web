using Services.Responses.Auth;

namespace Services.Interfaces;

public interface IUserService
{
    Task<IReadOnlyList<UserResponse>> ListAsync(CancellationToken cancellationToken = default);
    Task<UserResponse> ApproveAsync(Guid userId, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid userId, Guid deletedBy, CancellationToken cancellationToken = default);
}
