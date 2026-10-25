using Domains.Entities;
using Services.Models.Media;
using Services.Models.Posts;

namespace Services.Mappings;

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

    internal static AdminPostDto ToAdminDto(AdminPostSource source) => new(
        source.Post.Id,
        source.Post.Caption,
        source.Post.CreatedAt,
        source.Post.UpdatedAt,
        source.Post.DeletedAt,
        new UserSummaryDto(source.Post.User.Id, source.Post.User.Username),
        source.DeletedBy is null ? null : new UserSummaryDto(source.DeletedBy.Id, source.DeletedBy.Username),
        source.MediaCount,
        source.CommentCount,
        source.Post.MediaFiles
            .OrderBy(m => m.CreatedAt)
            .Select(m => new AdminPostMediaDto(m.Id, m.MediaKind, m.MimeType))
            .ToList());

    internal static DeletedPostDto ToDeletedDto(
        Post post,
        User? deletedBy,
        int mediaCount,
        long commentCount) => new(
        post.Id,
        post.Caption,
        post.CreatedAt,
        post.UpdatedAt,
        post.DeletedAt!.Value,
        new UserSummaryDto(post.User.Id, post.User.Username),
        deletedBy is null ? null : new UserSummaryDto(deletedBy.Id, deletedBy.Username),
        mediaCount,
        commentCount);
}
