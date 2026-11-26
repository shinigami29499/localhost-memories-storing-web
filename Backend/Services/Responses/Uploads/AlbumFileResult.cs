namespace Services.Responses.Uploads;

public sealed record AlbumFileResult(
    Guid MediaId, Guid AlbumId, string AlbumName, Guid AlbumOwnerId, bool IsPublic, bool Created);
