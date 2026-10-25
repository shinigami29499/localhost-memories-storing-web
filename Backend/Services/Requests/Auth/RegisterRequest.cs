using System.ComponentModel.DataAnnotations;

namespace Services.Requests.Auth;

public record RegisterRequest(
    [Required, MinLength(3), MaxLength(64), RegularExpression(
        @"^[a-zA-Z0-9_.\-]+$",
        ErrorMessage = "Username may contain letters, digits, '_', '.' and '-' only.")]
    string Username,
    [Required, MinLength(8), MaxLength(128)]
    string Password);
