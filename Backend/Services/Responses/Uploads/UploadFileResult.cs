using Services.Models.Uploads;

namespace Services.Responses.Uploads;

public sealed record UploadFileResult(UploadItemDto Item, Guid AlbumId, string AlbumName, bool IsPublic);
