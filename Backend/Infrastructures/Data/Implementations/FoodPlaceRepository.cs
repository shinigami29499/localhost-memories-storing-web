using Microsoft.EntityFrameworkCore;
using Domains.Entities;
using Infrastructures.Adapters.Storage;
using Infrastructures.Data.Interfaces;
using Services.Models.Food;

namespace Infrastructures.Data.Implementations;

public sealed class FoodPlaceRepository(ApplicationDbContext db) : IFoodPlaceRepository
{
    public async Task<IReadOnlyList<FoodPlaceSource>> GetFoodPlacesAsync(
        CancellationToken cancellationToken = default)
        => await Project(db.FoodPlaces.AsNoTracking()
                .OrderByDescending(place => place.CreatedAt)
                .ThenByDescending(place => place.Id))
            .ToListAsync(cancellationToken);

    public Task<FoodPlaceSource?> GetFoodPlaceSourceAsync(
        Guid foodPlaceId, CancellationToken cancellationToken = default)
        => Project(db.FoodPlaces.AsNoTracking().Where(place => place.Id == foodPlaceId))
            .FirstOrDefaultAsync(cancellationToken);

    public Task<FoodPlace?> FindFoodPlaceAsync(Guid foodPlaceId, CancellationToken cancellationToken = default)
        => db.FoodPlaces.FirstOrDefaultAsync(place => place.Id == foodPlaceId, cancellationToken);

    public void AddFoodPlace(FoodPlace foodPlace) => db.FoodPlaces.Add(foodPlace);

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

    public Task<List<FoodPlaceMedia>> GetFoodPlaceMediaAsync(
        Guid foodPlaceId, CancellationToken cancellationToken = default)
        => db.FoodPlaceMedia.Where(item => item.FoodPlaceId == foodPlaceId).ToListAsync(cancellationToken);

    public void AddFoodPlaceMedia(FoodPlaceMedia item) => db.FoodPlaceMedia.Add(item);

    // The MediaFile query filter drops links whose image was deleted or trashed.
    private static IQueryable<FoodPlaceSource> Project(IQueryable<FoodPlace> places)
        => places.Select(place => new FoodPlaceSource(
            place,
            place.Owner,
            place.MediaItems
                .Where(item => item.MediaFile.MediaKind == MediaKinds.Image)
                .OrderBy(item => item.Position)
                .ThenBy(item => item.CreatedAt)
                .Select(item => item.MediaFileId)
                .ToList()));
}
