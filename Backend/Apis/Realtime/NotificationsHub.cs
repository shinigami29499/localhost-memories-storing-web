using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Services.Core;

namespace Apis.Realtime;

[Authorize]
public sealed class NotificationsHub : Hub
{
    internal const string UploadAdminsGroup = "uploads:admins";
    internal static string UploadOwnerGroup(Guid ownerId) => $"uploads:owner:{ownerId}";

    public override async Task OnConnectedAsync()
    {
        if (Guid.TryParse(Context.UserIdentifier, out var userId))
            await Groups.AddToGroupAsync(Context.ConnectionId, UploadOwnerGroup(userId));
        if (Context.User?.FindFirstValue(Constants.Auth.RoleClaim) == Constants.Roles.Admin)
            await Groups.AddToGroupAsync(Context.ConnectionId, UploadAdminsGroup);
        await base.OnConnectedAsync();
    }
}

public sealed class SubClaimUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
        => connection.User?.FindFirstValue("sub");
}
