using System.ComponentModel.DataAnnotations;

namespace Services.Requests.Auth;

public record LogoutRequest(
    [Required, MaxLength(512)]
    string RefreshToken);
