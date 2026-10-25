namespace Infrastructures.Data.Interfaces;

public interface IDataTransaction : IAsyncDisposable
{
    Task CommitAsync(CancellationToken cancellationToken = default);
}
