namespace Service.Models.Posts;

public record DeletedPostDto(
    Guid Id,
    string Caption,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    DateTime DeletedAt,
    UserSummaryDto Author,
    UserSummaryDto? DeletedBy,
    int MediaCount,
    long CommentCount);
