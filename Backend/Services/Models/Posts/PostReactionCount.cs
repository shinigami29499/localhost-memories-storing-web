namespace Services.Models.Posts;

public sealed record PostReactionCount(Guid PostId, string ReactionType, long Count);
