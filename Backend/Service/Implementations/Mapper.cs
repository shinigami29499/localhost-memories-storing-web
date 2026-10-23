using Domain.Entities;
using Infrastructure.Storage;
using Service.Interfaces;
using Service.Mappings;
using Service.Models.Comments;
using Service.Models.Posts;
using Service.Requests.Auth;
using Service.Responses.Auth;

namespace Service.Implementations;

public sealed class Mapper : IMapper
{
    public User Map(RegisterRequest request) => AuthMappings.ToUser(request);

    public UserResponse Map(User user) => AuthMappings.ToResponse(user);

    public CommentDto Map(Comment comment, User author) => CommentMappings.ToDto(comment, author);

    public MediaFile Map(StoredFile stored, Guid postId, string originalFilename)
        => PostMappings.ToMedia(stored, postId, originalFilename);

    public PostSummaryDto Map(
        Post post,
        long commentCount,
        IReadOnlyList<ReactionCountDto> reactionCounts,
        IReadOnlyList<string> myReactions)
        => PostMappings.ToDto(post, commentCount, reactionCounts, myReactions);
}
