namespace Services.Requests.Collections;

public record CollectionPageRequest : CollectionListRequest
{
    public int Limit { get; init; } = 30;
    public string? Cursor { get; init; }
    public string? Search { get; init; }
}
