using System.Text.Json;
using Domains.Entities;
using Microsoft.EntityFrameworkCore;
using Services.Interfaces;

namespace Infrastructures.Data.ApplicationServices;

public class DownloadHistoryService(ApplicationDbContext db) : IDownloadHistoryService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<bool> DeleteRecordsAsync(Guid userId, Guid batchId, IReadOnlyCollection<Guid> itemIds, CancellationToken cancellationToken)
    {
        var batch = await db.DownloadBatchStates.FirstOrDefaultAsync(entry => entry.Id == batchId && entry.UserId == userId, cancellationToken);
        if (batch is null) return false;
        var items = JsonSerializer.Deserialize<List<DownloadItemStateDto>>(batch.ItemsJson, JsonOptions) ?? [];
        var ids = itemIds.ToHashSet();
        var selected = items.Where(item => ids.Contains(item.Id)).ToList();
        if (ids.Count == 0 || selected.Count != ids.Count) return false;
        if (selected.Any(item => item.Status == "Sent to browser")) throw new Services.Exceptions.ConflictException("Successful downloads cannot be deleted.");
        if (selected.Any(item => item.Status is "Pending" or "Downloading" or "Paused")) throw new Services.Exceptions.ConflictException("Active downloads cannot be deleted.");
        var mediaIds = selected.Select(item => item.MediaId).ToHashSet();
        var records = await db.DownloadRecords.Where(record => record.UserId == userId && record.BatchId == batchId && mediaIds.Contains(record.MediaId)).ToListAsync(cancellationToken);
        var now = DateTime.UtcNow;
        foreach (var record in records) { record.DeletedAt = now; record.DeletedBy = userId; }
        if (items.Count == selected.Count) { batch.DeletedAt = now; batch.DeletedBy = userId; }
        else batch.ItemsJson = JsonSerializer.Serialize(items.Where(item => !ids.Contains(item.Id)), JsonOptions);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteRecordAsync(Guid userId, Guid batchId, Guid? itemId, CancellationToken cancellationToken)
    {
        var batch = await db.DownloadBatchStates.FirstOrDefaultAsync(entry => entry.Id == batchId && entry.UserId == userId, cancellationToken);
        var records = await db.DownloadRecords.Where(record => record.UserId == userId && (record.BatchId == batchId || record.Id == batchId)).ToListAsync(cancellationToken);
        if (batch is null && records.Count == 0) return false;
        var items = batch is null ? [] : JsonSerializer.Deserialize<List<DownloadItemStateDto>>(batch.ItemsJson, JsonOptions) ?? [];
        var selected = itemId.HasValue ? items.Where(item => item.Id == itemId.Value).ToList() : items;
        if (selected.Any(item => item.Status == "Sent to browser")) throw new Services.Exceptions.ConflictException("Successful downloads cannot be deleted.");
        if (selected.Any(item => item.Status is "Pending" or "Downloading" or "Paused")) throw new Services.Exceptions.ConflictException("Active downloads cannot be deleted.");
        var mediaId = itemId.HasValue ? selected.FirstOrDefault()?.MediaId ?? records.FirstOrDefault(record => record.Id == itemId.Value)?.MediaId : null;
        if (itemId.HasValue && !mediaId.HasValue) return false;
        var now = DateTime.UtcNow;
        foreach (var record in records.Where(record => !itemId.HasValue || record.MediaId == mediaId)) { record.DeletedAt = now; record.DeletedBy = userId; }
        if (batch is not null)
        {
            if (!itemId.HasValue || items.Count == selected.Count) { batch.DeletedAt = now; batch.DeletedBy = userId; }
            else batch.ItemsJson = JsonSerializer.Serialize(items.Where(item => item.Id != itemId.Value), JsonOptions);
        }
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<DownloadBatchStatePage> ListBatchesAsync(Guid userId, bool isAdmin, int offset, int limit, CancellationToken cancellationToken)
    {
        var query = db.DownloadBatchStates.AsNoTracking().Where(batch => isAdmin || batch.UserId == userId);
        var total = await query.CountAsync(cancellationToken);
        var rows = await query.OrderByDescending(batch => batch.CreatedAt).ThenByDescending(batch => batch.Id)
            .Skip(Math.Max(0, offset)).Take(Math.Clamp(limit, 1, 100))
            .Select(batch => new { batch.Id, batch.UserId, batch.User.Username, batch.CreatedAt, batch.ItemsJson })
            .ToListAsync(cancellationToken);
        return new DownloadBatchStatePage(rows.Select(batch => new DownloadBatchStateDto(batch.Id, batch.UserId, batch.Username, batch.CreatedAt,
            JsonSerializer.Deserialize<List<DownloadItemStateDto>>(batch.ItemsJson, JsonOptions) ?? [])).ToList(), total);
    }

    public async Task<bool> SaveBatchAsync(Guid userId, Guid batchId, IReadOnlyList<DownloadItemStateDto> items, CancellationToken cancellationToken)
    {
        var batch = await db.DownloadBatchStates.IgnoreQueryFilters().FirstOrDefaultAsync(entry => entry.Id == batchId, cancellationToken);
        if (batch is not null && (batch.UserId != userId || batch.DeletedAt != null)) return false;
        if (batch is null)
        {
            batch = new DownloadBatchState { Id = batchId, UserId = userId, ItemsJson = "[]" };
            db.DownloadBatchStates.Add(batch);
        }
        batch.ItemsJson = JsonSerializer.Serialize(items, JsonOptions);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task RecordAsync(Guid userId, Guid mediaId, string filename, CancellationToken cancellationToken)
        => await RecordAsync(userId, mediaId, filename, null, cancellationToken);

    public async Task RecordAsync(Guid userId, Guid mediaId, string filename, Guid? batchId, CancellationToken cancellationToken)
    {
        db.Set<DownloadRecord>().Add(new DownloadRecord { UserId = userId, MediaId = mediaId, OriginalFilename = filename, BatchId = batchId });
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<DownloadHistoryResponse> ListAsync(Guid userId, bool isAdmin, int offset, int limit, CancellationToken cancellationToken)
    {
        var query = db.Set<DownloadRecord>().AsNoTracking().Where(record => isAdmin || record.UserId == userId);
        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderByDescending(record => record.CreatedAt).ThenByDescending(record => record.Id)
            .Skip(Math.Max(0, offset)).Take(Math.Clamp(limit, 1, 100))
            .Select(record => new DownloadRecordDto(record.Id, record.MediaId, record.OriginalFilename, record.UserId, record.User.Username, record.CreatedAt, record.BatchId))
            .ToListAsync(cancellationToken);
        return new DownloadHistoryResponse(items, total);
    }
}
