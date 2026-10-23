using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Api.Authorization;
using Service.Options;
using Service.Exceptions;
using Service.Interfaces;
using Data;
using Infrastructure.Interfaces;

namespace Api.Controllers;

[ApiController]
[Route("api/Media")]
[Authorize]
public class MediaController(
    ApplicationDbContext db,
    IMediaService mediaService,
    IMediaStorageService storage,
    ICurrentUserContext currentUser,
    IOptions<JwtOptions> jwtOptions) : ControllerBase
{
    private readonly ApplicationDbContext _db = db;
    private readonly IMediaService _mediaService = mediaService;
    private readonly IMediaStorageService _storage = storage;
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

        var mediaQuery = _db.MediaFiles.AsNoTracking();
        var postQuery = _db.Posts.AsNoTracking();
        if (includeDeleted)
        {
            mediaQuery = mediaQuery.IgnoreQueryFilters();
            postQuery = postQuery.IgnoreQueryFilters();
            Response.Headers.CacheControl = "no-store";
        }

        var media = await mediaQuery
            .FirstOrDefaultAsync(m => m.Id == mediaId, cancellationToken)
            ?? throw new NotFoundException($"Media '{mediaId}' was not found.");

        if (!await postQuery.AnyAsync(p => p.Id == media.PostId, cancellationToken))
            throw new NotFoundException($"Media '{mediaId}' belongs to an unavailable post.");

        var relativePath = media.DeletedAt is null
            ? media.RelativePath
            : media.TrashRelativePath
                ?? throw new NotFoundException($"Media '{mediaId}' has no file in trash.");

        if (!await _storage.ExistsAsync(relativePath))
        {
            throw new NotFoundException(
                $"Media '{mediaId}' is present in the database but missing on disk.");
        }

        var stream = await _storage.OpenAsync(relativePath);
        return File(
            stream,
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
