namespace Services.Responses.Media;

/// <summary>One resumable batch of metadata extraction; failures remain retryable.</summary>
public sealed record ScanMediaLocationsResponse(
    int Scanned, int Located, IReadOnlyList<Guid> FailedMediaIds, int NextOffset, bool HasMore);
