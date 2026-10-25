using Microsoft.AspNetCore.Authorization;
using Services.Core;

namespace Apis.Authorization;

/// <summary>Authorization decorator that restricts an endpoint or controller to admin-role tokens.</summary>
public sealed class RequireAdminAttribute : AuthorizeAttribute
{
    public RequireAdminAttribute() : base(Constants.Auth.AdminPolicy) { }
}
