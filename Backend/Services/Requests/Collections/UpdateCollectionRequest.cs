using System.ComponentModel.DataAnnotations;

namespace Services.Requests.Collections;

/// <summary>Replaces editable fields; a null preview restores the default preview.</summary>
public record UpdateCollectionRequest(
    [Required, MinLength(1), MaxLength(CreateCollectionRequest.MaxNameLength)]
    string Name,
    bool IsPublic,
    Guid? PreviewMediaId)
{
    [MaxLength(CreateCollectionRequest.MaxCaptionLength)]
    public string? Caption { get; init; }
}
