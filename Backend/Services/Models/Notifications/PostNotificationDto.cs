namespace Services.Models.Notifications;

public sealed record PostNotificationDto(
    Guid Id,
    string NotificationType,
    Guid PostId,
    Guid ActorId,
    string ActorUsername,
    string PostCaption,
    DateTime CreatedAt,
    DateTime? ReadAt);
