using Services.Core;
using Infrastructures.Data.Interfaces;
using Services.Exceptions;
using Services.Interfaces;
using Services.Responses.Auth;
using Domains.Entities;
using Domains.Enums;
using Services.Models.Users;

namespace Infrastructures.Data.ApplicationServices;

public class UserService(IUserRepository repository, IUnitOfWork unitOfWork, IMapper mapper) : IUserService
{
    private const int MentionCandidateLimit = 8;
    private readonly IUserRepository _repository = repository;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;

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
}
