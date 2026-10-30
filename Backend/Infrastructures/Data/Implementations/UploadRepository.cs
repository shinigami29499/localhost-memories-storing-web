using Microsoft.EntityFrameworkCore;
using Domains.Entities;
using Domains.Enums;
using Infrastructures.Data.Interfaces;

namespace Infrastructures.Data.Implementations;

public sealed class UploadRepository(ApplicationDbContext db) : IUploadRepository
{
    public void AddBatch(UploadBatch batch) => db.UploadBatches.Add(batch);

    public void AddMediaFile(MediaFile mediaFile) => db.MediaFiles.Add(mediaFile);

    public async Task LockBatchAsync(Guid ownerId, Guid batchId, CancellationToken cancellationToken = default)
    {
        await db.UploadBatches
            .FromSqlInterpolated(
                $"SELECT * FROM upload_batches WHERE id = {batchId} AND owner_id = {ownerId} FOR UPDATE")
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<UploadBatch>> GetBatchesAsync(
        Guid actorId, bool isAdmin, int offset, int limit, CancellationToken cancellationToken = default,
        DateTime? createdFrom = null, DateTime? createdBefore = null)
    {
        var query = QueryBatches(actorId, isAdmin, createdFrom, createdBefore);

        return await query
            .Include(batch => batch.Owner)
            .Include(batch => batch.Items.OrderBy(item => item.CreatedAt))
            .OrderByDescending(batch => batch.CreatedAt)
            .Skip(offset)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }

    public Task<int> CountBatchesAsync(
        Guid actorId, bool isAdmin, CancellationToken cancellationToken = default,
        DateTime? createdFrom = null, DateTime? createdBefore = null)
        => QueryBatches(actorId, isAdmin, createdFrom, createdBefore).CountAsync(cancellationToken);

    private IQueryable<UploadBatch> QueryBatches(
        Guid actorId, bool isAdmin, DateTime? createdFrom, DateTime? createdBefore)
    {
        var query = db.UploadBatches.AsQueryable();
        if (!isAdmin)
            query = query.Where(batch => batch.OwnerId == actorId);
        if (createdFrom.HasValue)
            query = query.Where(batch => batch.CreatedAt >= createdFrom.Value);
        if (createdBefore.HasValue)
            query = query.Where(batch => batch.CreatedAt < createdBefore.Value);
        return query;
    }

    public Task<UploadBatch?> FindBatchAsync(Guid batchId, CancellationToken cancellationToken = default)
        => db.UploadBatches
            .Include(batch => batch.Owner)
            .Include(batch => batch.Items.OrderBy(item => item.CreatedAt))
            .FirstOrDefaultAsync(batch => batch.Id == batchId, cancellationToken);

    public async Task<IReadOnlyList<UploadBatch>> GetActiveBatchesAsync(
        Guid ownerId, CancellationToken cancellationToken = default)
        => await db.UploadBatches
            .Where(batch => batch.OwnerId == ownerId
                && batch.Items.Any(item =>
                    item.Status == UploadItemStatus.Pending
                    || item.Status == UploadItemStatus.Uploading))
            .Include(batch => batch.Items.OrderBy(item => item.CreatedAt))
            .OrderBy(batch => batch.CreatedAt)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<UploadItem>> GetPendingItemsAsync(
        Guid ownerId, CancellationToken cancellationToken = default)
        => await db.UploadItems
            .Where(item => item.Batch.OwnerId == ownerId && item.Status == UploadItemStatus.Pending)
            .Include(item => item.Batch)
            .OrderBy(item => item.Batch.CreatedAt)
            .ThenBy(item => item.CreatedAt)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<UploadItem>> GetUploadingItemsAsync(
        Guid ownerId, CancellationToken cancellationToken = default)
        => await db.UploadItems
            .Where(item => item.Batch.OwnerId == ownerId && item.Status == UploadItemStatus.Uploading)
            .Include(item => item.Batch)
            .Include(item => item.Batch.Items)
            .ToListAsync(cancellationToken);

    public Task<UploadItem?> FindItemAsync(
        Guid batchId, Guid itemId, CancellationToken cancellationToken = default)
        => db.UploadItems
            .Include(item => item.Batch)
            .ThenInclude(batch => batch.Owner)
            .Include(item => item.Batch.Items)
            .FirstOrDefaultAsync(
                item => item.UploadBatchId == batchId && item.Id == itemId,
                cancellationToken);

    public Task<UploadItem?> FindItemForProgressAsync(
        Guid batchId, Guid itemId, CancellationToken cancellationToken = default)
        => db.UploadItems
            .AsNoTracking()
            .Include(item => item.Batch)
            .FirstOrDefaultAsync(
                item => item.UploadBatchId == batchId && item.Id == itemId,
                cancellationToken);

    public Task<int> ReportProgressAsync(
        Guid ownerId,
        Guid batchId,
        Guid itemId,
        int progressPercent,
        DateTime updatedAt,
        CancellationToken cancellationToken = default)
        => db.UploadItems
            .Where(item => item.UploadBatchId == batchId
                && item.Id == itemId
                && item.Batch.OwnerId == ownerId
                && item.Status == UploadItemStatus.Uploading)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(
                    item => item.ProgressPercent,
                    item => item.ProgressPercent < progressPercent ? progressPercent : item.ProgressPercent)
                .SetProperty(item => item.UpdatedAt, updatedAt)
                .SetProperty(item => item.UpdatedBy, ownerId),
                cancellationToken);
}
