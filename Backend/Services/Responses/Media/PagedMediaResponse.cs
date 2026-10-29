namespace Services.Responses.Media;

public sealed record PagedMediaResponse<T>(
    int Offset,
    int Limit,
    long Total,
    IReadOnlyList<T> Items);
