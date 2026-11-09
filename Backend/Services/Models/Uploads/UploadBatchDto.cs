namespace Services.Models.Uploads;

public sealed record UploadBatchDto(
    Guid Id,
    string Status,
    string? Username,
    bool CanManage,
    DateTime CreatedAt,
    DateTime? CompletedAt,
    int TotalFiles,
    int SuccessfulFiles,
    int FailedFiles,
    int CancelledFiles,
    IReadOnlyList<UploadItemDto> Items,
    DateTime? ViewedAt = null);
