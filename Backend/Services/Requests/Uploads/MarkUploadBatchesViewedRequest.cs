namespace Services.Requests.Uploads;

public sealed record MarkUploadBatchesViewedRequest(IReadOnlyCollection<Guid>? BatchIds);
