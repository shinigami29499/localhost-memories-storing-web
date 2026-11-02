namespace Services.Responses.Media;

public sealed record MediaChange(Guid Id, DateTime? UpdatedAt, bool IsDeleted);
public sealed record MediaChangesResponse(DateTime CheckedAt, IReadOnlyList<MediaChange> Changes);
