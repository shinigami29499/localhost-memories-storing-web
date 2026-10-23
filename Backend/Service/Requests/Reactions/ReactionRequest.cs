using System.ComponentModel.DataAnnotations;

namespace Service.Requests.Reactions;

public record ReactionRequest(
    [Required, MaxLength(50), RegularExpression(
        @"^[a-z0-9_\-]+$",
        ErrorMessage = "Reaction type must be a short lowercase slug, e.g. 'like'.")]
    string ReactionType);
