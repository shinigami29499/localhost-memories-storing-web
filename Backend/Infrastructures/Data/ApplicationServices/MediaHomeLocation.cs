using Domains.Entities;
using Infrastructures.Data.Interfaces;
using Services.Models.Media;

namespace Infrastructures.Data.ApplicationServices;

internal static class MediaHomeLocation
{
    public static async Task ApplyAsync(
        MediaFile media, IUserRepository users, CancellationToken cancellationToken)
    {
        if (media.MediaKind != "image" || MediaLocationMetadata.Read(media.Metadata) is not null)
            return;

        var home = await users.GetSharedHomeLocationAsync(cancellationToken);
        if (home.Latitude is { } latitude && home.Longitude is { } longitude)
            media.Metadata = MediaLocationMetadata.Write(
                media.Metadata, new MediaLocationDto(latitude, longitude));
    }
}
