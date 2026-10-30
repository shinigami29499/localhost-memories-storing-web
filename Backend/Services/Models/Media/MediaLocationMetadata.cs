using System.Text.Json;
using System.Text.Json.Nodes;

namespace Services.Models.Media;

public static class MediaLocationMetadata
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static MediaLocationDto? Read(string? metadata)
        => Parse(metadata)["location"]?.Deserialize<MediaLocationDto>(JsonOptions);

    public static string Write(string? metadata, MediaLocationDto? location)
    {
        var document = Parse(metadata);
        document["location"] = JsonSerializer.SerializeToNode(location, JsonOptions);
        document["locationScanned"] = true;
        return document.ToJsonString();
    }

    private static JsonObject Parse(string? metadata)
        => metadata is null ? new JsonObject() : JsonNode.Parse(metadata) as JsonObject
            ?? throw new InvalidOperationException("Media metadata must be a JSON object.");
}
