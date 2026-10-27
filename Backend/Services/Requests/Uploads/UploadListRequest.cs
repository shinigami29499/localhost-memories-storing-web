namespace Services.Requests.Uploads;

public sealed class UploadListRequest
{
    public int Offset { get; set; }
    public int Limit { get; set; } = 20;
}
