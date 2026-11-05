using Services.Models.Collections;

namespace Services.Responses.Collections;

public sealed record CollectionPageResponse(
    IReadOnlyList<CollectionDto> Items,
    string? NextCursor,
    bool HasMore);
