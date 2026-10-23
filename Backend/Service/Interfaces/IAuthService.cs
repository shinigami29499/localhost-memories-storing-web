using Service.Requests.Auth;
using Service.Responses.Auth;

namespace Service.Interfaces;

public interface IAuthService
{
    Task<UserResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
    Task<AuthResponse> RefreshAsync(string rawRefreshToken, CancellationToken cancellationToken = default);
    Task LogoutAsync(Guid userId, string rawRefreshToken, CancellationToken cancellationToken = default);
}
