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
        => await WithAverageRating(Project(db.Places.AsNoTracking()
                .OrderByDescending(place => place.CreatedAt)
                .ThenByDescending(place => place.Id)), cancellationToken);

    public async Task<(IReadOnlyList<PlaceSource> Items, int Total)> GetPlacesPageAsync(
        int page, int limit, string? search, int minimumRating, CancellationToken cancellationToken = default)
    {
        var places = db.Places.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var escaped = search.Trim().Replace("\\", "\\\\", StringComparison.Ordinal)
                .Replace("%", "\\%", StringComparison.Ordinal).Replace("_", "\\_", StringComparison.Ordinal);
            var pattern = $"%{escaped}%";
            places = places.Where(place => EF.Functions.ILike(place.Name, pattern, "\\")
                || EF.Functions.ILike(place.Owner.Username, pattern, "\\"));
        }
        if (minimumRating > 0)
            places = places.Where(place => (db.PlaceVisits
                .Where(visit => visit.PlaceId == place.Id && visit.Rating > 0)
                .Average(visit => (double?)visit.Rating) ?? 0) >= minimumRating - 0.05);
        var total = await places.CountAsync(cancellationToken);
        var items = await WithAverageRating(Project(places
            .OrderByDescending(place => place.CreatedAt).ThenByDescending(place => place.Id)
            .Skip((page - 1) * limit).Take(limit)), cancellationToken);
        return (items, total);
    }

    public async Task<IReadOnlyList<PlaceSource>> GetMapPlacesAsync(
        CancellationToken cancellationToken = default)
        => await WithAverageRating(db.Places.AsNoTracking()
            .OrderByDescending(place => place.CreatedAt)
            .ThenByDescending(place => place.Id)
            .Select(place => new PlaceSource(place, place.Owner, Array.Empty<Guid>(), 0, null)), cancellationToken);

    public async Task<(IReadOnlyList<PlaceSource> Items, int Total)> GetMapPlacesPageAsync(
        int page, int limit, PlaceMapBounds bounds, CancellationToken cancellationToken = default)
    {
        var places = db.Places.AsNoTracking()
            .Where(place => place.Latitude >= bounds.South && place.Latitude <= bounds.North);
        places = bounds.West <= bounds.East
            ? places.Where(place => place.Longitude >= bounds.West && place.Longitude <= bounds.East)
            : places.Where(place => place.Longitude >= bounds.West || place.Longitude <= bounds.East);
        var total = await places.CountAsync(cancellationToken);
        var items = await WithAverageRating(places.OrderByDescending(place => place.CreatedAt)
            .ThenByDescending(place => place.Id).Skip((page - 1) * limit).Take(limit)
            .Select(place => new PlaceSource(place, place.Owner, Array.Empty<Guid>(), 0, null)), cancellationToken);
        return (items, total);
    }

    public async Task<PlaceSource?> GetPlaceSourceAsync(
        Guid placeId, CancellationToken cancellationToken = default)
        => (await WithAverageRating(Project(db.Places.AsNoTracking().Where(place => place.Id == placeId)), cancellationToken))
            .FirstOrDefault();

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
                place.MarkerColor,
                visit.CreatedAt,
                user.Id,
                user.Username,
                user.AvatarSeed,
                visit.Note,
                visit.Rating,
                place.City))
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
                place.MarkerColor,
                visit.CreatedAt,
                user.Id,
                user.Username,
                user.AvatarSeed,
                visit.Note,
                visit.Rating,
                place.City))
            .ToListAsync(cancellationToken);
    }

    public async Task<(IReadOnlyList<PlaceVisitSource> Items, int Total)> GetVisitPageAsync(
        int page, int limit, Guid? userId, Guid? placeId, CancellationToken cancellationToken = default)
    {
        var visits = db.PlaceVisits.AsNoTracking().Where(visit => visit.DeletedAt == null);
        if (userId is { } ownerId) visits = visits.Where(visit => visit.UserId == ownerId);
        if (placeId is { } id) visits = visits.Where(visit => visit.PlaceId == id);
        var total = await visits.CountAsync(cancellationToken);
        var items = await (
            from visit in visits
            join place in db.Places.IgnoreQueryFilters() on visit.PlaceId equals place.Id
            join user in db.Users.IgnoreQueryFilters() on visit.UserId equals user.Id
            orderby visit.CreatedAt descending, visit.Id descending
            select new PlaceVisitSource(visit.Id, visit.PlaceId, place.Name, place.Address,
                place.MarkerIcon, place.MarkerColor, visit.CreatedAt, user.Id, user.Username,
                user.AvatarSeed, visit.Note, visit.Rating, place.City))
            .Skip((page - 1) * limit).Take(limit).ToListAsync(cancellationToken);
        return (items, total);
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
                place.MarkerColor,
                visit.CreatedAt,
                user.Id,
                user.Username,
                user.AvatarSeed,
                visit.Note,
                visit.Rating,
                place.City))
            .ToListAsync(cancellationToken);
    }

    public Task<Place?> FindPlaceAsync(Guid placeId, CancellationToken cancellationToken = default)
        => db.Places.FirstOrDefaultAsync(place => place.Id == placeId, cancellationToken);

    public Task<PlaceVisit?> FindPlaceVisitAsync(Guid visitId, CancellationToken cancellationToken = default)
        => db.PlaceVisits.FirstOrDefaultAsync(visit => visit.Id == visitId, cancellationToken);

    public void AddPlace(Place place) => db.Places.Add(place);

    public void AddPlaceVisit(PlaceVisit visit) => db.PlaceVisits.Add(visit);

    private async Task<IReadOnlyList<PlaceSource>> WithAverageRating(
        IQueryable<PlaceSource> source, CancellationToken cancellationToken)
    {
        var results = await source.ToListAsync(cancellationToken);
        var ids = results.Select(item => item.Place.Id).ToArray();
        var visitStats = await db.PlaceVisits.AsNoTracking()
            .Where(visit => ids.Contains(visit.PlaceId))
            .GroupBy(visit => visit.PlaceId)
            .Select(group => new
            {
                PlaceId = group.Key,
                Rating = group.Average(visit => visit.Rating > 0 ? (double?)visit.Rating : null),
                LastCheckInAt = group.Max(visit => visit.CreatedAt),
            })
            .ToDictionaryAsync(item => item.PlaceId, cancellationToken);
        return results.Select(result => result with
        {
            AverageRating = Math.Round(
                visitStats.GetValueOrDefault(result.Place.Id)?.Rating ?? 0, 1, MidpointRounding.AwayFromZero),
            LastCheckInAt = visitStats.GetValueOrDefault(result.Place.Id)?.LastCheckInAt,
        }).ToList();
    }

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
                .ToList(),
            0,
            null));
}
