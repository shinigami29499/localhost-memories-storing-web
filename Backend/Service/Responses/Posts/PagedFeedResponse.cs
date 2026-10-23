namespace Service.Responses.Posts;

public record PagedFeedResponse<T>(int Offset, int Limit, long Total, IReadOnlyList<T> Items);
