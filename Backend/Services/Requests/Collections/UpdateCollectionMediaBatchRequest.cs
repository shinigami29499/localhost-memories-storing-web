using System.ComponentModel.DataAnnotations;

namespace Services.Requests.Collections;

public sealed record UpdateCollectionMediaBatchRequest(
    [Required, MinLength(1), MaxLength(500)] IReadOnlyList<Guid> MediaIds);
