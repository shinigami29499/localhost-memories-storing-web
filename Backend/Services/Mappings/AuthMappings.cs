using Domains.Entities;
using Domains.Enums;
using Services.Core;
using Services.Requests.Auth;
using Services.Responses.Auth;

namespace Services.Mappings;

internal static class AuthMappings
{
    internal static User ToUser(RegisterRequest request) => new()
    {
        Username = request.Username.Trim(),
        Password = request.Password,
        Role = UserRole.User,
        Status = AccountStatus.PendingApproval,
    };

    internal static UserResponse ToResponse(User user) => new(
        user.Id,
        user.Username,
        user.Role switch { UserRole.SuperAdmin => Constants.Roles.SuperAdmin, UserRole.Admin => Constants.Roles.Admin, _ => Constants.Roles.User },
        user.Status switch
        {
            AccountStatus.PendingApproval => "pending_approval",
            AccountStatus.Rejected => "rejected",
            AccountStatus.Disabled => "disabled",
            _ => "active",
        },
        user.CreatedAt,
        user.AvatarSeed,
        user.LastSeenAt);
}
