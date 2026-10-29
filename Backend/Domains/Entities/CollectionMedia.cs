namespace Domains.Entities;

public class CollectionMedia : AuditableEntity
{
    public Guid CollectionId { get; set; }
    public Collection Collection { get; set; } = null!;
    public Guid MediaFileId { get; set; }
    public MediaFile MediaFile { get; set; } = null!;
}
