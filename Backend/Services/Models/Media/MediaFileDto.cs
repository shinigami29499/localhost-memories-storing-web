namespace Services.Models.Media;

public sealed record MediaFileDto(
    Guid Id,
    string MediaKind,
    string OriginalFilename,
    DateTime CreatedAt,
    bool IsFavorited,
    Guid OwnerId = default,
    MediaLocationDto? Location = null,
    string? OwnerUsername = null,
    bool IsPreviewOnly = false)
{
    public DateTime? DeletedAt { get; init; }
}
