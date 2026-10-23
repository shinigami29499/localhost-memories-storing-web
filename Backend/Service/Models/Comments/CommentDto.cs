using Service.Models.Posts;

namespace Service.Models.Comments;

public record CommentDto(
    Guid Id,
    Guid PostId,
    UserSummaryDto Author,
    string Content,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
