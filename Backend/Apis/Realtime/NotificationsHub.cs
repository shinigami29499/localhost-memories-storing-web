using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Services.Core;
using Services.Interfaces;

namespace Apis.Realtime;

[Authorize]
public sealed class NotificationsHub(IUserService userService) : Hub
{
    internal const string UploadAdminsGroup = "uploads:admins";
    internal const string UserAdminsGroup = "users:admins";
    internal const string PresenceGroup = "presence:users";
    internal static string UploadOwnerGroup(Guid ownerId) => $"uploads:owner:{ownerId}";

    public override async Task OnConnectedAsync()
    {
        if (Guid.TryParse(Context.UserIdentifier, out var userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, UploadOwnerGroup(userId));
        }
        await Groups.AddToGroupAsync(Context.ConnectionId, PresenceGroup);
        if (Context.User?.FindFirstValue(Constants.Auth.RoleClaim) == Constants.Roles.Admin)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, UploadAdminsGroup);
            await Groups.AddToGroupAsync(Context.ConnectionId, UserAdminsGroup);
        }
        await base.OnConnectedAsync();
    }

    public async Task TrackActivity()
    {
        if (!Guid.TryParse(Context.UserIdentifier, out var userId))
            throw new HubException("Authenticated user is required.");
        var lastSeenAt = await userService.HeartbeatAsync(userId);
        await Clients.Group(PresenceGroup).SendAsync("UserPresenceChanged", new
        {
            userId,
            username = Context.User?.FindFirstValue(Constants.Auth.UsernameClaim),
            online = true,
            lastSeenAt,
        });
    }
}

public sealed class SubClaimUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
        => connection.User?.FindFirstValue("sub");
}
