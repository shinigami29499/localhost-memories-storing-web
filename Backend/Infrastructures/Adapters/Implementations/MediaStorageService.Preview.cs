using System.ComponentModel;
using System.Diagnostics;

namespace Infrastructures.Adapters.Implementations;

public sealed partial class MediaStorageService
{
    // The storage service is a singleton: bound decoder CPU and coalesce concurrent cache misses.
    private readonly SemaphoreSlim _previewGate = new(1, 1);

    private string PreviewRelativePath(string relativePath)
    {
        var (kind, filename) = ValidateOwnedPath(relativePath);
        return $"previews/v1/{kind}/{filename}.jpg";
    }

    public async Task<FileStream> OpenPreviewAsync(
        string relativePath, CancellationToken cancellationToken = default)
    {
        var source = ResolveAbsolute(relativePath);
        var destination = ResolveAbsolute(PreviewRelativePath(relativePath));
        await _previewGate.WaitAsync(cancellationToken);
        try
        {
            if (!File.Exists(source))
                throw new FileNotFoundException("The preview source is missing on disk.", source);

            if (!File.Exists(destination))
            {
                Directory.CreateDirectory(Path.GetDirectoryName(destination)!);
                await GeneratePreviewAsync(source, destination, cancellationToken);
            }

            return new FileStream(
                destination, FileMode.Open, FileAccess.Read, FileShare.Read | FileShare.Delete,
                bufferSize: 1 << 16, options: FileOptions.Asynchronous | FileOptions.SequentialScan);
        }
        finally
        {
            _previewGate.Release();
        }
    }

    private async Task GeneratePreviewAsync(
        string source, string destination, CancellationToken cancellationToken)
    {
        var temporary = $"{destination}.{Guid.NewGuid():N}.tmp.jpg";
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(30));
        using var process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = _options.FFmpegPath,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardError = true,
            },
        };
        string[] arguments =
        [
            "-nostdin", "-hide_banner", "-loglevel", "error",
            "-threads", "1", "-filter_threads", "1", "-protocol_whitelist", "file,pipe",
            "-format_whitelist", "image2,jpeg_pipe,png_pipe,gif,webp_pipe,mov,matroska,webm,avi,m4v",
            "-i", source, "-map", "0:v:0", "-frames:v", "1",
            "-vf", "scale=w='min(640,iw)':h='min(640,ih)':force_original_aspect_ratio=decrease",
            "-threads", "1", "-q:v", "5", "-update", "1", "-f", "image2", temporary,
        ];
        foreach (var argument in arguments)
            process.StartInfo.ArgumentList.Add(argument);

        try
        {
            process.Start();
        }
        catch (Win32Exception exception)
        {
            throw new IOException(
                "Media previews require FFmpeg. Install it on PATH or configure MediaStorage:FFmpegPath.", exception);
        }

        try
        {
            var errorTask = process.StandardError.ReadToEndAsync(timeout.Token);
            await process.WaitForExitAsync(timeout.Token);
            var error = await errorTask;
            if (process.ExitCode != 0 || !File.Exists(temporary) || new FileInfo(temporary).Length == 0)
                throw new IOException($"FFmpeg could not generate a media preview: {error.Trim()}");

            File.Move(temporary, destination, overwrite: true);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new TimeoutException("FFmpeg media preview generation exceeded 30 seconds.");
        }
        finally
        {
            if (!process.HasExited)
            {
                process.Kill(entireProcessTree: true);
                await process.WaitForExitAsync(CancellationToken.None);
            }
            TryDeleteQuietly(temporary);
        }
    }
}
