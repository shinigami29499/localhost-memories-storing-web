using System.Security.Claims;
using Apis.Interfaces;
using Infrastructures.Data.Interfaces;
using Services.Core;
using Services.Interfaces;

namespace Apis.Implementations;

public class CurrentUserContext(IHttpContextAccessor httpContextAccessor) : ICurrentUserContext, IAuditActorProvider
{
    private ClaimsPrincipal? Principal => httpContextAccessor.HttpContext?.User;

    public Guid? UserId =>
        Guid.TryParse(Principal?.FindFirstValue("sub"), out var id) ? id : null;

    public string? Username => Principal?.FindFirstValue("username");

    public bool IsAdmin =>
        Principal?.FindFirstValue("role") == Constants.Roles.Admin;

    public Guid RequireUserId() =>
        UserId ?? throw new UnauthorizedAccessException("An authenticated user is required.");

    public string RequireUsername() =>
        Username ?? throw new UnauthorizedAccessException("An authenticated user is required.");

    Guid? IAuditActorProvider.GetActor() => UserId;
}
