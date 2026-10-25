namespace Services.Requests.Posts;

public record FeedRequest
{
    public const int MaxLimit = 50;

    public int Offset { get; init; } = 0;
    public int Limit { get; init; } = 10;
}
