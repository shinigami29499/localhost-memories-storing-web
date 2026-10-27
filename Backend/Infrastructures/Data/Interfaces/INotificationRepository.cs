using Domains.Entities;
using Services.Models.Notifications;

namespace Infrastructures.Data.Interfaces;

public interface INotificationRepository
{
    Task<IReadOnlyList<Guid>> GetActiveRecipientIdsAsync(
        Guid excludedUserId, CancellationToken cancellationToken = default);
    void AddRange(IEnumerable<PostUploadNotification> notifications);
    Task<NotificationDeliveryDto?> AddPostActivityNotificationAsync(
        Guid postId, Guid actorId, string notificationType, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PostUploadNotification>> GetRecentAsync(
        Guid recipientId, int limit, CancellationToken cancellationToken = default);
    Task<int> CountUnreadAsync(Guid recipientId, CancellationToken cancellationToken = default);
    Task<PostUploadNotification?> FindForRecipientAsync(
        Guid notificationId, Guid recipientId, CancellationToken cancellationToken = default);
    Task<int> MarkAllReadAsync(Guid recipientId, CancellationToken cancellationToken = default);
}
