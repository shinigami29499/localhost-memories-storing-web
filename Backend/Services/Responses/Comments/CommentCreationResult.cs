using Services.Models.Comments;
using Services.Models.Notifications;

namespace Services.Responses.Comments;

public sealed record CommentCreationResult(
    CommentDto Comment,
    NotificationDeliveryDto? Notification);
