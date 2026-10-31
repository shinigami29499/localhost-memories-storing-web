namespace Services.Requests.Users;

public sealed record SetHomeLocationRequest(
    double Latitude, double Longitude, bool ApplyToUnlocatedPhotos = false);
