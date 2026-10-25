using System.ComponentModel.DataAnnotations;

namespace Services.Requests.Auth;

public record RefreshTokenRequest(
    [Required, MaxLength(512)]
    string RefreshToken);
