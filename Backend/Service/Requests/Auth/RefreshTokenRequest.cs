using System.ComponentModel.DataAnnotations;

namespace Service.Requests.Auth;

public record RefreshTokenRequest(
    [Required, MaxLength(512)]
    string RefreshToken);
