namespace Services.Interfaces;

public sealed record DownloadRecordDto(Guid Id, Guid MediaId, string OriginalFilename, Guid UserId, string Username, DateTime CreatedAt, Guid? BatchId);
public sealed record DownloadHistoryResponse(IReadOnlyList<DownloadRecordDto> Items, int TotalItems);

public sealed record DownloadItemStateDto(Guid Id, Guid MediaId, string OriginalFilename, long FileSizeBytes, bool IncludeDeleted, string Status, long Loaded, string? Error);
public sealed record DownloadBatchStateDto(Guid Id, Guid UserId, string Username, DateTime CreatedAt, IReadOnlyList<DownloadItemStateDto> Items);
public sealed record SaveDownloadBatchRequest(List<DownloadItemStateDto> Items);
public sealed record DownloadBatchStatePage(IReadOnlyList<DownloadBatchStateDto> Items, int TotalItems);

public interface IDownloadHistoryService
{
    Task<bool> DeleteRecordsAsync(Guid userId, Guid batchId, IReadOnlyCollection<Guid> itemIds, CancellationToken cancellationToken);
    Task<bool> DeleteRecordAsync(Guid userId, Guid batchId, Guid? itemId, CancellationToken cancellationToken);
    Task<DownloadBatchStatePage> ListBatchesAsync(Guid userId, bool isAdmin, int offset, int limit, CancellationToken cancellationToken);
    Task<bool> SaveBatchAsync(Guid userId, Guid batchId, IReadOnlyList<DownloadItemStateDto> items, CancellationToken cancellationToken);
    Task RecordAsync(Guid userId, Guid mediaId, string filename, CancellationToken cancellationToken);
    Task RecordAsync(Guid userId, Guid mediaId, string filename, Guid? batchId, CancellationToken cancellationToken);
    Task<DownloadHistoryResponse> ListAsync(Guid userId, bool isAdmin, int offset, int limit, CancellationToken cancellationToken);
}
