using Domains.Enums;

namespace Domains.Entities;

public class UploadItem : AuditableEntity
{
    public Guid UploadBatchId { get; set; }
    public UploadBatch Batch { get; set; } = null!;
    public required string OriginalFilename { get; set; }
    public required string ContentType { get; set; }
    public long FileSizeBytes { get; set; }
    public UploadItemStatus Status { get; set; } = UploadItemStatus.Pending;
    public int ProgressPercent { get; set; }
    public string? ErrorDetails { get; set; }
    public int RetryCount { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? StoredFilename { get; set; }
    public string? RelativePath { get; set; }
    public string? MimeType { get; set; }
    public string? FileExtension { get; set; }
    public string? MediaKind { get; set; }
    public int Revision { get; set; }
}
