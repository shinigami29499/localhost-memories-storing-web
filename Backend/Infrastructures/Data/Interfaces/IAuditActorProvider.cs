namespace Infrastructures.Data.Interfaces;

public interface IAuditActorProvider
{
    Guid? GetActor();
}
