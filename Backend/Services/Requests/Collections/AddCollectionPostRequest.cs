using System.ComponentModel.DataAnnotations;

namespace Services.Requests.Collections;

public record AddCollectionPostRequest([Required] Guid PostId);
