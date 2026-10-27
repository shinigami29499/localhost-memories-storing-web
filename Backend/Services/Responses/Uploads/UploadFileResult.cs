using Services.Models.Notifications;
using Services.Models.Uploads;

namespace Services.Responses.Uploads;

public sealed record UploadFileResult(
    UploadItemDto Item,
    IReadOnlyList<NotificationDeliveryDto> Notifications);
