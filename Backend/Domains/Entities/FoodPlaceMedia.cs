namespace Domains.Entities;

public class FoodPlaceMedia : AuditableEntity
{
    public Guid FoodPlaceId { get; set; }
    public FoodPlace FoodPlace { get; set; } = null!;
    public Guid MediaFileId { get; set; }
    public MediaFile MediaFile { get; set; } = null!;

    // Display order; the lowest position is the place's cover image.
    public int Position { get; set; }
}
