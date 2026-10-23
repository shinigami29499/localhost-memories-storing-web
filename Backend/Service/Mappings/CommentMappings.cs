using Domain.Entities;
using Service.Models.Comments;
using Service.Models.Posts;

namespace Service.Mappings;

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
