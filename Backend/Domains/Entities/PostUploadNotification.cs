using Domains.Enums;

namespace Domains.Entities;

public class PostUploadNotification : Entity
{
    public string NotificationType { get; set; } = NotificationTypes.PostUploaded;
    public Guid RecipientId { get; set; }
    public Guid ActorId { get; set; }
    public required string ActorUsername { get; set; }
    public Guid PostId { get; set; }
    public required string PostCaption { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }
}
