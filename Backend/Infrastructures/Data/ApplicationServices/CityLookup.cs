using System.Collections.Concurrent;
using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Services.Models.Media;
using Services.Options;

namespace Infrastructures.Data.ApplicationServices;

public sealed class CityLookup(ILogger<CityLookup> logger, IOptions<CityLookupOptions> options) : IDisposable
{
    private const int FailureBackoffSeconds = 30;
    private readonly HttpClient _client = new()
    {
        BaseAddress = new Uri(options.Value.BaseUrl.TrimEnd('/') + "/"),
        Timeout = TimeSpan.FromSeconds(options.Value.TimeoutSeconds),
    };
    private readonly SemaphoreSlim _limit = new(1);
    private readonly ConcurrentDictionary<(double, double), string> _cities = new();
    private long _retryAfter;

    public async Task<string?> FindAsync(MediaLocationDto location, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var key = (location.Latitude, location.Longitude);
        if (_cities.TryGetValue(key, out var cached)) return cached;
        if (Environment.TickCount64 < Volatile.Read(ref _retryAfter)) return null;
        await _limit.WaitAsync(cancellationToken);
        try
        {
            if (_cities.TryGetValue(key, out cached)) return cached;
            if (Environment.TickCount64 < Volatile.Read(ref _retryAfter)) return null;
            var latitude = location.Latitude.ToString("R", CultureInfo.InvariantCulture);
            var longitude = location.Longitude.ToString("R", CultureInfo.InvariantCulture);
            using var response = await _client.GetAsync($"reverse?lat={latitude}&lon={longitude}&limit=1", cancellationToken);
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
        catch (Exception exception) when (
            !cancellationToken.IsCancellationRequested
            && exception is HttpRequestException or JsonException or OperationCanceledException)
        {
            Interlocked.Exchange(ref _retryAfter, Environment.TickCount64 + FailureBackoffSeconds * 1000L);
            logger.LogWarning(exception,
                "City lookup failed for {Provider}. Uncached lookups paused for {BackoffSeconds} seconds; city remains unset.",
                _client.BaseAddress, FailureBackoffSeconds);
            return null;
        }
        finally { _limit.Release(); }
    }

    public void Dispose()
    {
        _client.Dispose();
        _limit.Dispose();
    }
}
