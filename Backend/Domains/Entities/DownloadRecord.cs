namespace Domains.Entities;

public class DownloadRecord : AuditableEntity
{
    public Guid? BatchId { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public Guid MediaId { get; set; }
    public required string OriginalFilename { get; set; }
}
