using Services.Models.Uploads;

namespace Services.Responses.Uploads;

public sealed record PagedUploadBatchesResponse(
    int Offset,
    int Limit,
    int TotalItems,
    IReadOnlyList<UploadBatchDto> Items);
