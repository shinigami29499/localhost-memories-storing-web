using Microsoft.EntityFrameworkCore;
using Domains.Entities;
using Infrastructures.Adapters.Storage;
using Infrastructures.Data.Interfaces;
using Services.Models.Place;

namespace Infrastructures.Data.Implementations;

public sealed class PlaceRepository(ApplicationDbContext db) : IPlaceRepository
{
    public async Task<IReadOnlyList<PlaceSource>> GetPlacesAsync(
        CancellationToken cancellationToken = default)
        => await Project(db.Places.AsNoTracking()
                .OrderByDescending(place => place.CreatedAt)
                .ThenByDescending(place => place.Id))
            .ToListAsync(cancellationToken);

    public Task<PlaceSource?> GetPlaceSourceAsync(
        Guid placeId, CancellationToken cancellationToken = default)
        => Project(db.Places.AsNoTracking().Where(place => place.Id == placeId))
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<PlaceVisitSource>> GetPlaceVisitHistoryAsync(
        Guid userId, CancellationToken cancellationToken = default)
    {
        var visits = db.PlaceVisits.IgnoreQueryFilters()
            .Where(visit => visit.UserId == userId && visit.DeletedAt == null);
        var places = db.Places.IgnoreQueryFilters();
        var users = db.Users.IgnoreQueryFilters();

        return await (
            from visit in visits
            join place in places on visit.PlaceId equals place.Id
            join user in users on visit.UserId equals user.Id
            orderby visit.CreatedAt descending, visit.Id descending
            select new PlaceVisitSource(
                visit.Id,
                visit.PlaceId,
                place.Name,
                place.Address,
                place.MarkerIcon,
                visit.CreatedAt,
                user.Id,
                user.Username,
                user.AvatarSeed))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<PlaceVisitSource>> GetAllPlaceVisitHistoryAsync(
        CancellationToken cancellationToken = default)
    {
        var visits = db.PlaceVisits.AsNoTracking()
            .Where(visit => visit.DeletedAt == null);

        return await (
            from visit in visits
            join place in db.Places.IgnoreQueryFilters() on visit.PlaceId equals place.Id
            join user in db.Users.IgnoreQueryFilters() on visit.UserId equals user.Id
            orderby visit.CreatedAt descending, visit.Id descending
            select new PlaceVisitSource(
                visit.Id,
                visit.PlaceId,
                place.Name,
                place.Address,
                place.MarkerIcon,
                visit.CreatedAt,
                user.Id,
                user.Username,
                user.AvatarSeed))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<PlaceVisitSource>> GetPlaceVisitHistoryForPlaceAsync(
        Guid placeId, CancellationToken cancellationToken = default)
    {
        var visits = db.PlaceVisits.AsNoTracking()
            .Where(visit => visit.PlaceId == placeId && visit.DeletedAt == null);

        return await (
            from visit in visits
            join place in db.Places.IgnoreQueryFilters() on visit.PlaceId equals place.Id
            join user in db.Users.IgnoreQueryFilters() on visit.UserId equals user.Id
            orderby visit.CreatedAt descending, visit.Id descending
            select new PlaceVisitSource(
                visit.Id,
                visit.PlaceId,
                place.Name,
                place.Address,
                place.MarkerIcon,
                visit.CreatedAt,
                user.Id,
                user.Username,
                user.AvatarSeed))
            .ToListAsync(cancellationToken);
    }

    public Task<Place?> FindPlaceAsync(Guid placeId, CancellationToken cancellationToken = default)
        => db.Places.FirstOrDefaultAsync(place => place.Id == placeId, cancellationToken);

    public Task<PlaceVisit?> FindPlaceVisitAsync(Guid visitId, CancellationToken cancellationToken = default)
        => db.PlaceVisits.FirstOrDefaultAsync(visit => visit.Id == visitId, cancellationToken);

    public void AddPlace(Place place) => db.Places.Add(place);

    public void AddPlaceVisit(PlaceVisit visit) => db.PlaceVisits.Add(visit);

    public async Task<IReadOnlySet<Guid>> GetActiveImageIdsAsync(
        IReadOnlyCollection<Guid> mediaIds, CancellationToken cancellationToken = default)
    {
        if (mediaIds.Count == 0) return new HashSet<Guid>();
        var ids = await db.MediaFiles.AsNoTracking()
            .Where(media => mediaIds.Contains(media.Id) && media.MediaKind == MediaKinds.Image)
            .Select(media => media.Id)
            .ToListAsync(cancellationToken);
        return ids.ToHashSet();
    }

    public Task<List<PlaceMedia>> GetPlaceMediaAsync(
        Guid placeId, CancellationToken cancellationToken = default)
        => db.PlaceMedia.Where(item => item.PlaceId == placeId).ToListAsync(cancellationToken);

    public void AddPlaceMedia(PlaceMedia item) => db.PlaceMedia.Add(item);

    // The MediaFile query filter drops links whose image was deleted or trashed.
    private static IQueryable<PlaceSource> Project(IQueryable<Place> places)
        => places.Select(place => new PlaceSource(
            place,
            place.Owner,
            place.MediaItems
                .Where(item => item.MediaFile.MediaKind == MediaKinds.Image)
                .OrderBy(item => item.Position)
                .ThenBy(item => item.CreatedAt)
                .Select(item => item.MediaFileId)
                .ToList()));
}
