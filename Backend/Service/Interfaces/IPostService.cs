using Microsoft.AspNetCore.Http;
using Service.Models.Posts;
using Service.Responses.Posts;

namespace Service.Interfaces;

public interface IPostService
{
    Task<PagedFeedResponse<PostSummaryDto>> GetFeedAsync(
        Guid viewerId, int offset, int limit, CancellationToken cancellationToken = default);
    Task<PostSummaryDto> GetPostAsync(Guid postId, Guid viewerId, CancellationToken cancellationToken = default);
    Task<PostSummaryDto> CreatePostAsync(
        Guid authorId, string caption, IReadOnlyList<IFormFile> mediaFiles, CancellationToken cancellationToken = default);
    Task<PostSummaryDto> UpdateCaptionAsync(
        Guid postId, Guid actorId, bool isAdmin, string caption, CancellationToken cancellationToken = default);
    Task DeletePostAsync(Guid postId, Guid actorId, bool isAdmin, CancellationToken cancellationToken = default);
    Task<PagedFeedResponse<DeletedPostDto>> GetDeletedPostsAsync(int offset, int limit, CancellationToken cancellationToken = default);
    Task<PagedFeedResponse<AdminPostDto>> GetAllPostsAsync(int offset, int limit, CancellationToken cancellationToken = default);
    Task RestorePostAsync(Guid postId, Guid actorId, CancellationToken cancellationToken = default);
    Task PurgePostAsync(Guid postId, Guid actorId, CancellationToken cancellationToken = default);
}
