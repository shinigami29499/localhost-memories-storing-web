using Services.Models.Media;

namespace Services.Interfaces;

public interface IMediaStorage
{
    Task<StoredFile> SaveAsync(
        Stream content, string originalFilename, long? sizeHint, CancellationToken cancellationToken = default);
    Task<string> MoveToTrashAsync(string relativePath, CancellationToken cancellationToken = default);
    Task<string?> MoveToPurgeAsync(
        string trashRelativePath, Guid mediaId, CancellationToken cancellationToken = default);
    Task RestoreFromTrashAsync(
        string trashRelativePath, string targetRelativePath, CancellationToken cancellationToken = default);
    Task DeleteAsync(string relativePath, CancellationToken cancellationToken = default);
    Task<bool> ExistsAsync(string relativePath);
    Task<FileStream> OpenAsync(string relativePath);
    Task<FileStream> OpenPreviewAsync(string relativePath, CancellationToken cancellationToken = default);
}
