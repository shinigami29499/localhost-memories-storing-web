using System.ComponentModel.DataAnnotations;

namespace Services.Requests.Collections;

public record CreateCollectionRequest(
    [Required, MinLength(1), MaxLength(CreateCollectionRequest.MaxNameLength)]
    string Name,
    bool IsPublic = false)
{
    public const int MaxNameLength = 100;
}
