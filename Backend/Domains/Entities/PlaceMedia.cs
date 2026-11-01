namespace Domains.Entities;

public class PlaceMedia : AuditableEntity
{
    public Guid PlaceId { get; set; }
    public Place Place { get; set; } = null!;
    public Guid MediaFileId { get; set; }
    public MediaFile MediaFile { get; set; } = null!;

    // Display order; the lowest position is the place's cover image.
    public int Position { get; set; }
}
