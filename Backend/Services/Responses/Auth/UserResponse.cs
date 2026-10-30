namespace Services.Responses.Auth;

public record UserResponse(
    Guid Id,
    string Username,
    string Role,
    string Status,
    DateTime CreatedAt,
    string? AvatarSeed = null);
