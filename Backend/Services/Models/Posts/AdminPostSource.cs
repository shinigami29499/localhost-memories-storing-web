using Domains.Entities;

namespace Services.Models.Posts;

/// <summary>Aggregate inputs for mapping an admin post row; the deletions and counts live outside the post entity.</summary>
public record AdminPostSource(
    Post Post,
    User? DeletedBy,
    int MediaCount,
    long CommentCount);
