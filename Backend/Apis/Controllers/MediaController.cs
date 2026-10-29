using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Apis.Authorization;
using Apis.Interfaces;
using Services.Options;
using Services.Exceptions;
using Services.Interfaces;

namespace Apis.Controllers;

[ApiController]
[Route("api/media")]
[Authorize]
public class MediaController(
    IMediaService mediaService,
    ICurrentUserContext currentUser,
    IOptions<JwtOptions> jwtOptions) : ControllerBase
{
    private readonly IMediaService _mediaService = mediaService;
    private readonly ICurrentUserContext _currentUser = currentUser;
    private readonly JwtOptions _jwtOptions = jwtOptions.Value;

    /// <summary>Streams media; includeDeleted allows admins to preview files in trash without restoring them.</summary>
    [HttpGet("{mediaId:guid}/file")]
    [AllowAnonymous]
    public async Task<IActionResult> GetFileAsync(
        Guid mediaId, CancellationToken cancellationToken, [FromQuery] bool includeDeleted = false)
    {
        var accessTokenQuery = (string?)Request.Query["accessToken"];
        if (_currentUser.UserId is null && !TryResolveAccessTokenUser(accessTokenQuery))
            throw new UnauthorizedAccessException("A valid access token (header or ?accessToken=) is required.");

        if (includeDeleted && !_currentUser.IsAdmin)
            throw new ForbiddenException("Only administrators may preview deleted media.");

        if (includeDeleted)
            Response.Headers.CacheControl = "no-store";

        var media = await _mediaService.GetMediaFileAsync(mediaId, includeDeleted, cancellationToken);
        return File(
            media.Content,
            media.MimeType,
            fileDownloadName: media.OriginalFilename,
            enableRangeProcessing: true);
    }

    [RequireAdmin]
    [HttpDelete("{mediaId:guid}")]
    public async Task<IActionResult> DeleteMediaAsync(Guid mediaId, CancellationToken cancellationToken)
    {
        await _mediaService.DeleteMediaAsync(
            mediaId, _currentUser.RequireUserId(), _currentUser.IsAdmin, cancellationToken);
        return NoContent();
    }

    [RequireAdmin]
    [HttpPost("{mediaId:guid}/restore")]
    public async Task<IActionResult> RestoreMediaAsync(Guid mediaId, CancellationToken cancellationToken)
    {
        await _mediaService.RestoreMediaAsync(
            mediaId, _currentUser.RequireUserId(), _currentUser.IsAdmin, cancellationToken);
        return NoContent();
    }

    private bool TryResolveAccessTokenUser(string? accessTokenQuery)
    {
        if (string.IsNullOrWhiteSpace(accessTokenQuery))
            return false;

        try
        {
            var handler = new JwtSecurityTokenHandler
            {
                MapInboundClaims = false,
            };
            var principal = handler.ValidateToken(accessTokenQuery, new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = _jwtOptions.Issuer,
                ValidateAudience = true,
                ValidAudience = _jwtOptions.Audience,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.Key)),
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromSeconds(30),
            }, out _);

            var sub = principal.FindFirstValue("sub");
            if (sub is null || !Guid.TryParse(sub, out _))
                return false;

            HttpContext.User = principal;
            return true;
        }
        catch (SecurityTokenException)
        {
            return false;
        }
        catch (ArgumentException)
        {
            return false;
        }
    }
}
