namespace Services.Requests.Collections;

public record CollectionListRequest
{
    public const string MineScope = "mine";
    public const string PublicScope = "public";
    public const string FeedScope = "feed";
    public const string AdminScope = "all";

    /// <summary>"mine" (default), "public" for shared collections, or admin-only "all".</summary>
    public string Scope { get; init; } = MineScope;

    /// <summary>When set, each result reports whether it contains this media file.</summary>
    public Guid? MediaId { get; init; }
}
