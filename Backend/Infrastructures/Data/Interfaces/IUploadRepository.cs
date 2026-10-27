using Domains.Entities;

namespace Infrastructures.Data.Interfaces;

public interface IUploadRepository
{
    void AddBatch(UploadBatch batch);
    Task LockBatchAsync(Guid ownerId, Guid batchId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<UploadBatch>> GetBatchesAsync(
        Guid actorId, bool isAdmin, int offset, int limit, CancellationToken cancellationToken = default);
    Task<int> CountBatchesAsync(Guid actorId, bool isAdmin, CancellationToken cancellationToken = default);
    Task<UploadBatch?> FindBatchAsync(Guid batchId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<UploadBatch>> GetActiveBatchesAsync(
        Guid ownerId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<UploadItem>> GetPendingItemsAsync(
        Guid ownerId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<UploadItem>> GetUploadingItemsAsync(
        Guid ownerId, CancellationToken cancellationToken = default);
    Task<UploadItem?> FindItemAsync(
        Guid batchId, Guid itemId, CancellationToken cancellationToken = default);
    Task<UploadItem?> FindItemForProgressAsync(
        Guid batchId, Guid itemId, CancellationToken cancellationToken = default);
    Task<int> ReportProgressAsync(
        Guid ownerId,
        Guid batchId,
        Guid itemId,
        int progressPercent,
        DateTime updatedAt,
        CancellationToken cancellationToken = default);
}
