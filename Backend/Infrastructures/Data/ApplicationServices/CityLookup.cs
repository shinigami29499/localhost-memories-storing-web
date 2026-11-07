using System.Collections.Concurrent;
using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Services.Models.Media;

namespace Infrastructures.Data.ApplicationServices;

public sealed class CityLookup(ILogger<CityLookup> logger)
{
    private static readonly HttpClient Client = new() { Timeout = TimeSpan.FromSeconds(5) };
    private readonly SemaphoreSlim _limit = new(4);
    private readonly ConcurrentDictionary<(double, double), string> _cities = new();

    public async Task<string?> FindAsync(MediaLocationDto location, CancellationToken cancellationToken)
    {
        var key = (location.Latitude, location.Longitude);
        if (_cities.TryGetValue(key, out var cached)) return cached;
        await _limit.WaitAsync(cancellationToken);
        try
        {
            if (_cities.TryGetValue(key, out cached)) return cached;
            var latitude = location.Latitude.ToString("R", CultureInfo.InvariantCulture);
            var longitude = location.Longitude.ToString("R", CultureInfo.InvariantCulture);
            using var response = await Client.GetAsync($"https://photon.komoot.io/reverse?lat={latitude}&lon={longitude}&limit=1", cancellationToken);
            response.EnsureSuccessStatusCode();
            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var json = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            if (json.RootElement.ValueKind != JsonValueKind.Object || !json.RootElement.TryGetProperty("features", out var features) || features.ValueKind != JsonValueKind.Array || features.GetArrayLength() == 0
                || features[0].ValueKind != JsonValueKind.Object || !features[0].TryGetProperty("properties", out var properties) || properties.ValueKind != JsonValueKind.Object) return null;
            string? city = properties.TryGetProperty("city", out var cityValue) && cityValue.ValueKind == JsonValueKind.String ? cityValue.GetString() : null;
            if (string.IsNullOrWhiteSpace(city) && properties.TryGetProperty("osm_value", out var kind) && kind.ValueKind == JsonValueKind.String
                && kind.GetString() is "city" or "town" or "village" && properties.TryGetProperty("name", out var name) && name.ValueKind == JsonValueKind.String)
                city = name.GetString();
            if (string.IsNullOrWhiteSpace(city) || city.Length > 200) return null;
            city = city.Trim();
            _cities.TryAdd(key, city);
            return city;
        }
        catch (Exception exception) when (exception is HttpRequestException or JsonException or TaskCanceledException && !cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning("City lookup failed: {Error}", exception.Message);
            return null;
        }
        finally { _limit.Release(); }
    }
}
