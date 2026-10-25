using Domains.Entities;
using Services.Models.Media;
using Services.Interfaces;
using Services.Mappings;
using Services.Models.Comments;
using Services.Models.Posts;
using Services.Requests.Auth;
using Services.Responses.Auth;

namespace Services.Implementations;

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

    public DeletedPostDto Map(Post post, User? deletedBy, int mediaCount, long commentCount)
        => PostMappings.ToDeletedDto(post, deletedBy, mediaCount, commentCount);

    public AdminPostDto Map(AdminPostSource source)
        => PostMappings.ToAdminDto(source);
}
