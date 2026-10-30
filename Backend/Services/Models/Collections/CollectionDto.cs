using Services.Models.Users;

namespace Services.Models.Collections;

public record CollectionDto(
    Guid Id,
    string Name,
    string Caption,
    bool IsPublic,
    UserSummaryDto Owner,
    int MediaCount,
    Guid? PreviewMediaId,
    Guid? CustomPreviewMediaId,
    bool ContainsMedia,
    DateTime CreatedAt,
    DateTime? UpdatedAt)
{
    public bool PreviewIsFavorited { get; init; }
}
