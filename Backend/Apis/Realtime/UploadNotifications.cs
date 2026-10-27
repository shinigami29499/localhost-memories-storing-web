using Microsoft.AspNetCore.SignalR;

namespace Apis.Realtime;

public static class UploadNotifications
{
    public static async Task NotifyUploadsChangedAsync(
        this IHubContext<NotificationsHub> hub,
        Guid ownerId,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        try
        {
            await hub.Clients.Groups(
                    NotificationsHub.UploadOwnerGroup(ownerId),
                    NotificationsHub.UploadAdminsGroup)
                .SendAsync("UploadsChanged", cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogWarning(exception,
                "Realtime upload changes for owner {OwnerId} could not be delivered", ownerId);
        }
    }
}
