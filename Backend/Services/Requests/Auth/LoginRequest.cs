using System.ComponentModel.DataAnnotations;

namespace Services.Requests.Auth;

public record LoginRequest(
    [Required, MaxLength(64)]
    string Username,
    [Required, MaxLength(128)]
    string Password);
