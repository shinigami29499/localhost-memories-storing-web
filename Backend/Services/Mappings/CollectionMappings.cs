using Services.Models.Collections;
using Services.Models.Posts;

namespace Services.Mappings;

internal static class CollectionMappings
{
    internal static CollectionDto ToDto(CollectionSource source) => new(
        source.Collection.Id,
        source.Collection.Name,
        source.Collection.IsPublic,
        new UserSummaryDto(source.Owner.Id, source.Owner.Username),
        source.PostCount,
        source.CustomPreviewMediaId ?? source.DefaultPreviewMediaId,
        source.CustomPreviewMediaId,
        source.ContainsPost,
        source.Collection.CreatedAt,
        source.Collection.UpdatedAt);
}
