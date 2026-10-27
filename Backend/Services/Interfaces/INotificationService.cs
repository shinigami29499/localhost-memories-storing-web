using Services.Models.Notifications;

namespace Services.Interfaces;

public interface INotificationService
{
    Task<NotificationFeedDto> GetNotificationsAsync(
        Guid recipientId, int limit, CancellationToken cancellationToken = default);
    Task MarkReadAsync(Guid notificationId, Guid recipientId, CancellationToken cancellationToken = default);
    Task MarkAllReadAsync(Guid recipientId, CancellationToken cancellationToken = default);
}
