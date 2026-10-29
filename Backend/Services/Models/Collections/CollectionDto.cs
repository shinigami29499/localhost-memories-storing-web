using Services.Models.Posts;

namespace Services.Models.Collections;

public record CollectionDto(
    Guid Id,
    string Name,
    bool IsPublic,
    UserSummaryDto Owner,
    int PostCount,
    Guid? PreviewMediaId,
    Guid? CustomPreviewMediaId,
    bool ContainsPost,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
