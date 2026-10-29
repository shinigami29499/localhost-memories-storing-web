using Domains.Entities;
using Services.Models.Collections;
using Services.Models.Media;
using Services.Models.Comments;
using Services.Models.Posts;
using Services.Requests.Auth;
using Services.Responses.Auth;

namespace Services.Interfaces;

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
    CollectionDto Map(CollectionSource source);
}
