namespace Services.Requests.Collections;

public record CollectionListRequest
{
    public const string MineScope = "mine";
    public const string PublicScope = "public";

    /// <summary>"mine" (default) or "public" for other users' public collections.</summary>
    public string Scope { get; init; } = MineScope;

    /// <summary>When set, each result reports whether it contains this media file.</summary>
    public Guid? MediaId { get; init; }
}
