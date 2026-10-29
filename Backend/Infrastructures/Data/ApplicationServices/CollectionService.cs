using Domains.Entities;
using Infrastructures.Data.Interfaces;
using Services.Exceptions;
using Services.Interfaces;
using Services.Models.Collections;
using Services.Models.Media;
using Services.Requests.Collections;
using Services.Requests.Media;
using Services.Responses.Media;

namespace Infrastructures.Data.ApplicationServices;

public sealed class CollectionService(
    ICollectionRepository repository,
    IMediaRepository mediaRepository,
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
                viewerId, request.MediaId, cancellationToken),
            CollectionListRequest.PublicScope => await repository.GetPublicCollectionsAsync(
                viewerId, request.MediaId, cancellationToken),
            _ => throw new ValidationException(
                "Invalid collection scope.",
                new Dictionary<string, string[]> { ["scope"] = ["Must be 'mine' or 'public'."] }),
        };
        return sources.Select(mapper.Map).ToList();
    }

    public async Task<CollectionDto> GetCollectionAsync(
        Guid collectionId, Guid viewerId, CancellationToken cancellationToken = default)
        => mapper.Map(await GetViewableSourceAsync(collectionId, viewerId, cancellationToken));

    public Task<PagedMediaResponse<MediaFileDto>> GetCollectionMediaAsync(
        Guid collectionId, Guid viewerId, int offset, int limit, CancellationToken cancellationToken = default)
        => GetCollectionMediaAsync(
            collectionId, viewerId, new MediaPageRequest { Offset = offset, Limit = limit }, cancellationToken);

    public async Task<PagedMediaResponse<MediaFileDto>> GetCollectionMediaAsync(
        Guid collectionId, Guid viewerId, MediaPageRequest request, CancellationToken cancellationToken = default)
    {
        var (offset, limit) = (request.Offset, request.Limit);
        ValidatePage(offset, limit);
        if (request.MediaKind is not null && request.MediaKind is not ("image" or "video"))
            throw new ValidationException(
                "Invalid media page.",
                new Dictionary<string, string[]> { ["mediaKind"] = ["Must be 'image' or 'video'."] });
        await GetViewableSourceAsync(collectionId, viewerId, cancellationToken);

        var mediaIds = await repository.GetCollectionMediaIdsPageAsync(
            collectionId, offset, limit, request.MediaKind, cancellationToken);
        var total = await repository.CountCollectionMediaAsync(collectionId, request.MediaKind, cancellationToken);
        if (mediaIds.Count == 0)
            return new PagedMediaResponse<MediaFileDto>(offset, limit, total, []);

        var mediaById = (await repository.GetMediaFilesAsync(mediaIds, cancellationToken))
            .ToDictionary(media => media.Id);
        var favoritedIds = (await mediaRepository.GetFavoritedMediaIdsAsync(
            viewerId, mediaIds, cancellationToken)).ToHashSet();
        var items = mediaIds
            .Where(mediaById.ContainsKey)
            .Select(mediaId => mapper.Map(mediaById[mediaId], favoritedIds.Contains(mediaId)))
            .ToList();

        return new PagedMediaResponse<MediaFileDto>(offset, limit, total, items);
    }

    public async Task<CollectionDto> CreateCollectionAsync(
        Guid ownerId, CreateCollectionRequest request, CancellationToken cancellationToken = default)
    {
        var collection = new Collection
        {
            Name = NormalizeName(request.Name),
            Caption = NormalizeCaption(request.Caption),
            OwnerId = ownerId,
            IsPublic = request.IsPublic,
        };
        repository.AddCollection(collection);
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
                    ["previewMediaId"] = ["Choose an image saved in this collection."]
                });

        collection.Name = name;
        collection.IsPublic = request.IsPublic;
        collection.PreviewMediaFileId = request.PreviewMediaId;
        if (request.Caption is not null)
            collection.Caption = NormalizeCaption(request.Caption);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetOwnedDtoAsync(collectionId, cancellationToken);
    }

    public async Task<CollectionDto> UpdateCollectionCaptionAsync(
        Guid collectionId, Guid editorId, UpdateCollectionCaptionRequest request,
        CancellationToken cancellationToken = default)
    {
        var collection = await repository.FindCollectionAsync(collectionId, cancellationToken)
            ?? throw new NotFoundException($"Collection '{collectionId}' was not found.");
        if (collection.OwnerId != editorId && !collection.IsPublic)
            throw new NotFoundException($"Collection '{collectionId}' was not found.");

        collection.Caption = NormalizeCaption(request.Caption);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetOwnedDtoAsync(collectionId, cancellationToken);
    }

    public async Task DeleteCollectionAsync(
        Guid collectionId, Guid ownerId, CancellationToken cancellationToken = default)
    {
        var collection = await FindOwnedCollectionAsync(collectionId, ownerId, cancellationToken);
        var utcNow = DateTime.UtcNow;

        await using var transaction = await unitOfWork.BeginTransactionAsync(cancellationToken);
        await repository.DeleteCollectionMediaAsync(collectionId, ownerId, utcNow, cancellationToken);
        collection.DeletedAt = utcNow;
        collection.DeletedBy = ownerId;
        await unitOfWork.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    public async Task<CollectionDto> AddMediaAsync(
        Guid collectionId, Guid ownerId, Guid mediaId, CancellationToken cancellationToken = default)
    {
        await FindOwnedCollectionAsync(collectionId, ownerId, cancellationToken);
        if (!await repository.MediaExistsAsync(mediaId, cancellationToken))
            throw new NotFoundException($"Media '{mediaId}' was not found.");

        if (await repository.FindCollectionMediaAsync(collectionId, mediaId, cancellationToken) is null)
        {
            repository.AddCollectionMedia(new CollectionMedia
            {
                CollectionId = collectionId,
                MediaFileId = mediaId,
            });
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return await GetOwnedDtoAsync(collectionId, cancellationToken);
    }

    public async Task<CollectionDto> RemoveMediaAsync(
        Guid collectionId, Guid ownerId, Guid mediaId, CancellationToken cancellationToken = default)
    {
        var collection = await FindOwnedCollectionAsync(collectionId, ownerId, cancellationToken);
        var saved = await repository.FindCollectionMediaAsync(collectionId, mediaId, cancellationToken);
        if (saved is not null)
        {
            saved.DeletedAt = DateTime.UtcNow;
            saved.DeletedBy = ownerId;
            if (collection.PreviewMediaFileId == mediaId)
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

    private async Task<CollectionDto> GetOwnedDtoAsync(
        Guid collectionId, CancellationToken cancellationToken)
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

    private static string NormalizeCaption(string? caption)
    {
        var trimmed = caption?.Trim() ?? "";
        if (trimmed.Length > CreateCollectionRequest.MaxCaptionLength)
            throw new ValidationException(
                "Invalid collection caption.",
                new Dictionary<string, string[]>
                {
                    ["caption"] = [$"Must be at most {CreateCollectionRequest.MaxCaptionLength} characters."]
                });
        return trimmed;
    }

    private static void ValidatePage(int offset, int limit)
    {
        if (limit < 1 || limit > MediaPageRequest.MaxLimit)
            throw new ValidationException(
                "Invalid media page.",
                new Dictionary<string, string[]> { ["limit"] = [$"Must be between 1 and {MediaPageRequest.MaxLimit}."] });
        if (offset < 0)
            throw new ValidationException(
                "Invalid media page.",
                new Dictionary<string, string[]> { ["offset"] = ["Must be zero or greater."] });
    }
}
