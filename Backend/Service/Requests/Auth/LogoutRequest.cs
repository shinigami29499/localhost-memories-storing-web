using System.ComponentModel.DataAnnotations;

namespace Service.Requests.Auth;

public record LogoutRequest(
    [Required, MaxLength(512)]
    string RefreshToken);
