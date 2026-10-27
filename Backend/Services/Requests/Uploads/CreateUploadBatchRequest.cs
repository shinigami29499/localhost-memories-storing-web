namespace Services.Requests.Uploads;

public sealed record CreateUploadBatchRequest(IReadOnlyList<CreateUploadItemRequest> Items, string? Caption = null);

public sealed record CreateUploadItemRequest(
    Guid Id,
    string OriginalFilename,
    string ContentType,
    long FileSizeBytes);
