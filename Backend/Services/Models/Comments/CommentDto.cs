using Services.Models.Posts;

namespace Services.Models.Comments;

public record CommentDto(
    Guid Id,
    Guid PostId,
    UserSummaryDto Author,
    string Content,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
