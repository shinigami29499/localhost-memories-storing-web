using MetadataExtractor;
using MetadataExtractor.Formats.Exif;
using Microsoft.Extensions.Logging;
using Services.Models.Media;

namespace Infrastructures.Adapters.Implementations;

public sealed partial class MediaStorageService
{
    public async Task<MediaLocationDto?> ReadLocationAsync(
        string relativePath, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        await using var stream = await OpenAsync(relativePath);
        try
        {
            var directories = ImageMetadataReader.ReadMetadata(stream);
            cancellationToken.ThrowIfCancellationRequested();
            foreach (var gps in directories.OfType<GpsDirectory>())
            {
                if (!gps.TryGetGeoLocation(out var location))
                    continue;
                if (double.IsFinite(location.Latitude) && double.IsFinite(location.Longitude)
                    && location.Latitude is >= -90 and <= 90 && location.Longitude is >= -180 and <= 180)
                    return new MediaLocationDto(location.Latitude, location.Longitude);

                _logger.LogWarning("Invalid GPS metadata in media {RelativePath}", relativePath);
            }
            return null;
        }
        catch (Exception exception) when (exception is ImageProcessingException or MetadataException or IOException)
        {
            // Metadata is optional; unsupported or malformed metadata must not reject an otherwise valid upload.
            _logger.LogWarning(exception, "Could not read GPS metadata in media {RelativePath}", relativePath);
            return null;
        }
    }
}
