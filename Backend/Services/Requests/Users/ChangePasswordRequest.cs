using System.ComponentModel.DataAnnotations;

namespace Services.Requests.Users;

public record ChangePasswordRequest(
    [Required, MaxLength(128)] string CurrentPassword,
    [Required, MinLength(8), MaxLength(128)] string NewPassword);
