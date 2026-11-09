using Services.Models.Uploads;

namespace Services.Responses.Uploads;

public sealed record PagedUploadBatchesResponse(
    int TotalItems,
    IReadOnlyList<UploadBatchDto> Items);
