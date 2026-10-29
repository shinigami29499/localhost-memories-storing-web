namespace Services.Core;

public static class UploadLimits
{
    public const int MaxTotalGigabytes = 8;
    public const long MaxTotalBytes = MaxTotalGigabytes * 1024L * 1024L * 1024L;
}
