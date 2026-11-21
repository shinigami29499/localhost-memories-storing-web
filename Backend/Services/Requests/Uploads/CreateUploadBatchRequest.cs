namespace Services.Requests.Uploads;

public sealed record CreateUploadBatchRequest(Guid AlbumId, IReadOnlyList<CreateUploadItemRequest> Items);

public sealed record CreateUploadItemRequest(
    Guid Id,
    string OriginalFilename,
    string ContentType,
    long FileSizeBytes);
