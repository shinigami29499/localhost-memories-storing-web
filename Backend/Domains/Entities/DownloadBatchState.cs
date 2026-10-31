namespace Domains.Entities;

public class DownloadBatchState : AuditableEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public required string ItemsJson { get; set; }
}
