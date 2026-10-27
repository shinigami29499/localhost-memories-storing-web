using Domains.Enums;

namespace Domains.Entities;

public class UploadBatch : AuditableEntity
{
    public Guid OwnerId { get; set; }
    public User Owner { get; set; } = null!;
    public string Caption { get; set; } = string.Empty;
    public Guid? PostId { get; set; }
    public Post? Post { get; set; }
    public UploadBatchStatus Status { get; set; } = UploadBatchStatus.Pending;
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public ICollection<UploadItem> Items { get; set; } = [];
}
