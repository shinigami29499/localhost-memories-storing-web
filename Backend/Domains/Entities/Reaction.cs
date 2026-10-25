namespace Domains.Entities;

public class Reaction : AuditableEntity
{
    public Guid PostId { get; set; }
    public Post Post { get; set; } = null!;
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public required string ReactionType { get; set; }
}
