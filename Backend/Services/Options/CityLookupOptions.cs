namespace Services.Options;

public sealed class CityLookupOptions
{
    public const string SectionName = "CityLookup";

    public string BaseUrl { get; set; } = "https://photon.komoot.io/";
    public int TimeoutSeconds { get; set; } = 5;
}
