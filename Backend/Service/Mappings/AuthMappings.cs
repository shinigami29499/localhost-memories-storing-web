using Domain.Entities;
using Domain.Enums;
using Service.Core;
using Service.Requests.Auth;
using Service.Responses.Auth;

namespace Service.Mappings;

internal static class AuthMappings
{
    internal static User ToUser(RegisterRequest request) => new()
    {
        Username = request.Username.Trim(),
        Password = request.Password,
        Status = AccountStatus.Active,
    };

    internal static UserResponse ToResponse(User user) => new(
        user.Id,
        user.Username,
        user.Role == UserRole.Admin ? Constants.Roles.Admin : Constants.Roles.User,
        user.Status == AccountStatus.Active ? "active" : "disabled",
        user.CreatedAt);
}
