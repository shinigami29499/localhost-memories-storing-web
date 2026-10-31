using Services.Core;
using Infrastructures.Data.Interfaces;
using Services.Exceptions;
using Services.Interfaces;
using Services.Responses.Auth;
using Domains.Entities;
using Domains.Enums;
using Services.Models.Users;
using Services.Requests.Users;
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

        return user.HomeLatitude is { } latitude && user.HomeLongitude is { } longitude
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

        if (request.ApplyToUnlocatedPhotos
            && user.HomeLatitude is not null && user.HomeLongitude is not null
            && (user.HomeLatitude != request.Latitude || user.HomeLongitude != request.Longitude))
            throw new ConflictException("Home changed. Refresh and confirm the current home location.");

        user.HomeLatitude = request.Latitude;
        user.HomeLongitude = request.Longitude;
        if (request.ApplyToUnlocatedPhotos)
        {
            await using var transaction = await _unitOfWork.BeginTransactionAsync(cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await mediaRepository.AssignHomeToUnlocatedPhotosAsync(
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

        user.HomeLatitude = null;
        user.HomeLongitude = null;
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
