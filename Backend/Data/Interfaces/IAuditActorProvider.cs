namespace Data.Interfaces;

/// <summary>Supplies the server-authenticated audit actor.</summary>
public interface IAuditActorProvider
{
    /// <summary>Null for system writes.</summary>
    Guid? GetActor();
}
