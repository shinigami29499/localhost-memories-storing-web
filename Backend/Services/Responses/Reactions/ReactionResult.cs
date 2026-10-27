using Services.Models.Notifications;
using Services.Models.Posts;

namespace Services.Responses.Reactions;

public sealed record ReactionResult(
    IReadOnlyList<ReactionCountDto> Counts,
    NotificationDeliveryDto? Notification);
