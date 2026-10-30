namespace Domains.Entities;

public class FoodPlaceVisit : AuditableEntity
{
    public Guid FoodPlaceId { get; set; }
    public FoodPlace FoodPlace { get; set; } = null!;
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
}
