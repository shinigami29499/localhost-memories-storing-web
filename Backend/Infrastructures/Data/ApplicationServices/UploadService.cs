using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using Infrastructures.Adapters.Exceptions;
using Infrastructures.Adapters.Storage;
using Infrastructures.Data.Interfaces;
using Services.Core;
using Services.Exceptions;
using Services.Interfaces;
using Services.Models.Media;
using Services.Models.Uploads;
using Services.Requests.Uploads;
using Services.Responses.Uploads;
using Domains.Entities;
using Domains.Enums;

namespace Infrastructures.Data.ApplicationServices;

public sealed class UploadService(
    IUploadRepository repository,
    IUnitOfWork unitOfWork,
    IMediaStorage storage,
    MediaStorageOptions storageOptions,
    IMapper mapper,
    ILogger<UploadService> logger) : IUploadService
{
    private readonly IUploadRepository _repository = repository;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;
    private readonly IMediaStorage _storage = storage;
    private readonly MediaStorageOptions _storageOptions = storageOptions;
    private readonly IMapper _mapper = mapper;
    private readonly ILogger<UploadService> _logger = logger;

    public async Task<UploadBatchDto> CreateBatchAsync(
        Guid ownerId, CreateUploadBatchRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Items is null || request.Items.Count == 0)
            throw InvalidRequest("At least one file is required.", "items", "Select one or more files.");

        var maxFileBytes = _storageOptions.MaxFileMegabytes * 1024L * 1024L;
        var totalBytes = 0L;
        var items = new List<UploadItem>(request.Items.Count);
        var ids = new HashSet<Guid>();

        foreach (var requestItem in request.Items)
        {
            if (requestItem is null)
                throw InvalidRequest("Invalid upload item.", "items", "Every file must include its metadata.");

            if (requestItem.Id == Guid.Empty || !ids.Add(requestItem.Id))
                throw InvalidRequest("Upload item identifiers must be unique.", "items", "Invalid item identifier.");

            var filename = Path.GetFileName((requestItem.OriginalFilename ?? string.Empty).Replace('\\', '/')).Trim();
            if (string.IsNullOrWhiteSpace(filename) || filename.Length > 260)
                throw InvalidRequest("Invalid file name.", "items", "File names must contain 1 to 260 characters.");

            var extension = Path.GetExtension(filename);
            var allowedExtensions = _storageOptions.ImageExtensions
                .Concat(_storageOptions.VideoExtensions)
                .Select(value => value.ToLowerInvariant());
            if (string.IsNullOrWhiteSpace(extension)
                || !allowedExtensions.Contains(extension.ToLowerInvariant()))
                throw InvalidRequest("Unsupported media type.", "items", $"'{filename}' is not an allowed image or video.");

            if (requestItem.FileSizeBytes <= 0 || requestItem.FileSizeBytes > maxFileBytes)
                throw InvalidRequest(
                    "Invalid file size.",
                    "items",
                    $"'{filename}' must be larger than 0 and no larger than {_storageOptions.MaxFileMegabytes} MB.");

            if (requestItem.FileSizeBytes > UploadLimits.MaxTotalBytes - totalBytes)
                throw InvalidRequest(
                    "Upload batch is too large.",
                    "items",
                    $"Total media size must not exceed {UploadLimits.MaxTotalGigabytes} GB.");

            totalBytes += requestItem.FileSizeBytes;
            items.Add(new UploadItem
            {
                Id = requestItem.Id,
                OriginalFilename = filename,
                ContentType = !string.IsNullOrWhiteSpace(requestItem.ContentType)
                    && requestItem.ContentType.Length <= 100
                    ? requestItem.ContentType
                    : "application/octet-stream",
                FileSizeBytes = requestItem.FileSizeBytes,
                Status = UploadItemStatus.Pending,
                ProgressPercent = 0,
            });
        }

        var batch = new UploadBatch
        {
            OwnerId = ownerId,
            Status = UploadBatchStatus.Pending,
            Items = items,
        };
        foreach (var item in items)
            item.UploadBatchId = batch.Id;

        _repository.AddBatch(batch);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return MapBatch(batch, ownerId, includeUsername: false);
    }

    public async Task<PagedUploadBatchesResponse> GetBatchesAsync(
        Guid actorId, bool isAdmin, int offset, int limit, CancellationToken cancellationToken = default)
    {
        if (offset < 0 || limit < 1 || limit > 100)
            throw InvalidRequest("Invalid upload page.", "limit", "Offset must be non-negative and limit must be between 1 and 100.");

        var batches = await _repository.GetBatchesAsync(actorId, isAdmin, offset, limit, cancellationToken);
        var total = await _repository.CountBatchesAsync(actorId, isAdmin, cancellationToken);
        return new PagedUploadBatchesResponse(
            offset,
            limit,
            total,
            batches.Select(batch => MapBatch(batch, actorId, isAdmin)).ToList());
    }

    public async Task<UploadBatchDto> GetBatchAsync(
        Guid actorId, bool isAdmin, Guid batchId, CancellationToken cancellationToken = default)
    {
        var batch = await _repository.FindBatchAsync(batchId, cancellationToken);
        if (batch is null || (!isAdmin && batch.OwnerId != actorId))
            throw new NotFoundException($"Upload batch '{batchId}' was not found.");
        return MapBatch(batch, actorId, isAdmin);
    }

    public async Task<IReadOnlyList<UploadItemDto>> GetPendingItemsAsync(
        Guid ownerId, CancellationToken cancellationToken = default)
        => (await _repository.GetPendingItemsAsync(ownerId, cancellationToken))
            .Select(MapItem)
            .ToList();

    public async Task<IReadOnlyList<UploadBatchDto>> GetActiveBatchesAsync(
        Guid ownerId, CancellationToken cancellationToken = default)
        => (await _repository.GetActiveBatchesAsync(ownerId, cancellationToken))
            .Select(batch => MapBatch(batch, ownerId, includeUsername: false))
            .ToList();

    public async Task RecoverInterruptedAsync(Guid ownerId, CancellationToken cancellationToken = default)
    {
        var interrupted = await _repository.GetUploadingItemsAsync(ownerId, cancellationToken);
        if (interrupted.Count == 0)
            return;

        var utcNow = DateTime.UtcNow;
        foreach (var item in interrupted)
        {
            item.Status = UploadItemStatus.Failed;
            item.ProgressPercent = 0;
            item.ErrorDetails = "Upload was interrupted. Retry this file to continue.";
            item.CompletedAt = utcNow;
            item.Revision++;
            RefreshBatchStatus(item.Batch, utcNow);
        }

        try
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            _logger.LogInformation("An upload changed while interrupted uploads were being recovered for {OwnerId}", ownerId);
        }
    }

    public async Task<UploadItemDto> StartItemAsync(
        Guid ownerId, Guid batchId, Guid itemId, CancellationToken cancellationToken = default)
    {
        await using var transaction = await _unitOfWork.BeginTransactionAsync(cancellationToken);
        await _repository.LockBatchAsync(ownerId, batchId, cancellationToken);
        var item = await FindOwnedItemAsync(ownerId, batchId, itemId, cancellationToken);
        if (item.Status is not (UploadItemStatus.Pending or UploadItemStatus.Failed))
            throw new ConflictException("Only pending or failed uploads can start.");
        if (item.Batch.Items.Any(other =>
                other.Id != item.Id && other.Status == UploadItemStatus.Uploading))
            throw new ConflictException("Another file in this batch is already uploading.");

        var isRetry = item.Status == UploadItemStatus.Failed;
        item.Status = UploadItemStatus.Uploading;
        item.ProgressPercent = 0;
        item.ErrorDetails = null;
        item.StartedAt = DateTime.UtcNow;
        item.CompletedAt = null;
        item.Revision++;
        if (isRetry)
            item.RetryCount++;
        item.Batch.Status = UploadBatchStatus.Uploading;
        item.Batch.StartedAt ??= item.StartedAt;
        item.Batch.CompletedAt = null;

        try
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException("This upload changed in another request. Refresh and try again.");
        }
        catch (DbUpdateException exception) when (IsUploadingIndexViolation(exception))
        {
            throw new ConflictException("Another file in this batch is already uploading.");
        }

        return MapItem(item);
    }

    public async Task<UploadItemDto> ReportProgressAsync(
        Guid ownerId,
        Guid batchId,
        Guid itemId,
        int progressPercent,
        CancellationToken cancellationToken = default)
    {
        if (progressPercent is < 0 or > 99)
            throw InvalidRequest("Invalid upload progress.", "progressPercent", "Progress must be between 0 and 99.");

        var changed = await _repository.ReportProgressAsync(
            ownerId, batchId, itemId, progressPercent, DateTime.UtcNow, cancellationToken);
        var item = await FindOwnedItemAsync(
            ownerId, batchId, itemId, cancellationToken, includeBatchItems: false);
        if (changed == 0 && item.Status != UploadItemStatus.Uploading)
            throw new ConflictException("Progress can only be updated while the file is uploading.");
        return MapItem(item);
    }

    public async Task<UploadFileResult> UploadFileAsync(
        Guid ownerId,
        Guid batchId,
        Guid itemId,
        IFormFile file,
        CancellationToken cancellationToken = default)
    {
        var registered = await FindOwnedItemAsync(
            ownerId, batchId, itemId, cancellationToken, includeBatchItems: false);
        if (registered.Status != UploadItemStatus.Uploading)
            throw new ConflictException("Start this upload before sending its file.");

        var submittedFilename = Path.GetFileName(file.FileName.Replace('\\', '/'));
        if (file.Length != registered.FileSizeBytes
            || !string.Equals(submittedFilename, registered.OriginalFilename, StringComparison.Ordinal))
        {
            const string error = "The uploaded file does not match the registered file.";
            await FailItemAsync(ownerId, batchId, itemId, error, cancellationToken);
            throw InvalidRequest(error, "file", error);
        }

        StoredFile stored;
        try
        {
            await using var stream = file.OpenReadStream();
            stored = await _storage.SaveAsync(stream, registered.OriginalFilename, file.Length, cancellationToken);
        }
        catch (Exception exception)
        {
            var error = exception switch
            {
                InvalidMediaFileException => exception.Message,
                OperationCanceledException => "Upload was interrupted. Retry this file to continue.",
                _ => "Upload failed because the server could not store this file.",
            };
            try
            {
                await FailItemAsync(ownerId, batchId, itemId, error, CancellationToken.None);
            }
            catch (ConflictException)
            {
                _logger.LogInformation("Upload item {ItemId} changed while its storage failure was recorded", itemId);
            }
            throw;
        }

        try
        {
            await using var transaction = await _unitOfWork.BeginTransactionAsync(cancellationToken);
            await _repository.LockBatchAsync(ownerId, batchId, cancellationToken);
            var item = await FindOwnedItemAsync(ownerId, batchId, itemId, cancellationToken);
            if (item.Status != UploadItemStatus.Uploading || item.Revision != registered.Revision)
                throw new ConflictException("This upload was cancelled or changed before it could finish.");

            _repository.AddMediaFile(_mapper.Map(stored, ownerId, item.OriginalFilename));
            item.StoredFilename = stored.StoredFilename;
            item.RelativePath = stored.RelativePath;
            item.MimeType = stored.MimeType;
            item.FileExtension = stored.FileExtension;
            item.MediaKind = stored.MediaKind;
            item.FileSizeBytes = stored.SizeBytes;
            item.ProgressPercent = 100;
            item.Status = UploadItemStatus.Success;
            item.ErrorDetails = null;
            item.CompletedAt = DateTime.UtcNow;
            item.Revision++;
            RefreshBatchStatus(item.Batch, item.CompletedAt.Value);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return new UploadFileResult(MapItem(item));
        }
        catch (DbUpdateConcurrencyException)
        {
            await _storage.DeleteAsync(stored.RelativePath, CancellationToken.None);
            throw new ConflictException("This upload was cancelled or changed before it could finish.");
        }
        catch
        {
            await _storage.DeleteAsync(stored.RelativePath, CancellationToken.None);
            throw;
        }
    }

    public async Task<UploadItemDto> CancelItemAsync(
        Guid ownerId, Guid batchId, Guid itemId, CancellationToken cancellationToken = default)
    {
        await using var transaction = await _unitOfWork.BeginTransactionAsync(cancellationToken);
        await _repository.LockBatchAsync(ownerId, batchId, cancellationToken);
        var item = await FindOwnedItemAsync(ownerId, batchId, itemId, cancellationToken);
        if (item.Status is not (UploadItemStatus.Pending or UploadItemStatus.Uploading))
            throw new ConflictException("Only pending or uploading files can be cancelled.");

        item.Status = UploadItemStatus.Cancelled;
        item.ErrorDetails = null;
        item.CompletedAt = DateTime.UtcNow;
        item.Revision++;
        RefreshBatchStatus(item.Batch, item.CompletedAt.Value);
        await SaveStateAsync(item, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return MapItem(item);
    }

    public async Task<UploadItemDto> FailItemAsync(
        Guid ownerId,
        Guid batchId,
        Guid itemId,
        string errorDetails,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = await _unitOfWork.BeginTransactionAsync(cancellationToken);
        await _repository.LockBatchAsync(ownerId, batchId, cancellationToken);
        var item = await FindOwnedItemAsync(ownerId, batchId, itemId, cancellationToken);
        if (item.Status is not (UploadItemStatus.Pending or UploadItemStatus.Uploading))
            throw new ConflictException("Only pending or uploading files can fail.");

        await MarkFailedAsync(item, LimitError(errorDetails), cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return MapItem(item);
    }

    private async Task<UploadItem> FindOwnedItemAsync(
        Guid ownerId,
        Guid batchId,
        Guid itemId,
        CancellationToken cancellationToken,
        bool includeBatchItems = true)
    {
        var item = includeBatchItems
            ? await _repository.FindItemAsync(batchId, itemId, cancellationToken)
            : await _repository.FindItemForProgressAsync(batchId, itemId, cancellationToken);

        if (item is null || item.Batch.OwnerId != ownerId)
            throw new NotFoundException($"Upload item '{itemId}' was not found.");
        return item;
    }

    private async Task MarkFailedAsync(
        UploadItem item,
        string errorDetails,
        CancellationToken cancellationToken = default)
    {
        item.Status = UploadItemStatus.Failed;
        item.ErrorDetails = LimitError(errorDetails);
        item.CompletedAt = DateTime.UtcNow;
        item.Revision++;
        RefreshBatchStatus(item.Batch, item.CompletedAt.Value);

        await SaveStateAsync(item, cancellationToken);
    }

    private async Task SaveStateAsync(UploadItem item, CancellationToken cancellationToken)
    {
        try
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException("This upload changed in another request. Refresh and try again.");
        }
    }

    private static void RefreshBatchStatus(UploadBatch batch, DateTime utcNow)
    {
        var statuses = batch.Items.Select(item => item.Status).ToList();
        if (statuses.Any(status => status == UploadItemStatus.Uploading))
        {
            batch.Status = UploadBatchStatus.Uploading;
            batch.CompletedAt = null;
            return;
        }

        if (statuses.Any(status => status == UploadItemStatus.Pending))
        {
            batch.Status = batch.StartedAt.HasValue
                ? UploadBatchStatus.Uploading
                : UploadBatchStatus.Pending;
            if (!batch.StartedAt.HasValue)
                batch.CompletedAt = null;
            return;
        }

        batch.Status = statuses.Any(status => status == UploadItemStatus.Failed)
            ? UploadBatchStatus.Failed
            : statuses.Any(status => status == UploadItemStatus.Cancelled)
                ? UploadBatchStatus.Cancelled
                : UploadBatchStatus.Completed;
        batch.CompletedAt = batch.Items
            .Select(item => item.CompletedAt)
            .Where(time => time.HasValue)
            .Max() ?? utcNow;
    }

    private static UploadBatchDto MapBatch(UploadBatch batch, Guid actorId, bool includeUsername)
    {
        var files = batch.Items.OrderBy(item => item.CreatedAt).ToList();
        var totalBytes = files.Sum(item => item.FileSizeBytes);
        var completedBytes = files.Sum(item =>
            item.Status == UploadItemStatus.Success
                ? item.FileSizeBytes
                : item.FileSizeBytes * item.ProgressPercent / 100);
        var progress = totalBytes == 0
            ? 0
            : files.All(item => item.Status == UploadItemStatus.Success)
                ? 100
                : (int)(completedBytes * 100 / totalBytes);

        return new UploadBatchDto(
            batch.Id,
            batch.Status.ToString(),
            includeUsername ? batch.Owner.Username : null,
            batch.OwnerId == actorId,
            batch.CreatedAt,
            batch.StartedAt,
            batch.CompletedAt,
            files.Count,
            files.Count(item => item.Status == UploadItemStatus.Success),
            files.Count(item => item.Status == UploadItemStatus.Failed),
            files.Count(item => item.Status == UploadItemStatus.Pending),
            files.Count(item => item.Status == UploadItemStatus.Uploading),
            files.Count(item => item.Status == UploadItemStatus.Cancelled),
            progress,
            files.Select(MapItem).ToList());
    }

    private static UploadItemDto MapItem(UploadItem item)
        => new(
            item.Id,
            item.UploadBatchId,
            item.OriginalFilename,
            item.ContentType,
            item.FileSizeBytes,
            item.Status.ToString(),
            item.ProgressPercent,
            item.ErrorDetails,
            item.RetryCount,
            item.StartedAt,
            item.CompletedAt);

    private static ValidationException InvalidRequest(string message, string field, string detail)
        => new(message, new Dictionary<string, string[]> { [field] = [detail] });

    private static string LimitError(string? errorDetails)
    {
        var normalized = string.IsNullOrWhiteSpace(errorDetails)
            ? "Upload failed."
            : errorDetails.Trim();
        return normalized.Length <= 2000 ? normalized : normalized[..2000];
    }

    private static bool IsUploadingIndexViolation(DbUpdateException exception)
        => exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation,
            ConstraintName: "ix_upload_items_one_uploading_per_batch",
        };
}
