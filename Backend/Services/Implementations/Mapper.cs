using Domains.Entities;
using Services.Models.Collections;
using Services.Models.Food;
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
            Metadata = stored.MediaKind == "image" ? MediaLocationMetadata.Write(null, stored.Location) : null,
        };

    public MediaFileDto Map(MediaFile mediaFile, bool isFavorited = false)
        => new(
            mediaFile.Id,
            mediaFile.MediaKind,
            mediaFile.MimeType,
            mediaFile.OriginalFilename,
            mediaFile.FileSizeBytes,
            mediaFile.CreatedAt,
            isFavorited,
            mediaFile.OwnerId,
            MediaLocationMetadata.Read(mediaFile.Metadata));

    public CollectionDto Map(CollectionSource source) => CollectionMappings.ToDto(source);

    public FoodPlaceDto Map(FoodPlaceSource source) => FoodPlaceMappings.ToDto(source);

    public FoodPlaceVisitDto Map(FoodPlaceVisitSource source) => FoodPlaceMappings.ToDto(source);
}
