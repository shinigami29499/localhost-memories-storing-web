using System.ComponentModel.DataAnnotations;

namespace Services.Requests.Users;

public sealed record UserMentionSearchRequest(
    [param: Required, StringLength(64, MinimumLength = 1), RegularExpression(
        @"^[a-zA-Z0-9_.\-]+$",
        ErrorMessage = "Search may contain letters, digits, '_', '.' and '-' only.")]
    string Query);
