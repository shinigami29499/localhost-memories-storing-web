using Domains.Entities;
using Services.Models.Comments;
using Services.Models.Posts;

namespace Services.Mappings;

internal static class CommentMappings
{
    internal static CommentDto ToDto(Comment comment, User author) => new(
        comment.Id,
        comment.PostId,
        new UserSummaryDto(author.Id, author.Username),
        comment.Content,
        comment.CreatedAt,
        comment.UpdatedAt);
}
