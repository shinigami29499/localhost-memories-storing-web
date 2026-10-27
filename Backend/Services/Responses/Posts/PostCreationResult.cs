using Services.Models.Notifications;
using Services.Models.Posts;

namespace Services.Responses.Posts;

public sealed record PostCreationResult(
    PostSummaryDto Post,
    IReadOnlyList<NotificationDeliveryDto> Notifications);
