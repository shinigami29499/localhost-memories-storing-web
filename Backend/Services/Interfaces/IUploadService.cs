using Microsoft.AspNetCore.Http;
using Services.Models.Uploads;
using Services.Requests.Uploads;
using Services.Responses.Uploads;

namespace Services.Interfaces;

public interface IUploadService
{
    Task<UploadBatchDto> CreateBatchAsync(
        Guid ownerId, CreateUploadBatchRequest request, CancellationToken cancellationToken = default);
    Task<PagedUploadBatchesResponse> GetBatchesAsync(
        Guid actorId, bool isAdmin, int offset, int limit, CancellationToken cancellationToken = default);
    Task<PagedUploadBatchesResponse> GetBatchesAsync(
        Guid actorId, bool isAdmin, int offset, int limit,
        DateTimeOffset? createdFrom, DateTimeOffset? createdBefore, CancellationToken cancellationToken = default);
    Task<UploadBatchDto> GetBatchAsync(
        Guid actorId, bool isAdmin, Guid batchId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<UploadItemDto>> GetPendingItemsAsync(
        Guid ownerId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<UploadBatchDto>> GetActiveBatchesAsync(
        Guid ownerId, CancellationToken cancellationToken = default);
    Task RecoverInterruptedAsync(Guid ownerId, CancellationToken cancellationToken = default);
    Task<UploadItemDto> StartItemAsync(
        Guid ownerId, Guid batchId, Guid itemId, CancellationToken cancellationToken = default);
    Task<UploadItemDto> ReportProgressAsync(
        Guid ownerId, Guid batchId, Guid itemId, int progressPercent, CancellationToken cancellationToken = default);
    Task<UploadFileResult> UploadFileAsync(
        Guid ownerId, Guid batchId, Guid itemId, IFormFile file, CancellationToken cancellationToken = default);
    Task<UploadItemDto> CancelItemAsync(
        Guid ownerId, Guid batchId, Guid itemId, CancellationToken cancellationToken = default);
    Task<UploadItemDto> FailItemAsync(
        Guid ownerId, Guid batchId, Guid itemId, string errorDetails, CancellationToken cancellationToken = default);
}
