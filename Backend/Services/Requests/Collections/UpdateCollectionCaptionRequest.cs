using System.ComponentModel.DataAnnotations;

namespace Services.Requests.Collections;

public record UpdateCollectionCaptionRequest(
    [Required, MaxLength(CreateCollectionRequest.MaxCaptionLength)]
    string Caption);
