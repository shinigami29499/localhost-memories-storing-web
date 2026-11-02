using Apis.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.Interfaces;

namespace Apis.Controllers;

[ApiController]
[Authorize]
[Route("api/downloads")]
public class DownloadsController(IDownloadHistoryService history, ICurrentUserContext currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<DownloadHistoryResponse>> ListAsync([FromQuery] int offset = 0, [FromQuery] int limit = 10, CancellationToken cancellationToken = default)
        => Ok(await history.ListAsync(currentUser.RequireUserId(), currentUser.IsAdmin, offset, limit, cancellationToken));
    [HttpPost("batches/{batchId:guid}/items/delete")]
    public async Task<IActionResult> DeleteRecordsAsync(Guid batchId, [FromBody] Guid[] itemIds, CancellationToken cancellationToken)
    {
        if (itemIds is null || itemIds.Length is < 1 or > 1000 || itemIds.Any(id => id == Guid.Empty) || itemIds.Distinct().Count() != itemIds.Length) return BadRequest();
        return await history.DeleteRecordsAsync(currentUser.RequireUserId(), batchId, itemIds, cancellationToken) ? NoContent() : NotFound();
    }

    [HttpDelete("batches/{batchId:guid}")]
    [HttpDelete("batches/{batchId:guid}/items/{itemId:guid}")]
    public async Task<IActionResult> DeleteRecordAsync(Guid batchId, Guid? itemId, CancellationToken cancellationToken)
        => await history.DeleteRecordAsync(currentUser.RequireUserId(), batchId, itemId, cancellationToken) ? NoContent() : NotFound();

    [HttpGet("batches")]
    public async Task<ActionResult<DownloadBatchStatePage>> ListBatchesAsync([FromQuery] int offset = 0, [FromQuery] int limit = 100, CancellationToken cancellationToken = default)
        => Ok(await history.ListBatchesAsync(currentUser.RequireUserId(), currentUser.IsAdmin, offset, limit, cancellationToken));

    [HttpPut("batches/{batchId:guid}/viewed")]
    public async Task<IActionResult> MarkBatchViewedAsync(Guid batchId, CancellationToken cancellationToken)
        => await history.MarkBatchViewedAsync(currentUser.RequireUserId(), batchId, cancellationToken)
            ? NoContent()
            : NotFound();

    [HttpPut("batches/viewed")]
    public async Task<IActionResult> MarkAllBatchesViewedAsync(CancellationToken cancellationToken)
    {
        await history.MarkAllBatchesViewedAsync(currentUser.RequireUserId(), cancellationToken);
        return NoContent();
    }

    [HttpPut("batches/{batchId:guid}")]
    public async Task<IActionResult> SaveBatchAsync(Guid batchId, [FromBody] SaveDownloadBatchRequest request, CancellationToken cancellationToken)
    {
        var items = request.Items;
        if (items is null) return BadRequest();
        string[] statuses = ["Pending", "Downloading", "Sent to browser", "Failed", "Cancelled", "Paused", "Recorded"];
        if (batchId == Guid.Empty || items.Count is < 1 or > 1000 || items.Any(item => item.Id == Guid.Empty || item.MediaId == Guid.Empty
            || string.IsNullOrWhiteSpace(item.OriginalFilename) || item.OriginalFilename.Length > 260 || item.FileSizeBytes < 0 || item.Loaded < 0
            || item.Status is null || !statuses.Contains(item.Status) || item.Error?.Length > 2000)) return BadRequest();
        return await history.SaveBatchAsync(currentUser.RequireUserId(), batchId, items, cancellationToken) ? NoContent() : Forbid();
    }
}
