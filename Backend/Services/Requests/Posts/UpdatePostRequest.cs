using System.ComponentModel.DataAnnotations;

namespace Services.Requests.Posts;

public record UpdatePostRequest(
    [Required, MinLength(1), MaxLength(4000)]
    string Caption);
