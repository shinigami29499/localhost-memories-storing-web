using Domain.Entities;
using Infrastructure.Storage;
using Service.Models.Posts;

namespace Service.Mappings;

internal static class PostMappings
{
    internal static MediaFile ToMedia(StoredFile stored, Guid postId, string originalFilename) => new()
    {
        PostId = postId,
        OriginalFilename = Path.GetFileName(originalFilename),
        StoredFilename = stored.StoredFilename,
        RelativePath = stored.RelativePath,
        MimeType = stored.MimeType,
        FileExtension = stored.FileExtension,
        MediaKind = stored.MediaKind,
        FileSizeBytes = stored.SizeBytes,
    };

    internal static PostSummaryDto ToDto(
        Post post,
        long commentCount,
        IReadOnlyList<ReactionCountDto> reactionCounts,
        IReadOnlyList<string> myReactions) => new(
        post.Id,
        post.Caption,
        post.CreatedAt,
        post.UpdatedAt,
        new UserSummaryDto(post.User.Id, post.User.Username),
        post.MediaFiles
            .OrderBy(m => m.CreatedAt)
            .Select(m => new MediaFileDto(
                m.Id, m.MediaKind, m.MimeType, m.OriginalFilename, m.FileSizeBytes, m.RelativePath))
            .ToList(),
        commentCount,
        reactionCounts,
        myReactions);
}
