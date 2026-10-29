using Domains.Entities;
using Infrastructures.Data.Interfaces;
using Services.Exceptions;
using Services.Interfaces;
using Services.Models.Collections;
using Services.Models.Posts;
using Services.Requests.Collections;
using Services.Requests.Posts;
using Services.Responses.Posts;

namespace Infrastructures.Data.ApplicationServices;

public class CollectionService(
    ICollectionRepository repository,
    IPostRepository postRepository,
    IUnitOfWork unitOfWork,
    IMapper mapper) : ICollectionService
{
    public async Task<IReadOnlyList<CollectionDto>> GetCollectionsAsync(
        Guid viewerId, CollectionListRequest request, CancellationToken cancellationToken = default)
    {
        var scope = request.Scope.Trim().ToLowerInvariant();
        var sources = scope switch
        {
            CollectionListRequest.MineScope => await repository.GetOwnedCollectionsAsync(
                viewerId, request.PostId, cancellationToken),
            CollectionListRequest.PublicScope => await repository.GetPublicCollectionsAsync(
                viewerId, request.PostId, cancellationToken),
            _ => throw new ValidationException(
                "Invalid collection scope.",
                new Dictionary<string, string[]> { ["scope"] = ["Must be 'mine' or 'public'."] }),
        };
        return sources.Select(mapper.Map).ToList();
    }

    public async Task<CollectionDto> GetCollectionAsync(
        Guid collectionId, Guid viewerId, CancellationToken cancellationToken = default)
        => mapper.Map(await GetViewableSourceAsync(collectionId, viewerId, cancellationToken));

    public async Task<PagedFeedResponse<PostSummaryDto>> GetCollectionPostsAsync(
        Guid collectionId, Guid viewerId, int offset, int limit, CancellationToken cancellationToken = default)
    {
        if (limit < 1 || limit > FeedRequest.MaxLimit)
            throw new ValidationException(
                "Invalid collection page.",
                new Dictionary<string, string[]> { ["limit"] = [$"Must be between 1 and {FeedRequest.MaxLimit}."] });
        if (offset < 0)
            throw new ValidationException(
                "Invalid collection page.",
                new Dictionary<string, string[]> { ["offset"] = ["Must be zero or greater."] });

        await GetViewableSourceAsync(collectionId, viewerId, cancellationToken);

        var postIds = await repository.GetCollectionPostIdsPageAsync(collectionId, offset, limit, cancellationToken);
        var total = await repository.CountCollectionPostsAsync(collectionId, cancellationToken);
        if (postIds.Count == 0)
            return new PagedFeedResponse<PostSummaryDto>(offset, limit, total, []);

        var posts = (await repository.GetPostsWithMediaAsync(postIds, cancellationToken))
            .ToDictionary(p => p.Id);
        var commentCounts = await postRepository.GetActiveCommentCountsAsync(postIds, cancellationToken);
        var reactionCounts = await postRepository.GetActiveReactionCountsAsync(postIds, cancellationToken);
        IReadOnlyList<UserPostReaction> myReactions = reactionCounts.Count == 0
            ? []
            : await postRepository.GetActiveUserReactionsAsync(viewerId, postIds, cancellationToken);

        var items = postIds
            .Where(posts.ContainsKey)
            .Select(id => posts[id])
            .Select(p => mapper.Map(
                p,
                commentCounts.GetValueOrDefault(p.Id),
                reactionCounts
                    .Where(rc => rc.PostId == p.Id)
                    .Select(rc => new ReactionCountDto(rc.ReactionType, rc.Count))
                    .ToList(),
                myReactions
                    .Where(mr => mr.PostId == p.Id)
                    .Select(mr => mr.ReactionType)
                    .Distinct()
                    .ToList()))
            .ToList();

        return new PagedFeedResponse<PostSummaryDto>(offset, limit, total, items);
    }

    public async Task<CollectionDto> CreateCollectionAsync(
        Guid ownerId, CreateCollectionRequest request, CancellationToken cancellationToken = default)
    {
        var name = NormalizeName(request.Name);
        if (request.PostId is { } postId && !await repository.PostExistsAsync(postId, cancellationToken))
            throw new NotFoundException($"Post '{postId}' was not found.");

        var collection = new Collection { Name = name, OwnerId = ownerId, IsPublic = request.IsPublic };
        repository.AddCollection(collection);
        if (request.PostId is { } savedPostId)
            repository.AddCollectionPost(new CollectionPost { CollectionId = collection.Id, PostId = savedPostId });

        await unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetOwnedDtoAsync(collection.Id, cancellationToken);
    }

    public async Task<CollectionDto> UpdateCollectionAsync(
        Guid collectionId, Guid ownerId, UpdateCollectionRequest request, CancellationToken cancellationToken = default)
    {
        var collection = await FindOwnedCollectionAsync(collectionId, ownerId, cancellationToken);
        var name = NormalizeName(request.Name);

        if (request.PreviewMediaId is { } previewId
            && !await repository.IsCollectionImageAsync(collectionId, previewId, cancellationToken))
            throw new ValidationException(
                "Invalid preview image.",
                new Dictionary<string, string[]>
                {
                    ["previewMediaId"] = ["Choose an image from a post saved in this collection."]
                });

        collection.Name = name;
        collection.IsPublic = request.IsPublic;
        collection.PreviewMediaFileId = request.PreviewMediaId;
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetOwnedDtoAsync(collectionId, cancellationToken);
    }

    public async Task DeleteCollectionAsync(Guid collectionId, Guid ownerId, CancellationToken cancellationToken = default)
    {
        var collection = await FindOwnedCollectionAsync(collectionId, ownerId, cancellationToken);
        var utcNow = DateTime.UtcNow;

        await using var transaction = await unitOfWork.BeginTransactionAsync(cancellationToken);
        await repository.DeleteCollectionPostsAsync(collectionId, ownerId, utcNow, cancellationToken);
        collection.DeletedAt = utcNow;
        collection.DeletedBy = ownerId;
        await unitOfWork.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    public async Task<CollectionDto> AddPostAsync(
        Guid collectionId, Guid ownerId, Guid postId, CancellationToken cancellationToken = default)
    {
        await FindOwnedCollectionAsync(collectionId, ownerId, cancellationToken);
        if (!await repository.PostExistsAsync(postId, cancellationToken))
            throw new NotFoundException($"Post '{postId}' was not found.");

        if (await repository.FindCollectionPostAsync(collectionId, postId, cancellationToken) is null)
        {
            repository.AddCollectionPost(new CollectionPost { CollectionId = collectionId, PostId = postId });
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return await GetOwnedDtoAsync(collectionId, cancellationToken);
    }

    public async Task<CollectionDto> RemovePostAsync(
        Guid collectionId, Guid ownerId, Guid postId, CancellationToken cancellationToken = default)
    {
        var collection = await FindOwnedCollectionAsync(collectionId, ownerId, cancellationToken);
        var saved = await repository.FindCollectionPostAsync(collectionId, postId, cancellationToken);
        if (saved is not null)
        {
            var utcNow = DateTime.UtcNow;
            saved.DeletedAt = utcNow;
            saved.DeletedBy = ownerId;
            if (collection.PreviewMediaFileId is { } previewId
                && await repository.IsPostMediaAsync(postId, previewId, cancellationToken))
                collection.PreviewMediaFileId = null;
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return await GetOwnedDtoAsync(collectionId, cancellationToken);
    }

    private async Task<CollectionSource> GetViewableSourceAsync(
        Guid collectionId, Guid viewerId, CancellationToken cancellationToken)
    {
        var source = await repository.GetCollectionSourceAsync(collectionId, cancellationToken);
        // Private collections are reported as missing so their existence is not disclosed.
        if (source is null || (source.Collection.OwnerId != viewerId && !source.Collection.IsPublic))
            throw new NotFoundException($"Collection '{collectionId}' was not found.");
        return source;
    }

    private async Task<Collection> FindOwnedCollectionAsync(
        Guid collectionId, Guid ownerId, CancellationToken cancellationToken)
    {
        var collection = await repository.FindCollectionAsync(collectionId, cancellationToken)
            ?? throw new NotFoundException($"Collection '{collectionId}' was not found.");
        if (collection.OwnerId == ownerId)
            return collection;
        if (collection.IsPublic)
            throw new ForbiddenException("Only the owner can change this collection.");
        throw new NotFoundException($"Collection '{collectionId}' was not found.");
    }

    private async Task<CollectionDto> GetOwnedDtoAsync(Guid collectionId, CancellationToken cancellationToken)
        => mapper.Map(await repository.GetCollectionSourceAsync(collectionId, cancellationToken)
            ?? throw new NotFoundException($"Collection '{collectionId}' was not found."));

    private static string NormalizeName(string name)
    {
        var trimmed = name?.Trim() ?? "";
        if (trimmed.Length is 0 or > CreateCollectionRequest.MaxNameLength)
            throw new ValidationException(
                "Invalid collection name.",
                new Dictionary<string, string[]>
                {
                    ["name"] = [$"Must be 1 to {CreateCollectionRequest.MaxNameLength} characters."]
                });
        return trimmed;
    }
}
