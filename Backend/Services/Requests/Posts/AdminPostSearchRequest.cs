using System.ComponentModel.DataAnnotations;

namespace Services.Requests.Posts;

public sealed class AdminPostSearchRequest : IValidatableObject
{
    [StringLength(100)]
    public string? Username { get; init; }

    [StringLength(500)]
    public string? Caption { get; init; }

    public DateTimeOffset? CreatedFrom { get; init; }

    public DateTimeOffset? CreatedBefore { get; init; }

    [RegularExpression("^(active|deleted)$")]
    public string? Status { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (CreatedFrom.HasValue && CreatedBefore.HasValue && CreatedFrom.Value >= CreatedBefore.Value)
        {
            yield return new ValidationResult(
                "The created-from date must be earlier than the created-before date.",
                [nameof(CreatedFrom), nameof(CreatedBefore)]);
        }
    }
}
