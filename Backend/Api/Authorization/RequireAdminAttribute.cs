using Microsoft.AspNetCore.Authorization;
using Service.Core;

namespace Api.Authorization;

/// <summary>Authorization decorator that restricts an endpoint or controller to admin-role tokens.</summary>
public sealed class RequireAdminAttribute : AuthorizeAttribute
{
    public RequireAdminAttribute() : base(Constants.Auth.AdminPolicy) { }
}
