using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using Services.Core;
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

    [HttpGet("batches/{batchId:guid}/images")]
    public async Task<ActionResult<IReadOnlyList<Guid>>> GetBatchImageIdsAsync(
        Guid batchId, CancellationToken cancellationToken)
        => Ok(await _uploadService.GetBatchImageIdsAsync(_currentUser.RequireUserId(), batchId, cancellationToken));

    [HttpPut("batches/{batchId:guid}/viewed")]
    public async Task<IActionResult> MarkBatchViewedAsync(Guid batchId, CancellationToken cancellationToken)
        => await _uploadService.MarkBatchViewedAsync(_currentUser.RequireUserId(), batchId, cancellationToken)
            ? NoContent()
            : NotFound();

    [HttpPut("batches/viewed/selected")]
    public async Task<IActionResult> MarkBatchesViewedAsync(
        MarkUploadBatchesViewedRequest request,
        CancellationToken cancellationToken)
    {
        if (request.BatchIds is null)
            return BadRequest();

        await _uploadService.MarkBatchesViewedAsync(
            _currentUser.RequireUserId(), request.BatchIds, cancellationToken);
        return NoContent();
    }

    [HttpPut("batches/viewed")]
    public async Task<IActionResult> MarkAllBatchesViewedAsync(CancellationToken cancellationToken)
    {
        await _uploadService.MarkAllBatchesViewedAsync(_currentUser.RequireUserId(), cancellationToken);
        return NoContent();
    }

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
        IFormFile file,
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
        try
        {
            var batch = await _uploadService.GetBatchAsync(ownerId, false, batchId, CancellationToken.None);
            if (batch.Status == "Completed")
            {
                var images = batch.Items.Count(item => item.Status == "Success" && item.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase));
                var videos = batch.Items.Count(item => item.Status == "Success" && item.ContentType.StartsWith("video/", StringComparison.OrdinalIgnoreCase));
                await notificationsHub.Clients.All.SendAsync("UploadCompleted", new
                {
                    batchId, ownerId, username = User.FindFirstValue(Constants.Auth.UsernameClaim) ?? "User", images, videos, createdAt = batch.CompletedAt,
                }, cancellationToken);
            }
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Could not notify users about completed upload batch {BatchId}", batchId);
        }
        return Ok(result.Item);
    }

    [HttpPost("batches/{batchId:guid}/items/delete")]
    public async Task<IActionResult> DeleteRecordsAsync(Guid batchId, [FromBody] Guid[] itemIds, CancellationToken cancellationToken)
    {
        if (itemIds is null || itemIds.Length is < 1 or > 1000 || itemIds.Any(id => id == Guid.Empty) || itemIds.Distinct().Count() != itemIds.Length) return BadRequest();
        await _uploadService.DeleteRecordsAsync(_currentUser.RequireUserId(), batchId, itemIds, cancellationToken);
        await notificationsHub.NotifyUploadsChangedAsync(_currentUser.RequireUserId(), logger, cancellationToken);
        return NoContent();
    }

    [HttpDelete("batches/{batchId:guid}")]
    [HttpDelete("batches/{batchId:guid}/items/{itemId:guid}")]
    public async Task<IActionResult> DeleteRecordAsync(Guid batchId, Guid? itemId, CancellationToken cancellationToken)
    {
        await _uploadService.DeleteRecordAsync(_currentUser.RequireUserId(), batchId, itemId, cancellationToken);
        await notificationsHub.NotifyUploadsChangedAsync(_currentUser.RequireUserId(), logger, cancellationToken);
        return NoContent();
    }

    [HttpPost("batches/{batchId:guid}/pause")]
    [HttpPost("batches/{batchId:guid}/items/{itemId:guid}/pause")]
    public async Task<ActionResult<UploadBatchDto>> PauseAsync(Guid batchId, Guid? itemId, CancellationToken cancellationToken)
    {
        var batch = await _uploadService.SetPausedAsync(_currentUser.RequireUserId(), batchId, itemId, true, cancellationToken);
        await notificationsHub.NotifyUploadsChangedAsync(_currentUser.RequireUserId(), logger, cancellationToken);
        return Ok(batch);
    }

    [HttpPost("batches/{batchId:guid}/resume")]
    [HttpPost("batches/{batchId:guid}/items/{itemId:guid}/resume")]
    public async Task<ActionResult<UploadBatchDto>> ResumeAsync(Guid batchId, Guid? itemId, CancellationToken cancellationToken)
    {
        var batch = await _uploadService.SetPausedAsync(_currentUser.RequireUserId(), batchId, itemId, false, cancellationToken);
        await notificationsHub.NotifyUploadsChangedAsync(_currentUser.RequireUserId(), logger, cancellationToken);
        return Ok(batch);
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
