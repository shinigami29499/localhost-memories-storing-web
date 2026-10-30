using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Apis.Authorization;
using Apis.Interfaces;
using Apis.Realtime;
using Services.Interfaces;
using Services.Models.Uploads;
using Services.Requests.Uploads;
using Services.Responses.Uploads;

namespace Apis.Controllers;

[ApiController]
[Route("api/sync/upload")]
[Route("api/uploads")]
[Authorize]
public sealed class UploadsController(
    IUploadService uploadService,
    ICurrentUserContext currentUser,
    IHubContext<NotificationsHub> notificationsHub,
    ILogger<UploadsController> logger) : ControllerBase
{
    private readonly IUploadService _uploadService = uploadService;
    private readonly ICurrentUserContext _currentUser = currentUser;

    [HttpGet("batches")]
    public async Task<ActionResult<PagedUploadBatchesResponse>> GetOwnBatchesAsync(
        [FromQuery] UploadListRequest request,
        CancellationToken cancellationToken)
        => Ok(await _uploadService.GetBatchesAsync(
            _currentUser.RequireUserId(), false, request.Offset, request.Limit,
            request.CreatedFrom, request.CreatedBefore, cancellationToken));

    [HttpPost("batches")]
    public async Task<ActionResult<UploadBatchDto>> CreateBatchAsync(
        CreateUploadBatchRequest request,
        CancellationToken cancellationToken)
    {
        var batch = await _uploadService.CreateBatchAsync(
            _currentUser.RequireUserId(), request, cancellationToken);
        await notificationsHub.NotifyUploadsChangedAsync(
            _currentUser.RequireUserId(), logger, cancellationToken);
        return Created($"/api/sync/upload/batches/{batch.Id}", batch);
    }

    [RequireAdmin]
    [HttpGet("admin/batches")]
    public async Task<ActionResult<PagedUploadBatchesResponse>> GetAllBatchesAsync(
        [FromQuery] UploadListRequest request,
        CancellationToken cancellationToken)
        => Ok(await _uploadService.GetBatchesAsync(
            _currentUser.RequireUserId(), true, request.Offset, request.Limit,
            request.CreatedFrom, request.CreatedBefore, cancellationToken));

    [HttpGet("batches/{batchId:guid}")]
    public async Task<ActionResult<UploadBatchDto>> GetBatchAsync(
        Guid batchId,
        CancellationToken cancellationToken)
        => Ok(await _uploadService.GetBatchAsync(
            _currentUser.RequireUserId(), _currentUser.IsAdmin, batchId, cancellationToken));

    [HttpGet("queue")]
    public async Task<ActionResult<IReadOnlyList<UploadItemDto>>> GetQueueAsync(
        CancellationToken cancellationToken)
        => Ok(await _uploadService.GetPendingItemsAsync(
            _currentUser.RequireUserId(), cancellationToken));

    [HttpGet("active")]
    public async Task<ActionResult<IReadOnlyList<UploadBatchDto>>> GetActiveAsync(
        CancellationToken cancellationToken)
        => Ok(await _uploadService.GetActiveBatchesAsync(
            _currentUser.RequireUserId(), cancellationToken));

    [HttpPost("recover")]
    public async Task<IActionResult> RecoverInterruptedAsync(CancellationToken cancellationToken)
    {
        await _uploadService.RecoverInterruptedAsync(
            _currentUser.RequireUserId(), cancellationToken);
        await notificationsHub.NotifyUploadsChangedAsync(
            _currentUser.RequireUserId(), logger, cancellationToken);
        return NoContent();
    }

    [HttpPost("batches/{batchId:guid}/items/{itemId:guid}/start")]
    public async Task<ActionResult<UploadItemDto>> StartItemAsync(
        Guid batchId,
        Guid itemId,
        CancellationToken cancellationToken)
    {
        var item = await _uploadService.StartItemAsync(
            _currentUser.RequireUserId(), batchId, itemId, cancellationToken);
        await notificationsHub.NotifyUploadsChangedAsync(
            _currentUser.RequireUserId(), logger, cancellationToken);
        return Ok(item);
    }

    [HttpPost("batches/{batchId:guid}/items/{itemId:guid}/progress")]
    public async Task<ActionResult<UploadItemDto>> ReportProgressAsync(
        Guid batchId,
        Guid itemId,
        UploadProgressRequest request,
        CancellationToken cancellationToken)
    {
        var item = await _uploadService.ReportProgressAsync(
            _currentUser.RequireUserId(),
            batchId,
            itemId,
            request.ProgressPercent,
            cancellationToken);
        await notificationsHub.NotifyUploadsChangedAsync(
            _currentUser.RequireUserId(), logger, cancellationToken);
        return Ok(item);
    }

    [HttpPost("batches/{batchId:guid}/items/{itemId:guid}/file")]
    public async Task<ActionResult<UploadItemDto>> UploadFileAsync(
        Guid batchId,
        Guid itemId,
        [FromForm] IFormFile file,
        CancellationToken cancellationToken)
    {
        var ownerId = _currentUser.RequireUserId();
        UploadFileResult result;
        try
        {
            result = await _uploadService.UploadFileAsync(
                ownerId, batchId, itemId, file, cancellationToken);
        }
        finally
        {
            // Storage failures can persist a failed item even when the request is aborted.
            await notificationsHub.NotifyUploadsChangedAsync(ownerId, logger, CancellationToken.None);
        }
        return Ok(result.Item);
    }

    [HttpPost("batches/{batchId:guid}/items/{itemId:guid}/cancel")]
    public async Task<ActionResult<UploadItemDto>> CancelItemAsync(
        Guid batchId,
        Guid itemId,
        CancellationToken cancellationToken)
    {
        var item = await _uploadService.CancelItemAsync(
            _currentUser.RequireUserId(), batchId, itemId, cancellationToken);
        await notificationsHub.NotifyUploadsChangedAsync(
            _currentUser.RequireUserId(), logger, cancellationToken);
        return Ok(item);
    }

    [HttpPost("batches/{batchId:guid}/items/{itemId:guid}/fail")]
    public async Task<ActionResult<UploadItemDto>> FailItemAsync(
        Guid batchId,
        Guid itemId,
        FailUploadItemRequest request,
        CancellationToken cancellationToken)
    {
        var item = await _uploadService.FailItemAsync(
            _currentUser.RequireUserId(),
            batchId,
            itemId,
            request.ErrorDetails,
            cancellationToken);
        await notificationsHub.NotifyUploadsChangedAsync(
            _currentUser.RequireUserId(), logger, cancellationToken);
        return Ok(item);
    }
}
