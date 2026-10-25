using Microsoft.EntityFrameworkCore.Storage;
using Infrastructures.Data.Interfaces;

namespace Infrastructures.Data.Implementations;

public sealed class UnitOfWork(ApplicationDbContext db) : IUnitOfWork
{
    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        => db.SaveChangesAsync(cancellationToken);

    public async Task<IDataTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default)
        => new DataTransaction(await db.Database.BeginTransactionAsync(cancellationToken));
}
