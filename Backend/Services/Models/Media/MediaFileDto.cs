namespace Services.Models.Media;

public sealed record MediaFileDto(
    Guid Id,
    string MediaKind,
    string MimeType,
    string OriginalFilename,
    long FileSizeBytes,
    DateTime CreatedAt,
    bool IsFavorited);
