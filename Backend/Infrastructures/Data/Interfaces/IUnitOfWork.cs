namespace Infrastructures.Data.Interfaces;

public interface IUnitOfWork
{
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
    Task<IDataTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default);
}
