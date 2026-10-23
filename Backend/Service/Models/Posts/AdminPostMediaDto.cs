namespace Service.Models.Posts;

/// <summary>Media item of an admin post listing; the id identifies the storage file endpoint.</summary>
public record AdminPostMediaDto(
    Guid Id,
    string MediaKind,
    string MimeType);
