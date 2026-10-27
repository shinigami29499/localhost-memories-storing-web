namespace Services.Models.Uploads;

public sealed record UploadItemDto(
    Guid Id,
    Guid UploadBatchId,
    string OriginalFilename,
    string ContentType,
    long FileSizeBytes,
    string Status,
    int ProgressPercent,
    string? ErrorDetails,
    int RetryCount,
    DateTime? StartedAt,
    DateTime? CompletedAt);
