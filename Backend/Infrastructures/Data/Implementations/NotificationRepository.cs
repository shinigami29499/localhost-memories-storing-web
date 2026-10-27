using Microsoft.EntityFrameworkCore;
using Domains.Entities;
using Domains.Enums;
using Infrastructures.Data.Interfaces;
using Services.Models.Notifications;

namespace Infrastructures.Data.Implementations;

public sealed class NotificationRepository(ApplicationDbContext db) : INotificationRepository
{
    public async Task<IReadOnlyList<Guid>> GetActiveRecipientIdsAsync(
        Guid excludedUserId, CancellationToken cancellationToken = default)
        => await db.Users
            .Where(user => user.Id != excludedUserId && user.Status == AccountStatus.Active)
            .Select(user => user.Id)
            .ToListAsync(cancellationToken);

    public void AddRange(IEnumerable<PostUploadNotification> notifications)
        => db.Set<PostUploadNotification>().AddRange(notifications);

    public async Task<NotificationDeliveryDto?> AddPostActivityNotificationAsync(
        Guid postId, Guid actorId, string notificationType, CancellationToken cancellationToken = default)
    {
        var post = await db.Posts.AsNoTracking()
            .Where(item => item.Id == postId)
            .Select(item => new { item.UserId, item.Caption })
            .FirstOrDefaultAsync(cancellationToken);

        if (post is null || post.UserId == actorId)
            return null;

        var actorUsername = await db.Users.AsNoTracking()
            .Where(user => user.Id == actorId)
            .Select(user => user.Username)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException(
                $"Cannot create a post activity notification for missing user '{actorId}'.");

        var notification = new PostUploadNotification
        {
            NotificationType = notificationType,
            RecipientId = post.UserId,
            ActorId = actorId,
            ActorUsername = actorUsername,
            PostId = postId,
            PostCaption = post.Caption,
            CreatedAt = DateTime.UtcNow,
        };
        db.PostUploadNotifications.Add(notification);

        return new NotificationDeliveryDto(
            notification.RecipientId,
            new PostNotificationDto(
                notification.Id,
                notification.NotificationType,
                notification.PostId,
                notification.ActorId,
                notification.ActorUsername,
                notification.PostCaption,
                notification.CreatedAt,
                notification.ReadAt));
    }

    public async Task<IReadOnlyList<PostUploadNotification>> GetRecentAsync(
        Guid recipientId, int limit, CancellationToken cancellationToken = default)
        => await db.Set<PostUploadNotification>()
            .Where(notification => notification.RecipientId == recipientId)
            .OrderByDescending(notification => notification.CreatedAt)
            .ThenByDescending(notification => notification.Id)
            .Take(limit)
            .ToListAsync(cancellationToken);

    public Task<int> CountUnreadAsync(Guid recipientId, CancellationToken cancellationToken = default)
        => db.Set<PostUploadNotification>()
            .CountAsync(notification => notification.RecipientId == recipientId && notification.ReadAt == null,
                cancellationToken);

    public Task<PostUploadNotification?> FindForRecipientAsync(
        Guid notificationId, Guid recipientId, CancellationToken cancellationToken = default)
        => db.Set<PostUploadNotification>()
            .FirstOrDefaultAsync(
                notification => notification.Id == notificationId && notification.RecipientId == recipientId,
                cancellationToken);

    public Task<int> MarkAllReadAsync(Guid recipientId, CancellationToken cancellationToken = default)
    {
        var readAt = DateTime.UtcNow;
        return db.Set<PostUploadNotification>()
            .Where(notification => notification.RecipientId == recipientId && notification.ReadAt == null)
            .ExecuteUpdateAsync(
                setters => setters.SetProperty(notification => notification.ReadAt, readAt),
                cancellationToken);
    }
}
