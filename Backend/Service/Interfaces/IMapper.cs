using Domain.Entities;
using Infrastructure.Storage;
using Service.Models.Comments;
using Service.Models.Posts;
using Service.Requests.Auth;
using Service.Responses.Auth;

namespace Service.Interfaces;

public interface IMapper
{
    User Map(RegisterRequest request);
    UserResponse Map(User user);
    CommentDto Map(Comment comment, User author);
    MediaFile Map(StoredFile stored, Guid postId, string originalFilename);
    PostSummaryDto Map(
        Post post,
        long commentCount,
        IReadOnlyList<ReactionCountDto> reactionCounts,
        IReadOnlyList<string> myReactions);
    DeletedPostDto Map(Post post, User? deletedBy, int mediaCount, long commentCount);
    AdminPostDto Map(AdminPostSource source);
}
