namespace Services.Models.Posts;

public sealed record UserPostReaction(Guid PostId, string ReactionType);
