using Domains.Entities;
using Services.Models.Collections;
using Services.Models.Media;
using Services.Interfaces;
using Services.Mappings;
using Services.Requests.Auth;
using Services.Responses.Auth;

namespace Services.Implementations;

public sealed class Mapper : IMapper
{
    public User Map(RegisterRequest request) => AuthMappings.ToUser(request);

    public UserResponse Map(User user) => AuthMappings.ToResponse(user);

    public MediaFile Map(StoredFile stored, Guid ownerId, string originalFilename)
        => new()
        {
            OwnerId = ownerId,
            OriginalFilename = originalFilename,
            StoredFilename = stored.StoredFilename,
            RelativePath = stored.RelativePath,
            MimeType = stored.MimeType,
            FileExtension = stored.FileExtension,
            FileSizeBytes = stored.SizeBytes,
            MediaKind = stored.MediaKind,
        };

    public MediaFileDto Map(MediaFile mediaFile, bool isFavorited = false)
        => new(
            mediaFile.Id,
            mediaFile.MediaKind,
            mediaFile.MimeType,
            mediaFile.OriginalFilename,
            mediaFile.FileSizeBytes,
            mediaFile.CreatedAt,
            isFavorited);

    public CollectionDto Map(CollectionSource source) => CollectionMappings.ToDto(source);
}
