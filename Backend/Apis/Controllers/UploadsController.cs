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
[Route("api/upload")]
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

    [HttpGet("batch")]
    [HttpGet("batches")]
    public async Task<ActionResult<PagedUploadBatchesResponse>> GetOwnBatchesAsync(
        [FromQuery] UploadListRequest request,
        CancellationToken cancellationToken)
        => Ok(await _uploadService.GetBatchesAsync(
            _currentUser.RequireUserId(), false, request.Offset, request.Limit,
            request.CreatedFrom, request.CreatedBefore, cancellationToken));

    [HttpPost("batch")]
    [HttpPost("batches")]
    public async Task<ActionResult<UploadBatchDto>> CreateBatchAsync(
        CreateUploadBatchRequest request,
        CancellationToken cancellationToken)
    {
        var batch = await _uploadService.CreateBatchAsync(
            _currentUser.RequireUserId(), request, cancellationToken);
        await notificationsHub.NotifyUploadsChangedAsync(
            _currentUser.RequireUserId(), logger, cancellationToken);
        var path = Request.Path.Value?.EndsWith("/batch", StringComparison.OrdinalIgnoreCase) == true
            ? "/api/sync/upload/batch"
            : "/api/sync/upload/batches";
        return Created($"{path}/{batch.Id}", batch);
    }

    [RequireAdmin]
    [HttpGet("admin/batch")]
    [HttpGet("admin/batches")]
    public async Task<ActionResult<PagedUploadBatchesResponse>> GetAllBatchesAsync(
        [FromQuery] UploadListRequest request,
        CancellationToken cancellationToken)
        => Ok(await _uploadService.GetBatchesAsync(
            _currentUser.RequireUserId(), true, request.Offset, request.Limit,
            request.CreatedFrom, request.CreatedBefore, cancellationToken));

    [HttpGet("batch/{batchId:guid}")]
    [HttpGet("batches/{batchId:guid}")]
    public async Task<ActionResult<UploadBatchDto>> GetBatchAsync(
        Guid batchId,
        CancellationToken cancellationToken)
        => Ok(await _uploadService.GetBatchAsync(
            _currentUser.RequireUserId(), _currentUser.IsAdmin, batchId, cancellationToken));

    [HttpGet("batch/{batchId:guid}/image")]
    [HttpGet("batches/{batchId:guid}/images")]
    public async Task<ActionResult<IReadOnlyList<Guid>>> GetBatchImageIdsAsync(
        Guid batchId, CancellationToken cancellationToken)
        => Ok(await _uploadService.GetBatchImageIdsAsync(_currentUser.RequireUserId(), batchId, cancellationToken));

    [HttpPut("batch/{batchId:guid}/viewed")]
    [HttpPut("batches/{batchId:guid}/viewed")]
    public async Task<IActionResult> MarkBatchViewedAsync(Guid batchId, CancellationToken cancellationToken)
        => await _uploadService.MarkBatchViewedAsync(_currentUser.RequireUserId(), batchId, cancellationToken)
            ? NoContent()
            : NotFound();

    [HttpPut("batch/viewed/selected")]
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

    [HttpPut("batch/viewed")]
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

    [HttpPost("batch/{batchId:guid}/item/{itemId:guid}/start")]
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

    [HttpPost("batch/{batchId:guid}/item/{itemId:guid}/progress")]
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

    [HttpPost("batch/{batchId:guid}/item/{itemId:guid}/file")]
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
            var username = User.FindFirstValue(Constants.Auth.UsernameClaim) ?? "User";
            var albumClients = result.IsPublic
                ? notificationsHub.Clients.All
                : notificationsHub.Clients.User(result.AlbumOwnerId.ToString());
            await albumClients.SendAsync("AlbumChanged", new
            {
                albumId = result.AlbumId, albumName = result.AlbumName, ownerId = result.AlbumOwnerId,
                actorId = ownerId, username, action = "media",
            }, CancellationToken.None);
            var batch = await _uploadService.GetBatchAsync(ownerId, false, batchId, CancellationToken.None);
            if (batch.Status == "Completed")
            {
                var images = batch.Items.Count(item => item.Status == "Success" && item.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase));
                var videos = batch.Items.Count(item => item.Status == "Success" && item.ContentType.StartsWith("video/", StringComparison.OrdinalIgnoreCase));
                await notificationsHub.Clients.All.SendAsync("UploadCompleted", new
                {
                    batchId, ownerId, username, images, videos, createdAt = batch.CompletedAt,
                }, cancellationToken);
            }
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Could not notify users about completed upload batch {BatchId}", batchId);
        }
        return Ok(result.Item);
    }

    [HttpPut("/api/library/album/{albumId:guid}/media/file/{mediaId:guid}")]
    public async Task<IActionResult> StoreAlbumFileAsync(
        Guid albumId, Guid mediaId, IFormFile file, CancellationToken cancellationToken)
    {
        var ownerId = _currentUser.RequireUserId();
        var result = await _uploadService.StoreAlbumFileAsync(ownerId, albumId, mediaId, file, cancellationToken);
        if (result.Created)
        {
            try
            {
                var clients = result.IsPublic
                    ? notificationsHub.Clients.All
                    : notificationsHub.Clients.User(result.AlbumOwnerId.ToString());
                await clients.SendAsync("AlbumChanged", new
                {
                    albumId = result.AlbumId, albumName = result.AlbumName, ownerId = result.AlbumOwnerId,
                    actorId = ownerId, username = User.FindFirstValue(Constants.Auth.UsernameClaim) ?? "User",
                    action = "media",
                }, CancellationToken.None);
            }
            catch (Exception exception)
            {
                logger.LogWarning(exception, "Could not notify users about stored album media {MediaId}", mediaId);
            }
        }
        return Ok(new { mediaId = result.MediaId });
    }

    [HttpPost("batch/{batchId:guid}/item/delete")]
    [HttpPost("batches/{batchId:guid}/items/delete")]
    public async Task<IActionResult> DeleteRecordsAsync(Guid batchId, [FromBody] Guid[] itemIds, CancellationToken cancellationToken)
    {
        if (itemIds is null || itemIds.Length is < 1 or > 1000 || itemIds.Any(id => id == Guid.Empty) || itemIds.Distinct().Count() != itemIds.Length) return BadRequest();
        await _uploadService.DeleteRecordsAsync(_currentUser.RequireUserId(), batchId, itemIds, cancellationToken);
        await notificationsHub.NotifyUploadsChangedAsync(_currentUser.RequireUserId(), logger, cancellationToken);
        return NoContent();
    }

    [HttpDelete("batch/{batchId:guid}")]
    [HttpDelete("batches/{batchId:guid}")]
    [HttpDelete("batch/{batchId:guid}/item/{itemId:guid}")]
    [HttpDelete("batches/{batchId:guid}/items/{itemId:guid}")]
    public async Task<IActionResult> DeleteRecordAsync(Guid batchId, Guid? itemId, CancellationToken cancellationToken)
    {
        await _uploadService.DeleteRecordAsync(_currentUser.RequireUserId(), batchId, itemId, cancellationToken);
        await notificationsHub.NotifyUploadsChangedAsync(_currentUser.RequireUserId(), logger, cancellationToken);
        return NoContent();
    }

    [HttpPost("batch/{batchId:guid}/pause")]
    [HttpPost("batches/{batchId:guid}/pause")]
    [HttpPost("batch/{batchId:guid}/item/{itemId:guid}/pause")]
    [HttpPost("batches/{batchId:guid}/items/{itemId:guid}/pause")]
    public async Task<ActionResult<UploadBatchDto>> PauseAsync(Guid batchId, Guid? itemId, CancellationToken cancellationToken)
    {
        var batch = await _uploadService.SetPausedAsync(_currentUser.RequireUserId(), batchId, itemId, true, cancellationToken);
        await notificationsHub.NotifyUploadsChangedAsync(_currentUser.RequireUserId(), logger, cancellationToken);
        return Ok(batch);
    }

    [HttpPost("batch/{batchId:guid}/resume")]
    [HttpPost("batches/{batchId:guid}/resume")]
    [HttpPost("batch/{batchId:guid}/item/{itemId:guid}/resume")]
    [HttpPost("batches/{batchId:guid}/items/{itemId:guid}/resume")]
    public async Task<ActionResult<UploadBatchDto>> ResumeAsync(Guid batchId, Guid? itemId, CancellationToken cancellationToken)
    {
        var batch = await _uploadService.SetPausedAsync(_currentUser.RequireUserId(), batchId, itemId, false, cancellationToken);
        await notificationsHub.NotifyUploadsChangedAsync(_currentUser.RequireUserId(), logger, cancellationToken);
        return Ok(batch);
    }

    [HttpPost("batch/{batchId:guid}/item/{itemId:guid}/fail")]
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
