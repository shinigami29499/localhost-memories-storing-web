using Domain.Entities;

namespace Service.Interfaces;

public interface ITokenService
{
    (string Token, DateTime ExpiresAtUtc) CreateAccessToken(User user);
    (string RawToken, string TokenHash) CreateRefreshToken();
    string HashRefreshToken(string rawToken);
}
