namespace Infrastructures.Adapters.Storage;

public class MediaStorageOptions
{
    public const string SectionName = "MediaStorage";

    /// <summary>Absolute root containing media and trash.</summary>
    public string Root { get; set; } = string.Empty;

    public int MaxFileMegabytes { get; set; } = 100;

    public string FFmpegPath { get; set; } = "ffmpeg";

    /// <summary>Lowercase extensions including dots.</summary>
    public IReadOnlyList<string> ImageExtensions { get; set; } =
        [".jpg", ".jpeg", ".png", ".gif", ".webp"];

    public IReadOnlyList<string> VideoExtensions { get; set; } =
        [".mp4", ".webm", ".mov", ".m4v", ".avi", ".mkv"];
}
