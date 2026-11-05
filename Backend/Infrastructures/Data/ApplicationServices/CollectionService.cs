using Domains.Entities;
using Infrastructures.Data.Interfaces;
using Services.Exceptions;
using Services.Interfaces;
using Services.Models.Collections;
using Services.Models.Media;
using Services.Requests.Collections;
using Services.Requests.Media;
using Services.Responses.Media;
using Services.Responses.Collections;
using System.Globalization;
using System.Text;

namespace Infrastructures.Data.ApplicationServices;

public sealed class CollectionService(
    ICollectionRepository repository,
    IMediaRepository mediaRepository,
    IUnitOfWork unitOfWork,
    IMapper mapper,
    IPreviewService previews,
    IPreviewLifecycle previewLifecycle) : ICollectionService
{
    public async Task<CollectionPageResponse> GetCollectionsPageAsync(
        Guid viewerId, CollectionPageRequest request, bool isAdmin, CancellationToken cancellationToken = default)
    {
        var scope = request.Scope?.Trim().ToLowerInvariant();
        if (scope is not (CollectionListRequest.MineScope or CollectionListRequest.PublicScope or CollectionListRequest.FeedScope)
            && !(isAdmin && scope == CollectionListRequest.AdminScope))
            throw new ValidationException("Invalid collection scope.",
                new Dictionary<string, string[]> { ["scope"] = ["Must be 'mine', 'public', 'feed', or admin-only 'all'."] });
        if (request.Limit is < 1 or > 100)
            throw new ValidationException("Invalid collection page.",
                new Dictionary<string, string[]> { ["limit"] = ["Must be between 1 and 100."] });
        if (request.Search?.Length > 120)
            throw new ValidationException("Invalid collection search.",
                new Dictionary<string, string[]> { ["search"] = ["Use at most 120 characters."] });

        var (cursorDate, cursorId) = DecodeCollectionCursor(request.Cursor);
        var sources = await repository.GetCollectionsPageAsync(viewerId, scope, request.MediaId,
            request.Limit, cursorDate, cursorId, request.Search, cancellationToken);
        var hasMore = sources.Count > request.Limit;
        var page = sources.Take(request.Limit).ToList();
        var collections = page.Select(mapper.Map).ToList();
        var previewIds = collections.Select(collection => collection.PreviewMediaId).OfType<Guid>().Distinct().ToList();
        var favoritedIds = (await mediaRepository.GetFavoritedMediaIdsAsync(
            viewerId, previewIds, cancellationToken)).ToHashSet();
        var items = collections.Select(collection => collection with
        {
            PreviewIsFavorited = collection.PreviewMediaId is { } previewId && favoritedIds.Contains(previewId),
        }).ToList();
        var last = page.LastOrDefault()?.Collection;
        return new CollectionPageResponse(items,
            hasMore && last is not null ? EncodeCollectionCursor(last.CreatedAt, last.Id) : null,
            hasMore);
    }

    private static (DateTime? Date, Guid? Id) DecodeCollectionCursor(string? cursor)
    {
        if (string.IsNullOrEmpty(cursor)) return (null, null);
        try
        {
            if (cursor.Length > 128) throw new FormatException();
            var base64 = cursor.Replace('-', '+').Replace('_', '/').PadRight((cursor.Length + 3) / 4 * 4, '=');
            var values = Encoding.UTF8.GetString(Convert.FromBase64String(base64)).Split('|');
            if (values.Length != 2
                || !DateTime.TryParseExact(values[0], "O", CultureInfo.InvariantCulture,
                    DateTimeStyles.RoundtripKind, out var date)
                || date.Kind != DateTimeKind.Utc
                || !Guid.TryParseExact(values[1], "N", out var id))
                throw new FormatException();
            return (date, id);
        }
        catch (FormatException)
        {
            throw new ValidationException("Invalid collection page.",
                new Dictionary<string, string[]> { ["cursor"] = ["Invalid cursor."] });
        }
    }

    private static string EncodeCollectionCursor(DateTime date, Guid id)
        => Convert.ToBase64String(Encoding.UTF8.GetBytes($"{date.ToUniversalTime():O}|{id:N}"))
            .TrimEnd('=').Replace('+', '-').Replace('/', '_');

    public async Task<CollectionMembershipResponse> GetOwnedMembershipAsync(
        Guid ownerId, CollectionMembershipRequest request, CancellationToken cancellationToken = default)
    {
        if (request.MediaIds is not { Count: > 0 and <= 100 }
            || request.MediaIds.Any(id => id == Guid.Empty)
            || request.MediaIds.Distinct().Count() != request.MediaIds.Count)
            throw new ValidationException("Invalid media selection.",
                new Dictionary<string, string[]> { ["mediaIds"] = ["Provide 1 to 100 distinct media IDs."] });

        var rows = await repository.GetOwnedMembershipAsync(ownerId, request.MediaIds, cancellationToken);
        var byMediaId = rows.GroupBy(row => row.MediaId)
            .ToDictionary(group => group.Key, group => (IReadOnlyList<Guid>)group.Select(row => row.AlbumId).Distinct().ToList());
        return new CollectionMembershipResponse(request.MediaIds
            .Select(id => new CollectionMembershipItemResponse(id, byMediaId.GetValueOrDefault(id) ?? []))
            .ToList());
    }

    public async Task<IReadOnlyList<CollectionDto>> GetCollectionsAsync(
        Guid viewerId, CollectionListRequest request, CancellationToken cancellationToken = default)
        => await GetCollectionsAsync(viewerId, request, isAdmin: false, cancellationToken);

    public async Task<IReadOnlyList<CollectionDto>> GetCollectionsAsync(
        Guid viewerId, CollectionListRequest request, bool isAdmin, CancellationToken cancellationToken = default)
    {
        var scope = request.Scope?.Trim().ToLowerInvariant() ?? "";
        var sources = scope switch
        {
            CollectionListRequest.MineScope => await repository.GetOwnedCollectionsAsync(
                viewerId, request.MediaId, cancellationToken),
            CollectionListRequest.PublicScope => await repository.GetPublicCollectionsAsync(
                viewerId, request.MediaId, cancellationToken),
            CollectionListRequest.AdminScope when isAdmin => await repository.GetAllCollectionsAsync(
                request.MediaId, cancellationToken),
            _ => throw new ValidationException(
                "Invalid collection scope.",
                new Dictionary<string, string[]> { ["scope"] = [isAdmin ? "Must be 'mine', 'public', or 'all'." : "Must be 'mine' or 'public'."] }),
        };
        var collections = sources.Select(mapper.Map).ToList();
        var previewIds = collections.Select(collection => collection.PreviewMediaId)
            .OfType<Guid>().Distinct().ToList();
        var favoritedIds = (await mediaRepository.GetFavoritedMediaIdsAsync(
            viewerId, previewIds, cancellationToken)).ToHashSet();
        return collections.Select(collection => collection with
        {
            PreviewIsFavorited = collection.PreviewMediaId is { } previewId && favoritedIds.Contains(previewId),
        }).ToList();
    }

    public async Task<CollectionDto> GetCollectionAsync(
        Guid collectionId, Guid viewerId, CancellationToken cancellationToken = default)
        => await GetCollectionAsync(collectionId, viewerId, isAdmin: false, cancellationToken);

    public async Task<CollectionDto> GetCollectionAsync(
        Guid collectionId, Guid viewerId, bool isAdmin, CancellationToken cancellationToken = default)
    {
        var collection = mapper.Map(await GetViewableSourceAsync(collectionId, viewerId, isAdmin, cancellationToken));
        if (collection.PreviewMediaId is not { } previewId)
            return collection;
        var favoritedIds = await mediaRepository.GetFavoritedMediaIdsAsync(
            viewerId, [previewId], cancellationToken);
        return collection with { PreviewIsFavorited = favoritedIds.Contains(previewId) };
    }

    public Task<PagedMediaResponse<MediaFileDto>> GetCollectionMediaAsync(
        Guid collectionId, Guid viewerId, int offset, int limit, CancellationToken cancellationToken = default)
        => GetCollectionMediaAsync(
            collectionId, viewerId, new MediaPageRequest { Offset = offset, Limit = limit }, cancellationToken);

    public async Task<PagedMediaResponse<MediaFileDto>> GetCollectionMediaAsync(
        Guid collectionId, Guid viewerId, MediaPageRequest request, CancellationToken cancellationToken = default)
        => await GetCollectionMediaAsync(collectionId, viewerId, request, isAdmin: false, cancellationToken);

    public async Task<PagedMediaResponse<MediaFileDto>> GetCollectionMediaAsync(
        Guid collectionId, Guid viewerId, MediaPageRequest request, bool isAdmin, CancellationToken cancellationToken = default)
    {
        var (offset, limit) = (request.Offset, request.Limit);
        ValidatePage(offset, limit);
        if (request.MediaKind is not null && request.MediaKind is not ("image" or "video"))
            throw new ValidationException(
                "Invalid media page.",
                new Dictionary<string, string[]> { ["mediaKind"] = ["Must be 'image' or 'video'."] });
        await GetViewableSourceAsync(collectionId, viewerId, isAdmin, cancellationToken);

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
        return await GetCollectionAsync(collection.Id, ownerId, cancellationToken);
    }

    public async Task<CollectionDto> UpdateCollectionAsync(
        Guid collectionId, Guid ownerId, UpdateCollectionRequest request, CancellationToken cancellationToken = default)
    {
        Guid? oldPreviewId;
        await using (var transaction = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            await previewLifecycle.LockAsync(cancellationToken);
            var collection = await FindOwnedCollectionAsync(collectionId, ownerId, cancellationToken);
            oldPreviewId = collection.PreviewMediaFileId;
            if (request.PreviewMediaId is { } previewId)
                await previewLifecycle.ValidateImageAsync(previewId, ownerId, cancellationToken);
            collection.Name = NormalizeName(request.Name);
            collection.IsPublic = request.IsPublic;
            collection.PreviewMediaFileId = request.PreviewMediaId;
            if (request.Caption is not null)
                collection.Caption = NormalizeCaption(request.Caption);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        if (oldPreviewId is { } oldId && oldId != request.PreviewMediaId)
            await previewLifecycle.CleanupAsync([oldId], ownerId, CancellationToken.None);
        return await GetCollectionAsync(collectionId, ownerId, cancellationToken);
    }

    public async Task<CollectionDto> UpdateCollectionCaptionAsync(
        Guid collectionId, Guid editorId, UpdateCollectionCaptionRequest request,
        CancellationToken cancellationToken = default)
    {
        var collection = await repository.FindCollectionAsync(collectionId, cancellationToken)
            ?? throw new NotFoundException($"Collection '{collectionId}' was not found.");
        if (collection.OwnerId != editorId)
            throw new NotFoundException($"Collection '{collectionId}' was not found.");

        collection.Caption = NormalizeCaption(request.Caption);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetCollectionAsync(collectionId, editorId, cancellationToken);
    }

    public async Task<CollectionDto> GetCollectionForAdminAsync(Guid collectionId, CancellationToken cancellationToken = default)
        => mapper.Map(await repository.GetCollectionSourceAsync(collectionId, cancellationToken)
            ?? throw new NotFoundException($"Collection '{collectionId}' was not found."));

    public Task DeleteCollectionAsync(
        Guid collectionId, Guid ownerId, CancellationToken cancellationToken = default)
        => DeleteCollectionAsync(collectionId, ownerId, false, cancellationToken);

    public async Task DeleteCollectionAsync(
        Guid collectionId, Guid actorId, bool isAdmin, CancellationToken cancellationToken = default)
    {
        Guid? previewId;
        await using (var transaction = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            await previewLifecycle.LockAsync(cancellationToken);
            var collection = isAdmin
                ? await repository.FindCollectionAsync(collectionId, cancellationToken)
                    ?? throw new NotFoundException($"Collection '{collectionId}' was not found.")
                : await FindOwnedCollectionAsync(collectionId, actorId, cancellationToken);
            previewId = collection.PreviewMediaFileId;
            var utcNow = DateTime.UtcNow;
            await repository.DeleteCollectionMediaAsync(collectionId, actorId, utcNow, cancellationToken);
            collection.DeletedAt = utcNow;
            collection.DeletedBy = actorId;
            await unitOfWork.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        if (previewId is { } oldId)
            await previewLifecycle.CleanupAsync([oldId], actorId, CancellationToken.None);
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

        return await GetCollectionAsync(collectionId, ownerId, cancellationToken);
    }

    public async Task<CollectionDto> UpdateMediaBatchAsync(
        Guid collectionId, Guid ownerId, IReadOnlyCollection<Guid> mediaIds, bool add,
        CancellationToken cancellationToken = default)
    {
        var ids = mediaIds.Distinct().ToArray();
        if (ids.Length == 0)
            throw new ValidationException("At least one media item is required.",
                new Dictionary<string, string[]> { ["mediaIds"] = ["Select at least one media item."] });

        var collection = await FindOwnedCollectionAsync(collectionId, ownerId, cancellationToken);
        var existingIds = (await mediaRepository.GetExistingMediaIdsAsync(ids, cancellationToken)).ToHashSet();
        var missingId = ids.FirstOrDefault(id => !existingIds.Contains(id));
        if (missingId != Guid.Empty)
            throw new NotFoundException($"Media '{missingId}' was not found.");

        var entries = await repository.GetCollectionMediaEntriesAsync(
            collectionId, ids, includeDeleted: add, cancellationToken);
        var entryByMediaId = entries.GroupBy(item => item.MediaFileId)
            .ToDictionary(group => group.Key, group => group.First());
        var changed = false;
        var now = DateTime.UtcNow;
        foreach (var mediaId in ids)
        {
            entryByMediaId.TryGetValue(mediaId, out var entry);
            if (add)
            {
                if (entry is { DeletedAt: null })
                    continue;
                if (entry is not null)
                {
                    entry.DeletedAt = null;
                    entry.DeletedBy = null;
                    entry.UpdatedAt = now;
                    entry.UpdatedBy = ownerId;
                }
                else
                {
                    repository.AddCollectionMedia(new CollectionMedia
                    {
                        CollectionId = collectionId,
                        MediaFileId = mediaId,
                    });
                }
                changed = true;
            }
            else if (entry is { DeletedAt: null })
            {
                entry.DeletedAt = now;
                entry.DeletedBy = ownerId;
                entry.UpdatedAt = now;
                entry.UpdatedBy = ownerId;
                if (collection.PreviewMediaFileId == mediaId)
                    collection.PreviewMediaFileId = null;
                changed = true;
            }
        }

        if (changed)
            await unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetCollectionAsync(collectionId, ownerId, cancellationToken);
    }

    public async Task<CollectionDto> UploadPreviewImageAsync(
        Guid collectionId,
        Guid ownerId,
        Stream content,
        string originalFilename,
        long sizeHint,
        CancellationToken cancellationToken = default)
    {
        await FindOwnedCollectionAsync(collectionId, ownerId, cancellationToken);
        var preview = await previews.UploadAsync(ownerId, content, originalFilename, sizeHint, cancellationToken);
        Guid? oldPreviewId;
        try
        {
            await using (var transaction = await unitOfWork.BeginTransactionAsync(cancellationToken))
            {
                await previewLifecycle.LockAsync(cancellationToken);
                var collection = await FindOwnedCollectionAsync(collectionId, ownerId, cancellationToken);
                oldPreviewId = collection.PreviewMediaFileId;
                await previewLifecycle.ValidateImageAsync(preview.Id, ownerId, cancellationToken);
                collection.PreviewMediaFileId = preview.Id;
                await unitOfWork.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);
            }
        }
        catch
        {
            unitOfWork.DiscardChanges();
            await previews.ReleaseDraftAsync(preview.Id, ownerId, CancellationToken.None);
            throw;
        }
        if (oldPreviewId is { } oldId)
            await previewLifecycle.CleanupAsync([oldId], ownerId, CancellationToken.None);
        return await GetCollectionAsync(collectionId, ownerId, cancellationToken);
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

        return await GetCollectionAsync(collectionId, ownerId, cancellationToken);
    }

    private async Task<CollectionSource> GetViewableSourceAsync(
        Guid collectionId, Guid viewerId, CancellationToken cancellationToken)
        => await GetViewableSourceAsync(collectionId, viewerId, isAdmin: false, cancellationToken);

    private async Task<CollectionSource> GetViewableSourceAsync(
        Guid collectionId, Guid viewerId, bool isAdmin, CancellationToken cancellationToken)
    {
        var source = await repository.GetCollectionSourceAsync(collectionId, cancellationToken);
        // Private collections are reported as missing so their existence is not disclosed.
        if (source is null || (!isAdmin && source.Collection.OwnerId != viewerId && !source.Collection.IsPublic))
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
