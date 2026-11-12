using Domains.Entities;

namespace Services.Models.Place;

/// <summary>Place row with its resolved owner and ordered active image ids, produced by persistence queries.</summary>
public sealed record PlaceSource(
    Domains.Entities.Place Place,
    User Owner,
    IReadOnlyList<Guid> MediaIds,
    double AverageRating,
    DateTime? LastCheckInAt);
