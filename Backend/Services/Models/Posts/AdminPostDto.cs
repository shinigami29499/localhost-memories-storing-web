namespace Services.Models.Posts;

/// <summary>Admin view of a post covering both active and soft-deleted records.</summary>
public record AdminPostDto(
    Guid Id,
    string Caption,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    DateTime? DeletedAt,
    UserSummaryDto Author,
    UserSummaryDto? DeletedBy,
    int MediaCount,
    long CommentCount,
    IReadOnlyList<AdminPostMediaDto> Media);
