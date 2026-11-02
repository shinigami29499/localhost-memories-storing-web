using System.ComponentModel.DataAnnotations;

namespace Services.Requests.Media;

public sealed record SetMediaFavoritesRequest(
    [Required, MinLength(1), MaxLength(500)] IReadOnlyList<Guid> MediaIds,
    bool IsFavorite);
