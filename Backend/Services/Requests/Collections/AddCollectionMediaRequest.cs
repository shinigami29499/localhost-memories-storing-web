using System.ComponentModel.DataAnnotations;

namespace Services.Requests.Collections;

public record AddCollectionMediaRequest([Required] Guid MediaId);
