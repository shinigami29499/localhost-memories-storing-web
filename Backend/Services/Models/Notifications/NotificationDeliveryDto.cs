namespace Services.Models.Notifications;

public sealed record NotificationDeliveryDto(
    Guid RecipientId,
    PostNotificationDto Notification);
