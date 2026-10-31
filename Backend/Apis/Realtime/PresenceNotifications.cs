using Microsoft.AspNetCore.SignalR;

namespace Apis.Realtime;

public static class PresenceNotifications
{
    public static async Task NotifyTransitionAsync(
        this IHubContext<NotificationsHub> hub,
        Guid userId,
        string username,
        bool online,
        DateTime lastSeenAt,
        CancellationToken cancellationToken = default)
    {
        await hub.Clients.Group(NotificationsHub.PresenceGroup)
            .SendAsync("UserPresenceChanged", new { userId, username, online, lastSeenAt }, cancellationToken);
    }
}
