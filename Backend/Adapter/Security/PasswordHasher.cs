using System.Security.Cryptography;

namespace ShinigaCim.Infrastructure.Security;

/// <summary>
/// Hashes passwords with PBKDF2 (HMAC-SHA256). Plaintext passwords are never stored.
/// Token format: pbkdf2-sha256.{iterations}.{base64 salt}.{base64 subkey} — self-describing
/// so the iteration count can be raised later without breaking existing hashes.
/// </summary>
public interface IPasswordHasher
{
    string Hash(string password);

    bool Verify(string password, string storedHash);
}

public sealed class PasswordHasher : IPasswordHasher
{
    // 210k was the 2023 OWASP recommendation for PBKDF2-SHA256; fine for local dev.
    private const int Iterations = 210_000;
    private const int SaltSize = 16;
    private const int SubkeySize = 32;
    private const string Marker = "pbkdf2-sha256";

    public string Hash(string password)
    {
        var salt = new byte[SaltSize];
        RandomNumberGenerator.Fill(salt);

        var subkey = Rfc2898DeriveBytes.Pbkdf2(
            password, salt, Iterations, HashAlgorithmName.SHA256, SubkeySize);

        return $"{Marker}.{Iterations}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(subkey)}";
    }

    public bool Verify(string password, string storedHash)
    {
        if (string.IsNullOrWhiteSpace(storedHash))
            return false;

        var parts = storedHash.Split('.');
        if (parts.Length != 4 || parts[0] != Marker || !int.TryParse(parts[1], out var iterations))
            return false;

        if (iterations < 1)
            return false;

        if (!TryDecode(parts[2], out var salt) || !TryDecode(parts[3], out var expected))
            return false;

        var actual = Rfc2898DeriveBytes.Pbkdf2(
            password, salt, iterations, HashAlgorithmName.SHA256, expected.Length);

        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }

    private static bool TryDecode(string base64, out byte[] value)
    {
        try
        {
            value = Convert.FromBase64String(base64);
            return value.Length > 0;
        }
        catch (FormatException)
        {
            value = [];
            return false;
        }
    }
}
