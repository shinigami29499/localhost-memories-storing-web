using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Service.Core;
using Service.Requests.Auth;
using Service.Responses.Auth;
using Service.Exceptions;
using Service.Interfaces;
using Service.Options;
using Data;
using Domain.Entities;
using Domain.Enums;

namespace Service.Implementations;

public class AuthService(
    ApplicationDbContext db,
    ITokenService tokenService,
    IOptions<JwtOptions> jwtOptions,
    ILogger<AuthService> logger,
    IMapper mapper) : IAuthService
{
    private readonly ApplicationDbContext _db = db;
    private readonly ITokenService _tokenService = tokenService;
    private readonly JwtOptions _jwtOptions = jwtOptions.Value;
    private readonly ILogger<AuthService> _logger = logger;

    public async Task<UserResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        var username = request.Username.Trim();

        // Username uniqueness includes deleted accounts.
        var nameTaken = await _db.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.Username == username, cancellationToken);
        if (nameTaken)
            throw new ConflictException("Username is already taken.");

        var user = mapper.Map(request);

        _db.Users.Add(user);
        await using var tx = await _db.Database.BeginTransactionAsync(cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
        await tx.CommitAsync(cancellationToken);

        _logger.LogInformation("User '{Username}' registered (id {UserId})", username, user.Id);
        return mapper.Map(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(
            u => u.Username == request.Username.Trim(), cancellationToken);

        if (user is null
            || !string.Equals(request.Password, user.Password, StringComparison.Ordinal)
            || user.Status != AccountStatus.Active)
        {
            _logger.LogWarning("Failed login attempt for username '{Username}'", request.Username);
            throw new UnauthorizedAccessException("Invalid username or password.");
        }

        return await IssueTokenPairAsync(user, cancellationToken);
    }

    public async Task<AuthResponse> RefreshAsync(string rawRefreshToken, CancellationToken cancellationToken = default)
    {
        var tokenHash = _tokenService.HashRefreshToken(rawRefreshToken);
        var token = await _db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == tokenHash, cancellationToken);

        if (token is null)
            throw new UnauthorizedAccessException("Invalid refresh token.");

        var utcNow = DateTime.UtcNow;

        if (!token.IsActive(utcNow))
        {
            // Reuse revokes the user's active token family.
            _logger.LogWarning(
                "Refresh-token reuse detected for user {UserId}; revoking all active tokens", token.UserId);

            var activeTokens = await _db.RefreshTokens
                .Where(t => t.UserId == token.UserId && t.RevokedAt == null && t.ExpiresAt > utcNow)
                .ToListAsync(cancellationToken);

            foreach (var active in activeTokens)
            {
                active.RevokedAt = utcNow;
                active.RevokedReason = Constants.Auth.RevocationReasons.ReuseDetected;
                active.RevokedBy = token.UserId;
            }

            await _db.SaveChangesAsync(cancellationToken);
            throw new UnauthorizedAccessException("Invalid refresh token.");
        }

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == token.UserId, cancellationToken);
        if (user is null || user.Status != AccountStatus.Active)
            throw new UnauthorizedAccessException("Invalid refresh token.");

        // Rotation: revoke the presented token and issue a successor.
        var (rawToken, newHash) = _tokenService.CreateRefreshToken();
        var now = DateTime.UtcNow;

        token.RevokedAt = now;
        token.RevokedReason = Constants.Auth.RevocationReasons.Rotated;
        token.RevokedBy = user.Id;
        token.UpdatedAt = now;
        token.UpdatedBy = user.Id;

        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = newHash,
            ExpiresAt = now.AddDays(_jwtOptions.RefreshTokenDays),
            CreatedAt = now,
            CreatedBy = user.Id,
        });

        await _db.SaveChangesAsync(cancellationToken);

        var (accessToken, accessTokenExpiresAt) = CreateAccessTokenFor(user);
        return new AuthResponse(accessToken, rawToken, accessTokenExpiresAt, mapper.Map(user));
    }

    public async Task LogoutAsync(Guid userId, string rawRefreshToken, CancellationToken cancellationToken = default)
    {
        var tokenHash = _tokenService.HashRefreshToken(rawRefreshToken);
        var token = await _db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == tokenHash, cancellationToken);

        if (token is null || token.UserId != userId)
            return; // Logout is idempotent.

        if (token.RevokedAt is not null)
            return;

        var now = DateTime.UtcNow;
        token.RevokedAt = now;
        token.RevokedReason = Constants.Auth.RevocationReasons.Logout;
        token.RevokedBy = userId;
        token.UpdatedAt = now;
        token.UpdatedBy = userId;

        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("User {UserId} logged out", userId);
    }

    private async Task<AuthResponse> IssueTokenPairAsync(User user, CancellationToken cancellationToken)
    {
        var utcNow = DateTime.UtcNow;
        var (rawToken, tokenHash) = _tokenService.CreateRefreshToken();

        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = tokenHash,
            ExpiresAt = utcNow.AddDays(_jwtOptions.RefreshTokenDays),
        });

        await _db.SaveChangesAsync(cancellationToken);

        var (accessToken, expiresAt) = CreateAccessTokenFor(user);
        return new AuthResponse(accessToken, rawToken, expiresAt, mapper.Map(user));
    }

    private (string, DateTime) CreateAccessTokenFor(User user) => _tokenService.CreateAccessToken(user);
}
