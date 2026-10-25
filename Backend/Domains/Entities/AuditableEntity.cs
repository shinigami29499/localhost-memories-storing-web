namespace Domains.Entities;

// UTC audit actors are nullable IDs without foreign keys, allowing system writes.
public abstract class AuditableEntity : Entity
{
    public Guid? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public Guid? UpdatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public Guid? DeletedBy { get; set; }
    public DateTime? DeletedAt { get; set; }

    public bool IsDeleted => DeletedAt.HasValue;
}
