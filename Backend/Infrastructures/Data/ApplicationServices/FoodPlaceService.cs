using System.Text.RegularExpressions;
using Domains.Entities;
using Infrastructures.Data.Interfaces;
using Services.Exceptions;
using Services.Interfaces;
using Services.Models.Food;
using Services.Requests.Food;

namespace Infrastructures.Data.ApplicationServices;

public sealed partial class FoodPlaceService(
    IFoodPlaceRepository repository,
    IUnitOfWork unitOfWork,
    IMapper mapper) : IFoodPlaceService
{
    private const int MaxNameLength = 120;
    private const int MaxAddressLength = 300;
    private const int MaxNoteLength = 2000;
    private const int MaxMarkerIconLength = 16;
    private const int MaxImages = 12;
    private const string DefaultMarkerIcon = "🍜";
    private const string DefaultMarkerColor = "#E2572B";

    public async Task<IReadOnlyList<FoodPlaceDto>> GetFoodPlacesAsync(CancellationToken cancellationToken = default)
        => (await repository.GetFoodPlacesAsync(cancellationToken)).Select(mapper.Map).ToList();

    public async Task<FoodPlaceDto> GetFoodPlaceAsync(
        Guid foodPlaceId, CancellationToken cancellationToken = default)
        => mapper.Map(await repository.GetFoodPlaceSourceAsync(foodPlaceId, cancellationToken)
            ?? throw new NotFoundException($"Food place '{foodPlaceId}' was not found."));

    public async Task<IReadOnlyList<FoodPlaceVisitDto>> GetFoodPlaceVisitHistoryAsync(
        Guid userId, CancellationToken cancellationToken = default)
        => (await repository.GetFoodPlaceVisitHistoryAsync(userId, cancellationToken))
            .Select(mapper.Map)
            .ToList();

    public async Task CheckInFoodPlaceAsync(
        Guid foodPlaceId, Guid userId, CancellationToken cancellationToken = default)
    {
        _ = await repository.FindFoodPlaceAsync(foodPlaceId, cancellationToken)
            ?? throw new NotFoundException($"Food place '{foodPlaceId}' was not found.");
        repository.AddFoodPlaceVisit(new FoodPlaceVisit
        {
            FoodPlaceId = foodPlaceId,
            UserId = userId,
        });
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<FoodPlaceDto> CreateFoodPlaceAsync(
        Guid ownerId, SaveFoodPlaceRequest request, CancellationToken cancellationToken = default)
    {
        var values = Validate(request);
        var mediaIds = await ValidateMediaIdsAsync(request.MediaIds, cancellationToken) ?? [];
        var place = new FoodPlace
        {
            Name = values.Name,
            Address = values.Address,
            Note = values.Note,
            Latitude = values.Latitude,
            Longitude = values.Longitude,
            Rating = values.Rating,
            MarkerIcon = values.MarkerIcon,
            MarkerColor = values.MarkerColor,
            OwnerId = ownerId,
            MediaItems = mediaIds.Select((mediaId, index) => new FoodPlaceMedia
            {
                MediaFileId = mediaId,
                Position = index,
            }).ToList(),
        };
        repository.AddFoodPlace(place);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetFoodPlaceAsync(place.Id, cancellationToken);
    }

    public async Task<FoodPlaceDto> UpdateFoodPlaceAsync(
        Guid foodPlaceId, Guid actorId, bool isAdmin, SaveFoodPlaceRequest request,
        CancellationToken cancellationToken = default)
    {
        var values = Validate(request);
        var place = await FindEditableFoodPlaceAsync(foodPlaceId, actorId, isAdmin, cancellationToken);
        var mediaIds = await ValidateMediaIdsAsync(request.MediaIds, cancellationToken);
        place.Name = values.Name;
        place.Address = values.Address;
        place.Note = values.Note;
        place.Latitude = values.Latitude;
        place.Longitude = values.Longitude;
        place.Rating = values.Rating;
        place.MarkerIcon = values.MarkerIcon;
        place.MarkerColor = values.MarkerColor;
        if (mediaIds is not null)
            await ReplaceMediaAsync(place.Id, mediaIds, actorId, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetFoodPlaceAsync(place.Id, cancellationToken);
    }

    public async Task DeleteFoodPlaceAsync(
        Guid foodPlaceId, Guid actorId, bool isAdmin, CancellationToken cancellationToken = default)
    {
        var place = await FindEditableFoodPlaceAsync(foodPlaceId, actorId, isAdmin, cancellationToken);
        var utcNow = DateTime.UtcNow;
        foreach (var item in await repository.GetFoodPlaceMediaAsync(place.Id, cancellationToken))
        {
            item.DeletedAt = utcNow;
            item.DeletedBy = actorId;
        }
        place.DeletedAt = utcNow;
        place.DeletedBy = actorId;
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task ReplaceMediaAsync(
        Guid foodPlaceId, IReadOnlyList<Guid> mediaIds, Guid actorId, CancellationToken cancellationToken)
    {
        var existing = await repository.GetFoodPlaceMediaAsync(foodPlaceId, cancellationToken);
        var positions = mediaIds.Select((mediaId, index) => (mediaId, index))
            .ToDictionary(pair => pair.mediaId, pair => pair.index);
        var utcNow = DateTime.UtcNow;

        foreach (var item in existing)
        {
            if (positions.Remove(item.MediaFileId, out var position))
            {
                if (item.Position != position) item.Position = position;
                continue;
            }
            item.DeletedAt = utcNow;
            item.DeletedBy = actorId;
        }

        foreach (var (mediaId, position) in positions)
        {
            repository.AddFoodPlaceMedia(new FoodPlaceMedia
            {
                FoodPlaceId = foodPlaceId,
                MediaFileId = mediaId,
                Position = position,
            });
        }
    }

    /// <summary>Returns null when the request leaves images unchanged; otherwise distinct ids in request order.</summary>
    private async Task<IReadOnlyList<Guid>?> ValidateMediaIdsAsync(
        IReadOnlyList<Guid>? requested, CancellationToken cancellationToken)
    {
        if (requested is null) return null;
        var mediaIds = requested.Distinct().ToList();
        if (mediaIds.Count > MaxImages)
            throw new ValidationException("Invalid food place.", new Dictionary<string, string[]>
            {
                ["mediaIds"] = [$"Choose {MaxImages} images or fewer."],
            });

        var available = await repository.GetActiveImageIdsAsync(mediaIds, cancellationToken);
        if (mediaIds.Any(mediaId => !available.Contains(mediaId)))
            throw new ValidationException("Invalid food place.", new Dictionary<string, string[]>
            {
                ["mediaIds"] = ["Choose images that still exist in the library."],
            });

        return mediaIds;
    }

    private async Task<FoodPlace> FindEditableFoodPlaceAsync(
        Guid foodPlaceId, Guid actorId, bool isAdmin, CancellationToken cancellationToken)
    {
        var place = await repository.FindFoodPlaceAsync(foodPlaceId, cancellationToken)
            ?? throw new NotFoundException($"Food place '{foodPlaceId}' was not found.");
        if (!isAdmin && place.OwnerId != actorId)
            throw new ForbiddenException("Only the owner or an administrator can change this food place.");
        return place;
    }

    private static FoodPlaceValues Validate(SaveFoodPlaceRequest request)
    {
        Dictionary<string, string[]> errors = [];
        var name = request.Name?.Trim() ?? "";
        if (name.Length == 0)
            errors["name"] = ["Enter a name for this place."];
        else if (name.Length > MaxNameLength)
            errors["name"] = [$"Use {MaxNameLength} characters or fewer."];

        var address = request.Address?.Trim() ?? "";
        if (address.Length > MaxAddressLength)
            errors["address"] = [$"Use {MaxAddressLength} characters or fewer."];

        var note = request.Note?.Trim() ?? "";
        if (note.Length > MaxNoteLength)
            errors["note"] = [$"Use {MaxNoteLength} characters or fewer."];

        if (!double.IsFinite(request.Latitude) || request.Latitude is < -90 or > 90)
            errors["latitude"] = ["Latitude must be between -90 and 90."];
        if (!double.IsFinite(request.Longitude) || request.Longitude is < -180 or > 180)
            errors["longitude"] = ["Longitude must be between -180 and 180."];

        if (request.Rating is < 0 or > 5)
            errors["rating"] = ["Rating must be between 1 and 5, or 0 when unrated."];

        var markerIcon = request.MarkerIcon?.Trim() is { Length: > 0 } icon ? icon : DefaultMarkerIcon;
        if (markerIcon.Length > MaxMarkerIconLength)
            errors["markerIcon"] = [$"Use {MaxMarkerIconLength} characters or fewer."];

        var markerColor = request.MarkerColor?.Trim() is { Length: > 0 } color
            ? color.ToUpperInvariant() : DefaultMarkerColor;
        if (!HexColorPattern().IsMatch(markerColor))
            errors["markerColor"] = ["Use a hex color such as #E2572B."];

        if (errors.Count > 0)
            throw new ValidationException("Invalid food place.", errors);

        return new FoodPlaceValues(
            name,
            address,
            note,
            request.Latitude,
            request.Longitude,
            request.Rating,
            markerIcon,
            markerColor);
    }

    [GeneratedRegex("^#(?:[0-9A-F]{3}|[0-9A-F]{6})$", RegexOptions.CultureInvariant)]
    private static partial Regex HexColorPattern();

    private sealed record FoodPlaceValues(
        string Name,
        string Address,
        string Note,
        double Latitude,
        double Longitude,
        int Rating,
        string MarkerIcon,
        string MarkerColor);
}
