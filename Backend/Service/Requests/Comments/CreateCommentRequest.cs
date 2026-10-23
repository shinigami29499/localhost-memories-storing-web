using System.ComponentModel.DataAnnotations;

namespace Service.Requests.Comments;

public record CreateCommentRequest(
    [Required, MinLength(1), MaxLength(4000)]
    string Content);
