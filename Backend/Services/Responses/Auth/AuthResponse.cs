namespace Services.Responses.Auth;

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    UserResponse User);
