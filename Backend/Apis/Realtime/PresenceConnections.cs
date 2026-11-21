namespace Apis.Realtime;

public sealed class PresenceConnections
{
    private readonly object _gate = new();
    private readonly Dictionary<Guid, HashSet<string>> _connectionsByUser = new();

    public void Add(Guid userId, string connectionId)
    {
        lock (_gate)
        {
            if (!_connectionsByUser.TryGetValue(userId, out var connections))
            {
                connections = new HashSet<string>();
                _connectionsByUser.Add(userId, connections);
            }
            connections.Add(connectionId);
        }
    }

    public bool RemoveLast(Guid userId, string connectionId)
    {
        lock (_gate)
        {
            if (!_connectionsByUser.TryGetValue(userId, out var connections) ||
                !connections.Remove(connectionId) || connections.Count > 0)
                return false;

            _connectionsByUser.Remove(userId);
            return true;
        }
    }

    public bool HasMultipleConnections(Guid userId)
    {
        lock (_gate)
            return _connectionsByUser.TryGetValue(userId, out var connections) && connections.Count > 1;
    }
}
