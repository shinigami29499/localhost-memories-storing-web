namespace Services.Models.Uploads;

public sealed record UploadBatchDto(
    Guid Id,
    string Status,
    string? Username,
    bool CanManage,
    DateTime CreatedAt,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    int TotalFiles,
    int SuccessfulFiles,
    int FailedFiles,
    int PendingFiles,
    int UploadingFiles,
    int CancelledFiles,
    int ProgressPercent,
    IReadOnlyList<UploadItemDto> Items);
