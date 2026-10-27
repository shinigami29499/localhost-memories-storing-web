using Microsoft.AspNetCore.Http;
using Services.Models.Posts;
using Services.Responses.Posts;

namespace Services.Interfaces;

public interface IPostService
{
    Task<PagedFeedResponse<PostSummaryDto>> GetFeedAsync(
        Guid viewerId, int offset, int limit, CancellationToken cancellationToken = default);
    Task<PostSummaryDto> GetPostAsync(Guid postId, Guid viewerId, CancellationToken cancellationToken = default);
    Task<PostCreationResult> CreatePostAsync(
        Guid authorId, string authorUsername, string? caption, IReadOnlyList<IFormFile> mediaFiles,
        CancellationToken cancellationToken = default);
    Task<PostSummaryDto> UpdateCaptionAsync(
        Guid postId, Guid actorId, bool isAdmin, string caption, CancellationToken cancellationToken = default);
    Task DeletePostAsync(Guid postId, Guid actorId, bool isAdmin, CancellationToken cancellationToken = default);
    Task<PagedFeedResponse<DeletedPostDto>> GetDeletedPostsAsync(int offset, int limit, CancellationToken cancellationToken = default);
    Task<PagedFeedResponse<AdminPostDto>> GetAllPostsAsync(int offset, int limit, CancellationToken cancellationToken = default);
    Task RestorePostAsync(Guid postId, Guid actorId, CancellationToken cancellationToken = default);
    Task PurgePostAsync(Guid postId, Guid actorId, CancellationToken cancellationToken = default);
}
