namespace Services.Core;

public static class PostUploadLimits
{
    public const int MaxTotalGigabytes = 20;
    public const long MaxTotalBytes = MaxTotalGigabytes * 1024L * 1024 * 1024;
}
