namespace Domains.Entities;

public class Post : AuditableEntity
{
    public required string Caption { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public List<MediaFile> MediaFiles { get; set; } = [];
}
