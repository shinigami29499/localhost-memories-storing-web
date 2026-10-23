using Microsoft.Extensions.Logging;
using Infrastructure.Exceptions;
using Infrastructure.Interfaces;
using Infrastructure.Storage;

namespace Infrastructure.Implementations;

/// <summary>Filesystem operations only; callers coordinate database changes.</summary>
public sealed class MediaStorageService(
    MediaStorageOptions options,
    ILogger<MediaStorageService> logger) : IMediaStorageService
{
    private readonly MediaStorageOptions _options = ValidateOptions(options);
    private readonly ILogger<MediaStorageService> _logger = logger;

    private const string MediaSubdirectory = "media";
    private const string TrashSubdirectory = "trash";

    private static MediaStorageOptions ValidateOptions(MediaStorageOptions options)
    {
        if (string.IsNullOrWhiteSpace(options.Root))
            throw new InvalidOperationException(
                $"Media storage root is not configured ({MediaStorageOptions.SectionName}:{nameof(MediaStorageOptions.Root)}).");

        return options;
    }

    public async Task<StoredFile> SaveAsync(
        Stream content,
        string originalFilename,
        long? sizeHint,
        CancellationToken cancellationToken = default)
    {
        List<string> allowed = [.. _options.ImageExtensions, .. _options.VideoExtensions];

        var extension = NormalizeExtension(originalFilename);
        if (extension is null || !allowed.Contains(extension))
            throw new InvalidMediaFileException(
                $"File type '{extension ?? "(none)"}' is not allowed. Allowed: {string.Join(", ", allowed)}");

        var maxBytes = _options.MaxFileMegabytes * 1024L * 1024L;
        if ((sizeHint ?? content.Length) > maxBytes)
            throw new InvalidMediaFileException($"File exceeds the {_options.MaxFileMegabytes} MB upload limit.");

        var kind = ClassifyKind(extension)
            ?? throw new InvalidMediaFileException($"File type '{extension}' is not mapped to a media kind.");

        var storedFilename = $"{Guid.NewGuid():N}{extension}";
        var relativePath = $"{MediaSubdirectory}/{kind}/{storedFilename}";

        var destination = ResolveAbsolute(relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(destination)!);

        try
        {
            await using var target = new FileStream(
                destination, FileMode.CreateNew, FileAccess.Write, FileShare.None, bufferSize: 1 << 16);

            long written = 0;
            var buffer = new byte[1 << 16];
            int read;
            while ((read = await content.ReadAsync(buffer, cancellationToken)) > 0)
            {
                written += read;
                if (written > maxBytes)
                    throw new InvalidMediaFileException(
                        $"File exceeds the {_options.MaxFileMegabytes} MB upload limit.");
                await target.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
            }

            _logger.LogInformation(
                "Stored media file {StoredFilename} ({Bytes} bytes, kind {Kind})",
                storedFilename, written, kind);

            return new StoredFile(
                storedFilename, relativePath, MimeTypeFor(kind, extension), extension, kind, written);
        }
        catch
        {
            // Partial uploads have no persisted media record.
            TryDeleteQuietly(destination, relativePath);
            throw;
        }
    }

    public async Task<string> MoveToTrashAsync(string relativePath, CancellationToken cancellationToken = default)
    {
        var (kind, filename) = ValidateOwnedPath(relativePath);

        var source = ResolveAbsolute(relativePath);
        if (!File.Exists(source))
            throw new FileNotFoundException("Media file is missing on disk; cannot move it to trash.", source);

        var trashRelative = $"{TrashSubdirectory}/{kind}/{filename}";
        var destination = ResolveAbsolute(trashRelative);
        Directory.CreateDirectory(Path.GetDirectoryName(destination)!);

        if (File.Exists(destination))
            throw new InvalidOperationException(
                $"Trash collision for '{trashRelative}'. Refusing to overwrite an existing trashed file.");

        await CopyWithRetryAsync(source, destination, cancellationToken, _logger);

        // Verify the copy before deleting the source.
        var destinationLength = new FileInfo(destination).Length;
        if (destinationLength != new FileInfo(source).Length)
        {
            TryDeleteQuietly(destination, trashRelative);
            throw new IOException(
            $"Trash copy of '{relativePath}' is incomplete ({destinationLength} bytes). Source left untouched.");
        }

        File.Delete(source);

        _logger.LogInformation("Moved media file {RelativePath} to trash as {TrashRelativePath}",
            relativePath, trashRelative);
        return trashRelative;
    }

    public async Task RestoreFromTrashAsync(
        string trashRelativePath, string targetRelativePath, CancellationToken cancellationToken = default)
    {
        var source = ResolveAbsolute(trashRelativePath);
        var destination = ResolveAbsolute(targetRelativePath);

        if (!File.Exists(source))
            throw new FileNotFoundException(
                $"Trashed file '{trashRelativePath}' is missing on disk and cannot be restored.");

        if (File.Exists(destination))
            throw new InvalidOperationException(
                $"Restore target '{targetRelativePath}' already exists. A safe conflict resolution is required.");

        Directory.CreateDirectory(Path.GetDirectoryName(destination)!);
        await CopyWithRetryAsync(source, destination, cancellationToken, _logger);

        if (new FileInfo(destination).Length != new FileInfo(source).Length)
        {
            TryDeleteQuietly(destination, targetRelativePath);
            throw new IOException($"Failed to restore '{trashRelativePath}' to '{targetRelativePath}'.");
        }

        File.Delete(source);
        _logger.LogInformation("Restored media file {TrashRelativePath} -> {TargetRelativePath}",
            trashRelativePath, targetRelativePath);
    }

    public Task DeleteAsync(string relativePath, CancellationToken cancellationToken = default)
    {
        // Missing files are tolerated so permanent deletion stays idempotent.
        ValidateOwnedPath(relativePath);
        var absolute = ResolveAbsolute(relativePath);
        if (!File.Exists(absolute))
        {
            _logger.LogWarning("Storage file '{RelativePath}' is already gone", relativePath);
            return Task.CompletedTask;
        }

        File.Delete(absolute);
        _logger.LogInformation("Deleted storage file {RelativePath}", relativePath);
        return Task.CompletedTask;
    }

    public Task<bool> ExistsAsync(string relativePath)
        => Task.FromResult(File.Exists(ResolveAbsolute(relativePath)));

    public Task<FileStream> OpenAsync(string relativePath)
    {
        var absolute = ResolveAbsolute(relativePath);
        var stream = new FileStream(
            absolute, FileMode.Open, FileAccess.Read, FileShare.Read, bufferSize: 1 << 16,
            options: FileOptions.Asynchronous | FileOptions.SequentialScan);
        return Task.FromResult(stream);
    }

    public string ResolveAbsolute(string relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath))
            throw new InvalidMediaFileException("Empty storage path.");

        if (relativePath.Contains('\\') || relativePath.Contains(':') || relativePath.StartsWith('/'))
            throw new InvalidMediaFileException($"Unsafe storage path '{relativePath}'.");

        var root = Path.GetFullPath(_options.Root);
        // Resolve traversal before checking root containment.
        var combined = Path.GetFullPath(
            Path.Combine(root, relativePath.Replace('/', Path.DirectorySeparatorChar)));
        var rootPrefix = root.EndsWith(Path.DirectorySeparatorChar) ? root : root + Path.DirectorySeparatorChar;

        if (rootPrefix.Length > 0 && !combined.StartsWith(rootPrefix, StringComparison.OrdinalIgnoreCase))
            throw new InvalidMediaFileException($"Storage path '{relativePath}' escapes the storage root.");

        return combined;
    }

    /// <summary>Parses and validates "media|trash/&lt;kind&gt;/&lt;filename&gt;" owned by this service.</summary>
    private (string Kind, string Filename) ValidateOwnedPath(string relativePath)
    {
        var segments = relativePath.Split('/');
        if (segments.Length != 3
            || (segments[0] != MediaSubdirectory && segments[0] != TrashSubdirectory)
            || segments[1].Length == 0 || segments[2].Length == 0)
        {
            throw new InvalidMediaFileException(
                $"Storage path '{relativePath}' is not owned by the media storage layout.");
        }

        return (segments[1], segments[2]);
    }

    private static string? NormalizeExtension(string filename)
    {
        if (string.IsNullOrWhiteSpace(filename) || filename.Length > 260)
            return null;

        var extension = Path.GetExtension(filename).ToLowerInvariant();
        return extension.Length == 0 || extension.Length > 10 ? null : extension;
    }

    private static string? ClassifyKind(string extension) => extension switch
    {
        _ when KnownImageExtensions.Contains(extension) => MediaKinds.Image,
        _ when KnownVideoExtensions.Contains(extension) => MediaKinds.Video,
        _ => null,
    };

    private static string MimeTypeFor(string kind, string extension)
    {
        return (kind, extension) switch
        {
            (MediaKinds.Image, ".jpg" or ".jpeg") => "image/jpeg",
            (MediaKinds.Image, ".png") => "image/png",
            (MediaKinds.Image, ".gif") => "image/gif",
            (MediaKinds.Image, ".webp") => "image/webp",
            (MediaKinds.Video, ".mp4" or ".m4v") => "video/mp4",
            (MediaKinds.Video, ".webm") => "video/webm",
            (MediaKinds.Video, ".mov") => "video/quicktime",
            (MediaKinds.Video, ".avi") => "video/x-msvideo",
            (MediaKinds.Video, ".mkv") => "video/x-matroska",
            _ => "application/octet-stream",
        };
    }

    private static async Task CopyWithRetryAsync(
        string source, string destination, CancellationToken cancellationToken, ILogger logger, int maxAttempts = 3)
    {
        Exception? lastError = null;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                await using var sourceStream = new FileStream(
                    source, FileMode.Open, FileAccess.Read, FileShare.Read, bufferSize: 1 << 16,
                    options: FileOptions.Asynchronous);
                await using var targetStream = new FileStream(
                    destination, FileMode.CreateNew, FileAccess.Write, FileShare.None, bufferSize: 1 << 16,
                    options: FileOptions.Asynchronous);

                await sourceStream.CopyToAsync(targetStream, cancellationToken);
                await targetStream.FlushAsync(cancellationToken);
                return;
            }
            catch (IOException exception) when (attempt < maxAttempts)
            {
                lastError = exception;
                logger.LogWarning("Copy attempt {Attempt}/{Max} from '{Source}' to '{Destination}' failed; retrying",
                    attempt, maxAttempts, source, destination);
                TryDeleteFileQuietly(destination);
                await Task.Delay(TimeSpan.FromMilliseconds(200 * attempt), cancellationToken);
            }
        }

        throw new IOException(
            $"Move/copy from '{source}' to '{destination}' failed after {maxAttempts} attempts.", lastError);
    }

    private void TryDeleteQuietly(string absolutePath, string? forLog = null)
    {
        try
        {
            if (File.Exists(absolutePath))
                File.Delete(absolutePath);
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Could not clean up stray file '{Path}'", forLog ?? absolutePath);
        }
    }

    private static void TryDeleteFileQuietly(string absolutePath)
    {
        try
        {
            if (File.Exists(absolutePath))
                File.Delete(absolutePath);
        }
        catch
        {
            // Cleanup is best-effort; the exception of the original workflow propagates.
        }
    }

    private static readonly IReadOnlySet<string> KnownImageExtensions =
        new HashSet<string>([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
    private static readonly IReadOnlySet<string> KnownVideoExtensions =
        new HashSet<string>([".mp4", ".webm", ".mov", ".m4v", ".avi", ".mkv"]);
}
