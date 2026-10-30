using Domains.Entities;

namespace Services.Models.Food;

/// <summary>Food place row with its resolved owner and ordered active image ids, produced by persistence queries.</summary>
public sealed record FoodPlaceSource(FoodPlace Place, User Owner, IReadOnlyList<Guid> MediaIds);
