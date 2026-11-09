using Services.Responses.Auth;

namespace Services.Responses.Users;

public sealed record UserPageResponse(
    IReadOnlyList<UserResponse> Items, int Page, int Limit, int Total);
