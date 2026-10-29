namespace Domains.Entities;

public class MediaFile : AuditableEntity
{
    public Guid OwnerId { get; set; }
    public User Owner { get; set; } = null!;

    // Display only; storage paths use generated filenames.
    public required string OriginalFilename { get; set; }
    public required string StoredFilename { get; set; }

    // Preserved during trash moves for restoration.
    public required string RelativePath { get; set; }
    public string? TrashRelativePath { get; set; }
    public DateTime? TrashedAt { get; set; }
    public required string MimeType { get; set; }
    public required string FileExtension { get; set; }
    public long FileSizeBytes { get; set; }
    public required string MediaKind { get; set; }
    public string? Metadata { get; set; }
}
