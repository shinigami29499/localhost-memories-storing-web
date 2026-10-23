using Infrastructure.Storage;

namespace Infrastructure.Interfaces;

public interface IMediaStorageService
{
    Task<StoredFile> SaveAsync(
        Stream content, string originalFilename, long? sizeHint, CancellationToken cancellationToken = default);
    Task<string> MoveToTrashAsync(string relativePath, CancellationToken cancellationToken = default);
    Task RestoreFromTrashAsync(
        string trashRelativePath, string targetRelativePath, CancellationToken cancellationToken = default);
    /// <summary>Physically removes a file from media or trash storage.</summary>
    Task DeleteAsync(string relativePath, CancellationToken cancellationToken = default);
    Task<bool> ExistsAsync(string relativePath);
    Task<FileStream> OpenAsync(string relativePath);
    string ResolveAbsolute(string relativePath);
}
