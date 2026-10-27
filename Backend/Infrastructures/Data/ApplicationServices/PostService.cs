using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Infrastructures.Data.Interfaces;
using Services.Exceptions;
using Services.Models.Posts;
using Services.Interfaces;
using Services.Requests.Posts;
using Services.Responses.Posts;
using Services.Models.Notifications;
using Services.Core;
using Services.Models.Media;
using Domains.Entities;

namespace Infrastructures.Data.ApplicationServices;

public class PostService(
    IPostRepository repository,
    IUnitOfWork unitOfWork,
    IMediaStorage storage,
    ILogger<PostService> logger,
    IMapper mapper,
    INotificationRepository notificationRepository) : IPostService
{
    private readonly IPostRepository _repository = repository;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;
    private readonly IMediaStorage _storage = storage;
    private readonly ILogger<PostService> _logger = logger;
    private readonly INotificationRepository _notificationRepository = notificationRepository;

    public async Task<PagedFeedResponse<PostSummaryDto>> GetFeedAsync(
        Guid viewerId, int offset, int limit, CancellationToken cancellationToken = default)
    {
        if (limit < 1 || limit > FeedRequest.MaxLimit)
            throw new ValidationException(
                "Invalid feed page.",
                new Dictionary<string, string[]> { ["limit"] = [$"Must be between 1 and {FeedRequest.MaxLimit}."] });
        if (offset < 0)
            throw new ValidationException(
                "Invalid feed page.",
                new Dictionary<string, string[]> { ["offset"] = ["Must be zero or greater."] });

        var page = await _repository.GetFeedPageAsync(offset, limit, cancellationToken);
        var total = await _repository.CountActivePostsAsync(cancellationToken);

        if (page.Count == 0)
            return new PagedFeedResponse<PostSummaryDto>(offset, limit, total, []);

        var postIds = page.Select(p => p.Id).ToList();

        var commentCounts = await _repository.GetActiveCommentCountsAsync(postIds, cancellationToken);
        var reactionCounts = await _repository.GetActiveReactionCountsAsync(postIds, cancellationToken);
        IReadOnlyList<UserPostReaction> myReactions = reactionCounts.Count == 0
            ? []
            : await _repository.GetActiveUserReactionsAsync(viewerId, postIds, cancellationToken);

        var items = page.Select(p => mapper.Map(
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
                .ToList())).ToList();

        return new PagedFeedResponse<PostSummaryDto>(offset, limit, total, items);
    }

    public async Task<PostSummaryDto> GetPostAsync(Guid postId, Guid viewerId, CancellationToken cancellationToken = default)
    {
        var post = await _repository.FindPostWithMediaAsync(postId, cancellationToken)
            ?? throw new NotFoundException($"Post '{postId}' was not found.");

        var commentCount = await _repository.CountActiveCommentsAsync(postId, cancellationToken);
        var reactionCounts = await _repository.GetActiveReactionCountsAsync(postId, cancellationToken);
        var myReactions = await _repository.GetActiveUserReactionsAsync(postId, viewerId, cancellationToken);

        return mapper.Map(post, commentCount, reactionCounts, myReactions);
    }

    public async Task<PostCreationResult> CreatePostAsync(
        Guid authorId, string authorUsername, string? caption, IReadOnlyList<IFormFile> mediaFiles,
        CancellationToken cancellationToken = default)
    {
        if (caption?.Length > 4000)
            throw new ValidationException(
                "Caption is too long.",
                new Dictionary<string, string[]> { ["caption"] = ["Maximum length is 4000 characters."] });

        long totalSize = 0;
        foreach (var file in mediaFiles)
        {
            if (file.Length == 0)
                throw new ValidationException(
                    "Empty upload.",
                    new Dictionary<string, string[]> { ["mediaFiles"] = [$"'{file.FileName}' is empty."] });

            if (file.Length > PostUploadLimits.MaxTotalBytes - totalSize)
                throw new ValidationException(
                    "Post media exceeds the total upload limit.",
                    new Dictionary<string, string[]>
                    {
                        ["mediaFiles"] = [$"Total media size must not exceed {PostUploadLimits.MaxTotalGigabytes} GB."]
                    });

            totalSize += file.Length;
        }

        var post = new Post { Caption = caption?.Trim() ?? string.Empty, UserId = authorId };
        _repository.AddPost(post);

        var uploaded = new List<MediaFile>();

        foreach (var file in mediaFiles)
        {
            await using var stream = file.OpenReadStream();
            var stored = await _storage.SaveAsync(stream, file.FileName, file.Length, cancellationToken);

            uploaded.Add(mapper.Map(stored, post.Id, file.FileName));
        }

        _repository.AddMediaFiles(uploaded);
        var notifications = new List<PostUploadNotification>();

        try
        {
            notifications.AddRange(await CreateUploadNotificationsAsync(post, authorUsername, cancellationToken));
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            // Failed writes leave uploaded files in trash, not active storage.
            foreach (var media in uploaded)
            {
                try
                {
                    await _storage.MoveToTrashAsync(media.RelativePath, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "Orphaned upload '{RelativePath}' could not be moved to trash after failed save",
                        media.RelativePath);
                }
            }
            throw;
        }

        _logger.LogInformation(
            "User {UserId} created post {PostId} with {MediaCount} media file(s)",
            authorId, post.Id, uploaded.Count);

        var createdPost = await GetPostAsync(post.Id, authorId, cancellationToken);
        return new PostCreationResult(createdPost, MapDeliveries(notifications));
    }

    public async Task<PostCreationResult> AttachUploadedMediaAsync(
        Guid authorId, string authorUsername, string caption, Guid? postId,
        StoredFile stored, string originalFilename, CancellationToken cancellationToken = default)
    {
        var post = postId.HasValue
            ? await _repository.FindActivePostAsync(postId.Value, cancellationToken)
                ?? throw new ConflictException("The post was deleted. Restore it before retrying its uploads.")
            : new Post { UserId = authorId, Caption = caption };
        if (post.UserId != authorId)
            throw new NotFoundException($"Post '{post.Id}' was not found.");

        if (!postId.HasValue)
            _repository.AddPost(post);
        _repository.AddMediaFiles([mapper.Map(stored, post.Id, originalFilename)]);
        var notifications = !postId.HasValue
            ? await CreateUploadNotificationsAsync(post, authorUsername, cancellationToken)
            : [];
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        var createdPost = await GetPostAsync(post.Id, authorId, cancellationToken);
        return new PostCreationResult(createdPost, MapDeliveries(notifications));
    }

    private async Task<IReadOnlyList<PostUploadNotification>> CreateUploadNotificationsAsync(
        Post post, string authorUsername, CancellationToken cancellationToken)
    {
        var recipientIds = await _notificationRepository.GetActiveRecipientIdsAsync(post.UserId, cancellationToken);
        var notificationTime = DateTime.UtcNow;
        var notifications = recipientIds.Select(recipientId => new PostUploadNotification
        {
            RecipientId = recipientId,
            ActorId = post.UserId,
            ActorUsername = authorUsername,
            PostId = post.Id,
            PostCaption = post.Caption,
            CreatedAt = notificationTime,
        }).ToList();
        _notificationRepository.AddRange(notifications);
        return notifications;
    }

    private static IReadOnlyList<NotificationDeliveryDto> MapDeliveries(
        IEnumerable<PostUploadNotification> notifications)
        => notifications
            .Select(notification => new NotificationDeliveryDto(
                notification.RecipientId,
                new PostNotificationDto(
                    notification.Id,
                    notification.NotificationType,
                    notification.PostId,
                    notification.ActorId,
                    notification.ActorUsername,
                    notification.PostCaption,
                    notification.CreatedAt,
                    notification.ReadAt)))
            .ToList();

    public async Task<PostSummaryDto> UpdateCaptionAsync(
        Guid postId, Guid actorId, bool isAdmin, string caption, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(caption) || caption.Trim().Length > 4000)
            throw new ValidationException(
                "Invalid caption.",
                new Dictionary<string, string[]> { ["caption"] = ["Provide a caption of 1..4000 characters."] });

        var post = await LoadOwnedPostAsync(postId, actorId, isAdmin, cancellationToken);
        post.Caption = caption.Trim();
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetPostAsync(postId, actorId, cancellationToken);
    }

    public async Task DeletePostAsync(
        Guid postId, Guid actorId, bool isAdmin, CancellationToken cancellationToken = default)
    {
        await using var tx = await _unitOfWork.BeginTransactionAsync(cancellationToken);
        await _repository.LockPostUploadsAsync(postId, cancellationToken);
        var post = await LoadOwnedPostAsync(postId, actorId, isAdmin, cancellationToken);

        var media = await _repository.GetPostMediaAsync(postId, includeDeleted: false, cancellationToken);

        var utcNow = DateTime.UtcNow;

        foreach (var file in media)
        {
            file.TrashRelativePath = await _storage.MoveToTrashAsync(file.RelativePath, cancellationToken);
            file.TrashedAt = utcNow;
        }

        try
        {
            // Shared deletion audit values keep the post family restorable together.
            post.DeletedAt = utcNow;
            post.DeletedBy = actorId;
            post.UpdatedAt = utcNow;
            post.UpdatedBy = actorId;

            foreach (var file in media)
            {
                file.DeletedAt = utcNow;
                file.DeletedBy = actorId;
                file.UpdatedAt = utcNow;
                file.UpdatedBy = actorId;
            }

            await _repository.DeletePostInteractionsAsync(postId, actorId, utcNow, cancellationToken);
            await _repository.CancelPostUploadsAsync(postId, actorId, utcNow, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }
        catch
        {
            // Compensate filesystem moves when the database transaction fails.
            _logger.LogError("Post {PostId} deletion failed at database stage; restoring files from trash", postId);
            foreach (var file in media.Where(m => m.TrashRelativePath is not null))
            {
                try
                {
                    await _storage.RestoreFromTrashAsync(file.TrashRelativePath!, file.RelativePath, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "Compensation failed: trashed file {TrashPath} could not be restored to {OriginalPath}",
                        file.TrashRelativePath, file.RelativePath);
                }
            }
            throw;
        }

        _logger.LogInformation(
            "Post {PostId} soft-deleted by {ActorId}: {MediaCount} media file(s) trashed",
            postId, actorId, media.Count);
    }

    public async Task<PagedFeedResponse<DeletedPostDto>> GetDeletedPostsAsync(
        int offset, int limit, CancellationToken cancellationToken = default)
    {
        if (limit < 1 || limit > FeedRequest.MaxLimit)
            throw new ValidationException(
                "Invalid feed page.",
                new Dictionary<string, string[]> { ["limit"] = [$"Must be between 1 and {FeedRequest.MaxLimit}."] });
        if (offset < 0)
            throw new ValidationException(
                "Invalid feed page.",
                new Dictionary<string, string[]> { ["offset"] = ["Must be zero or greater."] });

        var page = await _repository.GetDeletedPostsPageAsync(offset, limit, cancellationToken);
        var total = await _repository.CountDeletedPostsAsync(cancellationToken);

        if (page.Count == 0)
            return new PagedFeedResponse<DeletedPostDto>(offset, limit, total, []);

        var postIds = page.Select(p => p.Id).ToList();

        var mediaCounts = await _repository.GetMediaCountsAsync(postIds, includeDeleted: true, cancellationToken);
        var commentCounts = await _repository.GetCommentCountsAsync(postIds, includeDeleted: true, cancellationToken);

        var deletedByIds = page
            .Where(p => p.DeletedBy.HasValue)
            .Select(p => p.DeletedBy!.Value)
            .Distinct()
            .ToList();
        var deleters = deletedByIds.Count == 0
            ? new Dictionary<Guid, User>()
            : await _repository.GetUsersByIdsAsync(deletedByIds, includeDeleted: true, cancellationToken);

        var items = page.Select(p => mapper.Map(
            p,
            p.DeletedBy.HasValue ? deleters.GetValueOrDefault(p.DeletedBy.Value) : null,
            mediaCounts.GetValueOrDefault(p.Id),
            commentCounts.GetValueOrDefault(p.Id))).ToList();

        return new PagedFeedResponse<DeletedPostDto>(offset, limit, total, items);
    }

    public async Task<PagedFeedResponse<AdminPostDto>> GetAllPostsAsync(
        int offset, int limit, CancellationToken cancellationToken = default)
    {
        if (limit < 1 || limit > FeedRequest.MaxLimit)
            throw new ValidationException(
                "Invalid feed page.",
                new Dictionary<string, string[]> { ["limit"] = [$"Must be between 1 and {FeedRequest.MaxLimit}."] });
        if (offset < 0)
            throw new ValidationException(
                "Invalid feed page.",
                new Dictionary<string, string[]> { ["offset"] = ["Must be zero or greater."] });

        var page = await _repository.GetAllPostsPageAsync(offset, limit, cancellationToken);
        var total = await _repository.CountAllPostsAsync(cancellationToken);

        if (page.Count == 0)
            return new PagedFeedResponse<AdminPostDto>(offset, limit, total, []);

        var postIds = page.Select(p => p.Id).ToList();

        var commentCounts = await _repository.GetCommentCountsAsync(postIds, includeDeleted: true, cancellationToken);

        var deletedByIds = page
            .Where(p => p.DeletedBy.HasValue)
            .Select(p => p.DeletedBy!.Value)
            .Distinct()
            .ToList();
        var deleters = deletedByIds.Count == 0
            ? new Dictionary<Guid, User>()
            : await _repository.GetUsersByIdsAsync(deletedByIds, includeDeleted: true, cancellationToken);

        var items = page.Select(p => mapper.Map(new AdminPostSource(
            p,
            p.DeletedBy.HasValue ? deleters.GetValueOrDefault(p.DeletedBy.Value) : null,
            p.MediaFiles.Count,
            commentCounts.GetValueOrDefault(p.Id)))).ToList();

        return new PagedFeedResponse<AdminPostDto>(offset, limit, total, items);
    }

    public async Task RestorePostAsync(Guid postId, Guid actorId, CancellationToken cancellationToken = default)
    {
        var post = await _repository.FindPostIncludingDeletedAsync(postId, cancellationToken)
            ?? throw new NotFoundException($"Post '{postId}' was not found.");

        if (post.DeletedAt is null)
            throw new ConflictException($"Post '{postId}' is not deleted and cannot be restored.");

        var deletedAt = post.DeletedAt.Value;
        var deletedBy = post.DeletedBy;

        var media = await _repository.GetPostMediaAsync(postId, includeDeleted: true, cancellationToken);

        var trashed = media
            .Where(m => m.TrashRelativePath is not null)
            .Select(m => (File: m, TrashPath: m.TrashRelativePath!))
            .ToList();

        var restoredFiles = new List<MediaFile>();
        try
        {
            foreach (var item in trashed)
            {
                await _storage.RestoreFromTrashAsync(item.TrashPath, item.File.RelativePath, cancellationToken);
                restoredFiles.Add(item.File);
            }

            await using var tx = await _unitOfWork.BeginTransactionAsync(cancellationToken);

            post.DeletedAt = null;
            post.DeletedBy = null;

            foreach (var file in media)
            {
                file.DeletedAt = null;
                file.DeletedBy = null;
                file.TrashRelativePath = null;
                file.TrashedAt = null;
            }

            await _repository.RestorePostInteractionsAsync(
                postId, deletedAt, deletedBy, actorId, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }
        catch
        {
            // Compensate filesystem moves when the restore fails, so the trash state matches the database.
            _logger.LogError("Post {PostId} restore failed; returning files to trash", postId);
            foreach (var file in restoredFiles)
            {
                try
                {
                    await _storage.MoveToTrashAsync(file.RelativePath, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "Compensation failed: restored file {RelativePath} could not be returned to trash",
                        file.RelativePath);
                }
            }
            throw;
        }

        _logger.LogInformation(
            "Post {PostId} restored by {ActorId}: {MediaCount} media file(s) untrashed",
            postId, actorId, trashed.Count);
    }

    public async Task PurgePostAsync(Guid postId, Guid actorId, CancellationToken cancellationToken = default)
    {
        var post = await _repository.FindPostIncludingDeletedAsync(postId, cancellationToken)
            ?? throw new NotFoundException($"Post '{postId}' was not found.");

        // Soft-deleted posts keep their files in trash; active posts keep them in media storage.
        var files = await _repository.GetPostStoragePathsAsync(postId, cancellationToken);
        await _repository.PurgePostAsync(postId, cancellationToken);

        // Database rows are gone, so the files become best-effort garbage removal.
        foreach (var filePath in files)
        {
            try
            {
                await _storage.DeleteAsync(filePath, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "Media file '{FilePath}' could not be removed after purging post {PostId}",
                    filePath, postId);
            }
        }

        _logger.LogInformation(
            "Post {PostId} permanently deleted by {ActorId}: {FileCount} media file(s) removed",
            postId, actorId, files.Count);
    }

    private async Task<Post> LoadOwnedPostAsync(
        Guid postId, Guid actorId, bool isAdmin, CancellationToken cancellationToken)
    {
        var post = await _repository.FindActivePostAsync(postId, cancellationToken)
            ?? throw new NotFoundException($"Post '{postId}' was not found.");

        if (!isAdmin && post.UserId != actorId)
            throw new ForbiddenException("Only the author or an administrator may modify this post.");

        return post;
    }
}
