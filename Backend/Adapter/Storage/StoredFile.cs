namespace Infrastructure.Storage;

public sealed record StoredFile(
    string StoredFilename,
    string RelativePath,
    string MimeType,
    string FileExtension,
    string MediaKind,
    long SizeBytes);
