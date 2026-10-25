using Microsoft.EntityFrameworkCore.Storage;
using Infrastructures.Data.Interfaces;

namespace Infrastructures.Data.Implementations;

internal sealed class DataTransaction(IDbContextTransaction transaction) : IDataTransaction
{
    public Task CommitAsync(CancellationToken cancellationToken = default)
        => transaction.CommitAsync(cancellationToken);

    public ValueTask DisposeAsync() => transaction.DisposeAsync();
}
