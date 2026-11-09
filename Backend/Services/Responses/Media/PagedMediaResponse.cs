namespace Services.Responses.Media;

public sealed record PagedMediaResponse<T>(
    int Offset,
    long Total,
    IReadOnlyList<T> Items);
