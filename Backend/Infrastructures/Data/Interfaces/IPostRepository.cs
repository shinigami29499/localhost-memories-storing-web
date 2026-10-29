using Domains.Entities;
using Services.Models.Posts;
using Services.Requests.Posts;

namespace Infrastructures.Data.Interfaces;

public interface IPostRepository
{
    Task<IReadOnlyList<Post>> GetFeedPageAsync(
        int offset, int limit, string? mediaKind = null, CancellationToken cancellationToken = default);
    Task<long> CountActivePostsAsync(string? mediaKind = null, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Post>> GetFavoritePageAsync(
        Guid userId, string reactionType, int offset, int limit, string? mediaKind = null,
        CancellationToken cancellationToken = default);
    Task<long> CountFavoritePostsAsync(
        Guid userId, string reactionType, string? mediaKind = null, CancellationToken cancellationToken = default);
    Task<IReadOnlyDictionary<Guid, long>> GetActiveCommentCountsAsync(
        IReadOnlyCollection<Guid> postIds, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PostReactionCount>> GetActiveReactionCountsAsync(
        IReadOnlyCollection<Guid> postIds, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<UserPostReaction>> GetActiveUserReactionsAsync(
        Guid userId, IReadOnlyCollection<Guid> postIds, CancellationToken cancellationToken = default);
    Task<Post?> FindPostWithMediaAsync(Guid postId, CancellationToken cancellationToken = default);
    Task<long> CountActiveCommentsAsync(Guid postId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ReactionCountDto>> GetActiveReactionCountsAsync(
        Guid postId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<string>> GetActiveUserReactionsAsync(
        Guid postId, Guid userId, CancellationToken cancellationToken = default);
    Task<Post?> FindActivePostAsync(Guid postId, CancellationToken cancellationToken = default);
    Task LockPostUploadsAsync(Guid postId, CancellationToken cancellationToken = default);
    Task CancelPostUploadsAsync(
        Guid postId, Guid actorId, DateTime utcNow, CancellationToken cancellationToken = default);
    Task<Post?> FindPostIncludingDeletedAsync(Guid postId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<MediaFile>> GetPostMediaAsync(
        Guid postId, bool includeDeleted, CancellationToken cancellationToken = default);
    void AddPost(Post post);
    void AddMediaFiles(IEnumerable<MediaFile> mediaFiles);
    Task DeletePostInteractionsAsync(
        Guid postId, Guid actorId, DateTime utcNow, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Post>> GetDeletedPostsPageAsync(
        int offset, int limit, CancellationToken cancellationToken = default);
    Task<long> CountDeletedPostsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyDictionary<Guid, int>> GetMediaCountsAsync(
        IReadOnlyCollection<Guid> postIds, bool includeDeleted, CancellationToken cancellationToken = default);
    Task<IReadOnlyDictionary<Guid, long>> GetCommentCountsAsync(
        IReadOnlyCollection<Guid> postIds, bool includeDeleted, CancellationToken cancellationToken = default);
    Task<IReadOnlyDictionary<Guid, User>> GetUsersByIdsAsync(
        IReadOnlyCollection<Guid> userIds, bool includeDeleted, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Post>> GetAllPostsPageAsync(
        int offset, int limit, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Post>> GetAllPostsPageAsync(
        int offset, int limit, AdminPostSearchRequest filters, CancellationToken cancellationToken = default);
    Task<long> CountAllPostsAsync(CancellationToken cancellationToken = default);
    Task<long> CountAllPostsAsync(
        AdminPostSearchRequest filters, CancellationToken cancellationToken = default);
    Task RestorePostInteractionsAsync(
        Guid postId, DateTime deletedAt, Guid? deletedBy, Guid actorId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<string>> GetPostStoragePathsAsync(
        Guid postId, CancellationToken cancellationToken = default);
    Task PurgePostAsync(Guid postId, CancellationToken cancellationToken = default);
}
