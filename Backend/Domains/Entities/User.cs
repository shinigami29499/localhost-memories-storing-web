using Domains.Enums;

namespace Domains.Entities;

public class User : AuditableEntity
{
    public required string Username { get; set; }
    public required string Password { get; set; }
    public AccountStatus Status { get; set; } = AccountStatus.Active;
    public UserRole Role { get; set; } = UserRole.User;
}
