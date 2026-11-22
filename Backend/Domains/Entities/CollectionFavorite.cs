namespace Domains.Entities;

public class CollectionFavorite : AuditableEntity
{
    public Guid CollectionId { get; set; }
    public Collection Collection { get; set; } = null!;
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
}
