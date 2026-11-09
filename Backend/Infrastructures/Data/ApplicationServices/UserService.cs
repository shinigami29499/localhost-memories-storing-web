using Services.Core;
using Infrastructures.Data.Interfaces;
using Services.Exceptions;
using Services.Interfaces;
using Services.Responses.Auth;
using Domains.Entities;
using Domains.Enums;
using Services.Models.Users;
using Services.Requests.Users;
using Services.Responses.Users;
using Services.Models.Media;

namespace Infrastructures.Data.ApplicationServices;

public class UserService(
    IUserRepository repository, IUnitOfWork unitOfWork, IMapper mapper,
    IMediaRepository mediaRepository) : IUserService
{
    private const int MentionCandidateLimit = 8;
    private readonly IUserRepository _repository = repository;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;

    public async Task<UserResponse> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _repository.FindUserAsync(userId, cancellationToken);
        if (user is null || user.DeletedAt is not null)
            throw new NotFoundException("User not found.");

        return mapper.Map(user);
    }

    public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _repository.FindUserAsync(userId, cancellationToken);
        if (user is null || user.DeletedAt is not null)
            throw new NotFoundException("User not found.");

        if (!string.Equals(user.Password, request.CurrentPassword, StringComparison.Ordinal))
            throw new ValidationException("Current password is incorrect.", new Dictionary<string, string[]>
            {
                ["currentPassword"] = ["Current password is incorrect."],
            });

        user.Password = request.NewPassword;
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<UserResponse> SetAvatarAsync(
        Guid userId, SetAvatarRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Seed) || request.Seed.Length > 128)
            throw new ValidationException("Invalid avatar seed.", new Dictionary<string, string[]>
            {
                ["seed"] = ["Provide an avatar seed between 1 and 128 characters."],
            });

        var user = await _repository.FindUserAsync(userId, cancellationToken);
        if (user is null || user.DeletedAt is not null)
            throw new NotFoundException("User not found.");

        user.AvatarSeed = request.Seed.Trim();
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return mapper.Map(user);
    }

    public async Task<IReadOnlyList<UserResponse>> ListAsync(CancellationToken cancellationToken = default)
    {
        // Pending accounts first so the admin approval queue is immediately visible.
        var users = await _repository.ListUsersAsync(cancellationToken);

        return users.Select(mapper.Map).ToList();
    }

    public async Task<UserPageResponse> GetPageAsync(int page, int limit, bool pendingOnly, bool blockedOnly,
        CancellationToken cancellationToken = default)
    {
        if (page < 1 || page > 1_000_000 || limit is < 1 or > 100)
            throw new ValidationException("Invalid user page.", new Dictionary<string, string[]>
            {
                ["page"] = ["Use a page between 1 and 1000000 and a limit between 1 and 100."],
            });
        var (items, total, _, _) = await _repository.GetUserPageAsync(
            page, limit, pendingOnly, blockedOnly, cancellationToken);
        return new UserPageResponse(items.Select(mapper.Map).ToList(), page, limit, total);
    }

    public async Task<DateTime> HeartbeatAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _repository.FindUserAsync(userId, cancellationToken);
        if (user is null || user.DeletedAt is not null || user.Status != AccountStatus.Active)
            throw new Services.Exceptions.NotFoundException("User not found.");

        user.LastSeenAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return user.LastSeenAt.Value;
    }

    public Task<IReadOnlyList<UserMentionCandidateDto>> SearchMentionCandidatesAsync(
        string usernamePrefix, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(usernamePrefix);
        return _repository.FindMentionCandidatesAsync(
            usernamePrefix.Trim(), MentionCandidateLimit, cancellationToken);
    }

    public async Task<UserResponse> ApproveAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _repository.FindUserAsync(userId, cancellationToken);
        if (user is null || user.DeletedAt is not null)
            throw new NotFoundException("User not found.");

        if (user.Status != AccountStatus.PendingApproval)
            throw new ConflictException("Only pending accounts can be approved.");

        user.Status = AccountStatus.Active;
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return mapper.Map(user);
    }

    public async Task<UserResponse> DisableAsync(Guid userId, Guid disabledBy, CancellationToken cancellationToken = default)
    {
        if (userId == disabledBy)
            throw new ConflictException("You cannot disable your own account.");

        var user = await _repository.FindUserAsync(userId, cancellationToken);
        if (user is null || user.DeletedAt is not null)
            throw new NotFoundException("User not found.");
        if (user.Status != AccountStatus.Active)
            throw new ConflictException("Only active accounts can be disabled.");

        user.Status = AccountStatus.Disabled;
        var activeTokens = await _repository.FindActiveRefreshTokensAsync(userId, DateTime.UtcNow, cancellationToken);
        foreach (var token in activeTokens)
        {
            token.RevokedAt = DateTime.UtcNow;
            token.RevokedReason = Constants.Auth.RevocationReasons.UserDisabled;
            token.RevokedBy = disabledBy;
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return mapper.Map(user);
    }

    public async Task<UserResponse> ActivateAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _repository.FindUserAsync(userId, cancellationToken);
        if (user is null || user.DeletedAt is not null)
            throw new NotFoundException("User not found.");
        if (user.Status != AccountStatus.Disabled)
            throw new ConflictException("Only disabled accounts can be activated.");

        user.Status = AccountStatus.Active;
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return mapper.Map(user);
    }

    public async Task<UserResponse> UpdateRoleAsync(Guid userId, Guid updatedBy, UpdateUserRoleRequest request, CancellationToken cancellationToken = default)
    {
        if (userId == updatedBy)
            throw new ConflictException("You cannot change your own role.");
        var role = request.Role?.Trim().ToLowerInvariant() switch
        {
            "admin" => UserRole.Admin,
            "user" => UserRole.User,
            _ => throw new ConflictException("Role must be admin or user."),
        };
        var user = await _repository.FindUserAsync(userId, cancellationToken);
        if (user is null || user.DeletedAt is not null)
            throw new NotFoundException("User not found.");
        if (user.Role == role)
            return mapper.Map(user);

        user.Role = role;
        var utcNow = DateTime.UtcNow;
        var activeTokens = await _repository.FindActiveRefreshTokensAsync(userId, utcNow, cancellationToken);
        foreach (var token in activeTokens)
        {
            token.RevokedAt = utcNow;
            token.RevokedReason = Constants.Auth.RevocationReasons.UserRoleChanged;
            token.RevokedBy = updatedBy;
        }
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return mapper.Map(user);
    }

    public async Task DeleteAsync(Guid userId, Guid deletedBy, CancellationToken cancellationToken = default)
    {
        var user = await _repository.FindUserAsync(userId, cancellationToken);
        if (user is null || user.DeletedAt is not null)
            throw new NotFoundException("User not found.");

        var utcNow = DateTime.UtcNow;
        user.DeletedAt = utcNow;
        user.DeletedBy = deletedBy;

        // Revoke active sessions so a deleted account cannot stay signed in.
        var activeTokens = await _repository.FindActiveRefreshTokensAsync(userId, utcNow, cancellationToken);
        foreach (var token in activeTokens)
        {
            token.RevokedAt = utcNow;
            token.RevokedReason = Constants.Auth.RevocationReasons.UserDeleted;
            token.RevokedBy = deletedBy;
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<HomeLocationDto?> GetHomeLocationAsync(
        Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _repository.FindUserAsync(userId, cancellationToken);
        if (user is null || user.DeletedAt is not null)
            throw new NotFoundException("User not found.");

        var home = await _repository.GetSharedHomeLocationAsync(cancellationToken);
        return home.Latitude is { } latitude && home.Longitude is { } longitude
            ? new HomeLocationDto(latitude, longitude)
            : null;
    }

    public async Task<HomeLocationDto> SetHomeLocationAsync(
        Guid userId, SetHomeLocationRequest request, CancellationToken cancellationToken = default)
    {
        if (!double.IsFinite(request.Latitude) || request.Latitude is < -90 or > 90
            || !double.IsFinite(request.Longitude) || request.Longitude is < -180 or > 180)
            throw new ValidationException("Invalid home location.", new Dictionary<string, string[]>
            {
                ["location"] = ["Provide latitude (-90 to 90) and longitude (-180 to 180)."],
            });

        var user = await _repository.FindUserAsync(userId, cancellationToken);
        if (user is null || user.DeletedAt is not null)
            throw new NotFoundException("User not found.");

        var home = await _repository.GetSharedHomeLocationAsync(cancellationToken);
        if (request.ApplyToUnlocatedPhotos
            && (home.Latitude != request.Latitude || home.Longitude != request.Longitude))
            throw new ConflictException("Home changed. Refresh and confirm the current home location.");

        home.Latitude = request.Latitude;
        home.Longitude = request.Longitude;
        if (request.ApplyToUnlocatedPhotos)
        {
            await using var transaction = await _unitOfWork.BeginTransactionAsync(cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await mediaRepository.AssignHomeToUnlocatedMediaAsync(
                userId, new MediaLocationDto(request.Latitude, request.Longitude), cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        else
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        return new HomeLocationDto(request.Latitude, request.Longitude);
    }

    public async Task ClearHomeLocationAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _repository.FindUserAsync(userId, cancellationToken);
        if (user is null || user.DeletedAt is not null)
            throw new NotFoundException("User not found.");

        var home = await _repository.GetSharedHomeLocationAsync(cancellationToken);
        home.Latitude = null;
        home.Longitude = null;
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
