namespace Services.Requests.Media;

public sealed record MediaPageRequest
{
    public const int MaxLimit = 100;

    public int Offset { get; init; }
    public int Limit { get; init; } = 20;
    public string? MediaKind { get; init; }
}
