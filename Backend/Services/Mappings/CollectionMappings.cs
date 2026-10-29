using Services.Models.Collections;
using Services.Models.Users;

namespace Services.Mappings;

internal static class CollectionMappings
{
    internal static CollectionDto ToDto(CollectionSource source) => new(
        source.Collection.Id,
        source.Collection.Name,
        source.Collection.Caption,
        source.Collection.IsPublic,
        new UserSummaryDto(source.Owner.Id, source.Owner.Username),
        source.MediaCount,
        source.CustomPreviewMediaId ?? source.DefaultPreviewMediaId,
        source.CustomPreviewMediaId,
        source.ContainsMedia,
        source.Collection.CreatedAt,
        source.Collection.UpdatedAt);
}
