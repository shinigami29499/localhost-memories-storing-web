namespace Services.Models.Notifications;

public sealed record NotificationFeedDto(
    IReadOnlyList<PostNotificationDto> Items,
    int UnreadCount);
