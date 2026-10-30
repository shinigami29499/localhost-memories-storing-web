using Microsoft.Extensions.Logging;
using Services.Exceptions;
using Services.Models.Media;
using Services.Requests.Media;
using Services.Responses.Media;

namespace Infrastructures.Data.ApplicationServices;

public partial class MediaService
{
    public async Task SetLocationAsync(
        Guid mediaId, Guid actorId, bool isAdmin, SetMediaLocationRequest request,
        CancellationToken cancellationToken = default)
    {
        if ((request.Latitude is null) != (request.Longitude is null)
            || request.Latitude is { } latitude && (!double.IsFinite(latitude) || latitude is < -90 or > 90)
            || request.Longitude is { } longitude && (!double.IsFinite(longitude) || longitude is < -180 or > 180))
            throw new ValidationException("Invalid photo location.", new Dictionary<string, string[]>
            {
                ["location"] = ["Provide latitude (-90 to 90) and longitude (-180 to 180), or clear both."],
            });

        var media = await LoadOwnedMediaAsync(mediaId, actorId, isAdmin, cancellationToken);
        if (media.MediaKind != "image")
            throw new ConflictException("Only photos support locations.");

        var location = request.Latitude is { } lat && request.Longitude is { } lng
            ? new MediaLocationDto(lat, lng) : null;
        media.Metadata = MediaLocationMetadata.Write(media.Metadata, location);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<ScanMediaLocationsResponse> ScanLocationsAsync(
        Guid actorId, bool isAdmin, int offset, CancellationToken cancellationToken = default)
    {
        if (offset < 0)
            throw new ValidationException("Invalid scan offset.", new Dictionary<string, string[]>
            {
                ["offset"] = ["Offset must be zero or greater."],
            });

        const int batchSize = 25;
        var batch = await _repository.GetLocationScanBatchAsync(
            actorId, isAdmin, offset, batchSize, cancellationToken);
        var scanned = 0;
        var located = 0;
        List<Guid> failed = [];
        foreach (var media in batch)
        {
            try
            {
                var location = await _storage.ReadLocationAsync(media.RelativePath, cancellationToken);
                if (await _repository.TrySetExtractedLocationAsync(
                    media.Id, actorId, MediaLocationMetadata.Write(media.Metadata, location), cancellationToken))
                {
                    scanned++;
                    if (location is not null) located++;
                }
            }
            catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
            {
                _logger.LogWarning(exception, "Could not scan location for media {MediaId}", media.Id);
                failed.Add(media.Id);
            }
        }
        return new ScanMediaLocationsResponse(
            scanned, located, failed, offset + failed.Count, batch.Count == batchSize);
    }
}
