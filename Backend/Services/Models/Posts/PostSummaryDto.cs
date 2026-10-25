namespace Services.Models.Posts;

public record PostSummaryDto(
    Guid Id,
    string Caption,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    UserSummaryDto Author,
    IReadOnlyList<MediaFileDto> Media,
    long CommentCount,
    IReadOnlyList<ReactionCountDto> ReactionCounts,
    IReadOnlyList<string> MyReactionTypes);
