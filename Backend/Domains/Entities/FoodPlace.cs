namespace Domains.Entities;

public class FoodPlace : AuditableEntity
{
    public required string Name { get; set; }
    public string Address { get; set; } = "";
    public string Note { get; set; } = "";
    public double Latitude { get; set; }
    public double Longitude { get; set; }

    // Zero means the place has not been rated yet; ratings otherwise run from 1 to 5.
    public int Rating { get; set; }

    public string MarkerIcon { get; set; } = "";
    public string MarkerColor { get; set; } = "";
    public Guid OwnerId { get; set; }
    public User Owner { get; set; } = null!;
    public List<FoodPlaceMedia> MediaItems { get; set; } = [];
}
