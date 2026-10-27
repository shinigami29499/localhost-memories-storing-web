using Services.Exceptions;
using Services.Interfaces;
using Services.Models.Notifications;
using Infrastructures.Data.Interfaces;

namespace Infrastructures.Data.ApplicationServices;

public sealed class NotificationService(
    INotificationRepository repository,
    IUnitOfWork unitOfWork) : INotificationService
{
    public async Task<NotificationFeedDto> GetNotificationsAsync(
        Guid recipientId, int limit, CancellationToken cancellationToken = default)
    {
        if (limit is < 1 or > 100)
            throw new ValidationException(
                "Invalid notification limit.",
                new Dictionary<string, string[]> { ["limit"] = ["Must be between 1 and 100."] });

        var items = await repository.GetRecentAsync(recipientId, limit, cancellationToken);
        var unreadCount = await repository.CountUnreadAsync(recipientId, cancellationToken);
        return new NotificationFeedDto(items.Select(Map).ToList(), unreadCount);
    }

    public async Task MarkReadAsync(
        Guid notificationId, Guid recipientId, CancellationToken cancellationToken = default)
    {
        var notification = await repository.FindForRecipientAsync(notificationId, recipientId, cancellationToken)
            ?? throw new NotFoundException($"Notification '{notificationId}' was not found.");

        if (notification.ReadAt.HasValue)
            return;

        notification.ReadAt = DateTime.UtcNow;
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task MarkAllReadAsync(Guid recipientId, CancellationToken cancellationToken = default)
        => await repository.MarkAllReadAsync(recipientId, cancellationToken);

    private static PostNotificationDto Map(Domains.Entities.PostUploadNotification notification)
        => new(
            notification.Id,
            notification.NotificationType,
            notification.PostId,
            notification.ActorId,
            notification.ActorUsername,
            notification.PostCaption,
            notification.CreatedAt,
            notification.ReadAt);
}
