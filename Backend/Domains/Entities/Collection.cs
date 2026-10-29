namespace Domains.Entities;

public class Collection : AuditableEntity
{
    public required string Name { get; set; }
    public Guid OwnerId { get; set; }
    public User Owner { get; set; } = null!;
    public bool IsPublic { get; set; }

    // Null uses the first active image saved in the album.
    public Guid? PreviewMediaFileId { get; set; }
    public MediaFile? PreviewMediaFile { get; set; }
    public List<CollectionMedia> MediaItems { get; set; } = [];
}
