using Domains.Entities;
using Services.Models.Collections;
using Services.Models.Media;
using Services.Requests.Auth;
using Services.Responses.Auth;

namespace Services.Interfaces;

public interface IMapper
{
    User Map(RegisterRequest request);
    UserResponse Map(User user);
    MediaFile Map(StoredFile stored, Guid ownerId, string originalFilename);
    MediaFileDto Map(MediaFile mediaFile, bool isFavorited = false);
    CollectionDto Map(CollectionSource source);
}
