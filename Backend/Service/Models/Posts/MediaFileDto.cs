namespace Service.Models.Posts;

public record MediaFileDto(
    Guid Id,
    string MediaKind,
    string MimeType,
    string OriginalFilename,
    long FileSizeBytes,
    string StoragePath);
