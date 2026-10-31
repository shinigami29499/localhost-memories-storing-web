using Domains.Entities;
using Infrastructures.Data.Interfaces;
using Services.Exceptions;
using Services.Models.Media;

namespace Infrastructures.Data.ApplicationServices;

internal static class MediaHomeLocation
{
    public static async Task ApplyAsync(
        MediaFile media, IUserRepository users, CancellationToken cancellationToken)
    {
        if (media.MediaKind != "image" || MediaLocationMetadata.Read(media.Metadata) is not null)
            return;

        var owner = await users.FindUserAsync(media.OwnerId, cancellationToken)
            ?? throw new NotFoundException("User not found.");
        if (owner.HomeLatitude is { } latitude && owner.HomeLongitude is { } longitude)
            media.Metadata = MediaLocationMetadata.Write(
                media.Metadata, new MediaLocationDto(latitude, longitude));
    }
}
