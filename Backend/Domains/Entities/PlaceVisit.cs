namespace Domains.Entities;

public class PlaceVisit : AuditableEntity
{
    public Guid PlaceId { get; set; }
    public Place Place { get; set; } = null!;
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
}
