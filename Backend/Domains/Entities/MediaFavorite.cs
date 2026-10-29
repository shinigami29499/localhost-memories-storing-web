namespace Domains.Entities;

public class MediaFavorite : AuditableEntity
{
    public Guid MediaFileId { get; set; }
    public MediaFile MediaFile { get; set; } = null!;
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
}
