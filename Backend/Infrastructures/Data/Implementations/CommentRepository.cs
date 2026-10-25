using Microsoft.EntityFrameworkCore;
using Domains.Entities;
using Infrastructures.Data.Interfaces;

namespace Infrastructures.Data.Implementations;

public sealed class CommentRepository(ApplicationDbContext db) : ICommentRepository
{
    public async Task<IReadOnlyList<Comment>> GetPageWithAuthorsAsync(
        Guid postId, int offset, int limit, CancellationToken cancellationToken = default)
        => await db.Comments.AsNoTracking()
            .Include(c => c.User)
            .Where(c => c.PostId == postId)
            .OrderBy(c => c.CreatedAt)
            .ThenBy(c => c.Id)
            .Skip(offset)
            .Take(limit)
            .ToListAsync(cancellationToken);

    public Task<bool> PostExistsAsync(Guid postId, CancellationToken cancellationToken = default)
        => db.Posts.AnyAsync(p => p.Id == postId, cancellationToken);

    public Task<User?> FindUserAsync(Guid userId, CancellationToken cancellationToken = default)
        => db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

    public Task<Comment?> FindCommentAsync(
        Guid commentId, bool includeDeleted, CancellationToken cancellationToken = default)
    {
        var query = db.Comments.AsQueryable();
        if (includeDeleted)
            query = query.IgnoreQueryFilters();
        return query.FirstOrDefaultAsync(c => c.Id == commentId, cancellationToken);
    }

    public Task<Comment?> FindCommentWithAuthorAsync(Guid commentId, CancellationToken cancellationToken = default)
        => db.Comments.AsNoTracking()
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Id == commentId, cancellationToken);

    public void AddComment(Comment comment) => db.Comments.Add(comment);
}
