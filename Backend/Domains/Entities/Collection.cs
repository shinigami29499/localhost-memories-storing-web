namespace Domains.Entities;

public class Collection : AuditableEntity
{
    public required string Name { get; set; }
    public Guid OwnerId { get; set; }
    public User Owner { get; set; } = null!;
    public bool IsPublic { get; set; }

    // Null uses the first image of the earliest saved post.
    public Guid? PreviewMediaFileId { get; set; }
    public MediaFile? PreviewMediaFile { get; set; }
    public List<CollectionPost> Posts { get; set; } = [];
}
