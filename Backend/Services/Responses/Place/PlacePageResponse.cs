namespace Services.Responses.Place;

public sealed record PlacePageResponse<T>(IReadOnlyList<T> Items, int Page, int Limit, int Total);
