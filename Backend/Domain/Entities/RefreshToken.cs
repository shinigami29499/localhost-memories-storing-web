namespace Domain.Entities;

public class RefreshToken : AuditableEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    // Only the SHA-256 hash is persisted, never the raw token.
    public required string TokenHash { get; set; }
    public required DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? RevokedReason { get; set; }
    public Guid? RevokedBy { get; set; }

    public bool IsActive(DateTime utcNow) => RevokedAt is null && ExpiresAt > utcNow;
}
