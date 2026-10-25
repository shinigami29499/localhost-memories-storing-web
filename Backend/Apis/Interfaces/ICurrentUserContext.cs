namespace Apis.Interfaces;

/// <summary>Resolves identity from server-side authentication, never request bodies.</summary>
public interface ICurrentUserContext
{
    Guid? UserId { get; }
    string? Username { get; }
    bool IsAdmin { get; }
    Guid RequireUserId();
}
