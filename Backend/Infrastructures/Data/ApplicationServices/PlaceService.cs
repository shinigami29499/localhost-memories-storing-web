using System.Text.RegularExpressions;
using Domains.Entities;
using Infrastructures.Data.Interfaces;
using Services.Exceptions;
using Services.Interfaces;
using Services.Models.Place;
using Services.Requests.Place;
using Services.Responses.Place;

namespace Infrastructures.Data.ApplicationServices;

public sealed partial class PlaceService(
    IPlaceRepository repository,
    IUnitOfWork unitOfWork,
    IMapper mapper,
    IPreviewLifecycle previews) : IPlaceService
{
    private const int MaxNameLength = 120;
    private const int MaxAddressLength = 300;
    private const int MaxNoteLength = 2000;
    private const int MaxMarkerIconLength = 16;
    private const int MaxImages = 12;
    private const string DefaultMarkerIcon = "🍜";
    private const string DefaultMarkerColor = "#E2572B";

    public async Task<IReadOnlyList<PlaceDto>> GetPlacesAsync(CancellationToken cancellationToken = default)
        => (await repository.GetPlacesAsync(cancellationToken)).Select(mapper.Map).ToList();

    public async Task<PlacePageResponse<PlaceDto>> GetPlacesPageAsync(int page, int limit,
        string? search, int minimumRating, CancellationToken cancellationToken = default)
    {
        ValidatePage(page, limit);
        if (search?.Length > 120 || minimumRating is < 0 or > 5)
            throw new ValidationException("Invalid place filter.", new Dictionary<string, string[]>
            {
                ["search"] = ["Use at most 120 characters and a rating from 0 to 5."],
            });
        var (items, total) = await repository.GetPlacesPageAsync(page, limit, search, minimumRating, cancellationToken);
        return new PlacePageResponse<PlaceDto>(items.Select(mapper.Map).ToList(), page, limit, total);
    }

    public async Task<PlacePageResponse<PlaceVisitDto>> GetVisitPageAsync(int page, int limit,
        Guid? userId, Guid? placeId, CancellationToken cancellationToken = default)
    {
        ValidatePage(page, limit);
        if (placeId is { } id && await repository.FindPlaceAsync(id, cancellationToken) is null)
            throw new NotFoundException($"Place '{id}' was not found.");
        var (items, total) = await repository.GetVisitPageAsync(page, limit, userId, placeId, cancellationToken);
        return new PlacePageResponse<PlaceVisitDto>(items.Select(mapper.Map).ToList(), page, limit, total);
    }

    private static void ValidatePage(int page, int limit)
    {
        if (page < 1 || page > 1_000_000 || limit is < 1 or > 100)
            throw new ValidationException("Invalid page.", new Dictionary<string, string[]>
            {
                ["page"] = ["Use a page between 1 and 1000000 and a limit between 1 and 100."],
            });
    }

    public async Task<IReadOnlyList<PlaceMapDto>> GetMapPlacesAsync(CancellationToken cancellationToken = default)
        => (await repository.GetMapPlacesAsync(cancellationToken)).Select(MapSummary).ToList();

    public async Task<PlacePageResponse<PlaceMapDto>> GetMapPlacesPageAsync(int page, int limit,
        PlaceMapBounds bounds, CancellationToken cancellationToken = default)
    {
        ValidatePage(page, limit);
        if (!double.IsFinite(bounds.West) || !double.IsFinite(bounds.East)
            || !double.IsFinite(bounds.South) || !double.IsFinite(bounds.North)
            || bounds.West is < -180 or > 180 || bounds.East is < -180 or > 180
            || bounds.South is < -90 or > 90 || bounds.North is < -90 or > 90
            || bounds.South > bounds.North)
            throw new ValidationException("Invalid map bounds.", new Dictionary<string, string[]>
            {
                ["bounds"] = ["Provide valid latitude and longitude bounds."],
            });
        var (items, total) = await repository.GetMapPlacesPageAsync(page, limit, bounds, cancellationToken);
        return new PlacePageResponse<PlaceMapDto>(items.Select(MapSummary).ToList(), page, limit, total);
    }

    private PlaceMapDto MapSummary(PlaceSource source)
    {
        var place = mapper.Map(source);
        return new PlaceMapDto(place.Id, place.Name, place.Address, place.Note, place.Latitude,
            place.Longitude, place.Rating, place.MarkerIcon, place.MarkerColor, place.Owner);
    }

    public async Task<PlaceDto> GetPlaceAsync(
        Guid placeId, CancellationToken cancellationToken = default)
        => mapper.Map(await repository.GetPlaceSourceAsync(placeId, cancellationToken)
            ?? throw new NotFoundException($"Place '{placeId}' was not found."));

    public async Task<IReadOnlyList<PlaceVisitDto>> GetPlaceVisitHistoryAsync(
        Guid userId, CancellationToken cancellationToken = default)
        => (await repository.GetPlaceVisitHistoryAsync(userId, cancellationToken))
            .Select(mapper.Map)
            .ToList();

    public async Task<IReadOnlyList<PlaceVisitDto>> GetAllPlaceVisitHistoryAsync(
        CancellationToken cancellationToken = default)
        => (await repository.GetAllPlaceVisitHistoryAsync(cancellationToken))
            .Select(mapper.Map)
            .ToList();

    public async Task<IReadOnlyList<PlaceVisitDto>> GetPlaceVisitHistoryForPlaceAsync(
        Guid placeId, CancellationToken cancellationToken = default)
    {
        _ = await repository.FindPlaceAsync(placeId, cancellationToken)
            ?? throw new NotFoundException($"Place '{placeId}' was not found.");
        return (await repository.GetPlaceVisitHistoryForPlaceAsync(placeId, cancellationToken))
            .Select(mapper.Map)
            .ToList();
    }

    public async Task CheckInPlaceAsync(
        Guid placeId, Guid userId, CancellationToken cancellationToken = default)
    {
        _ = await repository.FindPlaceAsync(placeId, cancellationToken)
            ?? throw new NotFoundException($"Place '{placeId}' was not found.");
        repository.AddPlaceVisit(new PlaceVisit
        {
            PlaceId = placeId,
            UserId = userId,
        });
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task DeletePlaceVisitAsync(
        Guid visitId, Guid userId, CancellationToken cancellationToken = default)
    {
        var visit = await repository.FindPlaceVisitAsync(visitId, cancellationToken)
            ?? throw new NotFoundException($"Place visit '{visitId}' was not found.");
        if (visit.UserId != userId)
            throw new ForbiddenException("You can only remove your own place visits.");

        visit.DeletedAt = DateTime.UtcNow;
        visit.DeletedBy = userId;
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<PlaceVisitDto> UpdatePlaceVisitAsync(
        Guid visitId, Guid actorId, string? note, int rating, CancellationToken cancellationToken = default)
    {
        var visit = await repository.FindPlaceVisitAsync(visitId, cancellationToken)
            ?? throw new NotFoundException($"Place visit '{visitId}' was not found.");
        if (visit.UserId != actorId)
            throw new ForbiddenException("You can only edit your own place visits.");
        var normalizedNote = note?.Trim() ?? "";
        if (normalizedNote.Length > MaxNoteLength || rating is < 0 or > 5)
            throw new ValidationException("Invalid place visit.", new Dictionary<string, string[]>
            {
                [normalizedNote.Length > MaxNoteLength ? "note" : "rating"] = [normalizedNote.Length > MaxNoteLength
                    ? $"Use {MaxNoteLength} characters or fewer." : "Rating must be between 1 and 5, or 0 when unrated."],
            });
        visit.Note = normalizedNote;
        visit.Rating = rating;
        await unitOfWork.SaveChangesAsync(cancellationToken);
        var updated = (await repository.GetPlaceVisitHistoryForPlaceAsync(visit.PlaceId, cancellationToken))
            .First(item => item.Id == visitId);
        return mapper.Map(updated);
    }

    public async Task<PlaceDto> CreatePlaceAsync(
        Guid ownerId, SavePlaceRequest request, CancellationToken cancellationToken = default)
    {
        var values = Validate(request);
        await using var transaction = await unitOfWork.BeginTransactionAsync(cancellationToken);
        await previews.LockAsync(cancellationToken);
        var mediaIds = await ValidateMediaIdsAsync(request.MediaIds, ownerId, cancellationToken) ?? [];
        var place = new Place
        {
            Name = values.Name,
            Address = values.Address,
            Note = values.Note,
            Latitude = values.Latitude,
            Longitude = values.Longitude,
            MarkerIcon = values.MarkerIcon,
            MarkerColor = values.MarkerColor,
            OwnerId = ownerId,
            MediaItems = mediaIds.Select((mediaId, index) => new PlaceMedia
            {
                MediaFileId = mediaId,
                Position = index,
            }).ToList(),
        };
        repository.AddPlace(place);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return await GetPlaceAsync(place.Id, cancellationToken);
    }

    public async Task<PlaceDto> UpdatePlaceAsync(
        Guid placeId, Guid actorId, bool isAdmin, SavePlaceRequest request,
        CancellationToken cancellationToken = default)
    {
        var values = Validate(request);
        List<Guid> removedIds = [];
        await using (var transaction = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            await previews.LockAsync(cancellationToken);
            var place = await FindEditablePlaceAsync(placeId, actorId, isAdmin, cancellationToken);
            var mediaIds = await ValidateMediaIdsAsync(request.MediaIds, actorId, cancellationToken);
            place.Name = values.Name;
            place.Address = values.Address;
            place.Note = values.Note;
            place.Latitude = values.Latitude;
            place.Longitude = values.Longitude;
            place.MarkerIcon = values.MarkerIcon;
            place.MarkerColor = values.MarkerColor;
            if (mediaIds is not null)
            {
                removedIds = (await repository.GetPlaceMediaAsync(place.Id, cancellationToken))
                    .Where(item => !mediaIds.Contains(item.MediaFileId)).Select(item => item.MediaFileId).ToList();
                await ReplaceMediaAsync(place.Id, mediaIds, actorId, cancellationToken);
            }
            await unitOfWork.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        await previews.CleanupAsync(removedIds, actorId, CancellationToken.None);
        return await GetPlaceAsync(placeId, cancellationToken);
    }

    public async Task DeletePlaceAsync(
        Guid placeId, Guid actorId, bool isAdmin, CancellationToken cancellationToken = default)
    {
        List<Guid> mediaIds;
        await using (var transaction = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            await previews.LockAsync(cancellationToken);
            var place = await FindEditablePlaceAsync(placeId, actorId, isAdmin, cancellationToken);
            var utcNow = DateTime.UtcNow;
            var items = await repository.GetPlaceMediaAsync(place.Id, cancellationToken);
            mediaIds = items.Select(item => item.MediaFileId).ToList();
            foreach (var item in items)
            {
                item.DeletedAt = utcNow;
                item.DeletedBy = actorId;
            }
            place.DeletedAt = utcNow;
            place.DeletedBy = actorId;
            await unitOfWork.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        await previews.CleanupAsync(mediaIds, actorId, CancellationToken.None);
    }

    private async Task ReplaceMediaAsync(
        Guid placeId, IReadOnlyList<Guid> mediaIds, Guid actorId, CancellationToken cancellationToken)
    {
        var existing = await repository.GetPlaceMediaAsync(placeId, cancellationToken);
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
            repository.AddPlaceMedia(new PlaceMedia
            {
                PlaceId = placeId,
                MediaFileId = mediaId,
                Position = position,
            });
        }
    }

    /// <summary>Returns null when the request leaves images unchanged; otherwise distinct ids in request order.</summary>
    private async Task<IReadOnlyList<Guid>?> ValidateMediaIdsAsync(
        IReadOnlyList<Guid>? requested, Guid actorId, CancellationToken cancellationToken)
    {
        if (requested is null) return null;
        var mediaIds = requested.Distinct().ToList();
        if (mediaIds.Count > MaxImages)
            throw new ValidationException("Invalid place.", new Dictionary<string, string[]>
            {
                ["mediaIds"] = [$"Choose {MaxImages} images or fewer."],
            });

        foreach (var mediaId in mediaIds)
            await previews.ValidateImageAsync(mediaId, actorId, cancellationToken);

        return mediaIds;
    }

    private async Task<Place> FindEditablePlaceAsync(
        Guid placeId, Guid actorId, bool isAdmin, CancellationToken cancellationToken)
    {
        var place = await repository.FindPlaceAsync(placeId, cancellationToken)
            ?? throw new NotFoundException($"Place '{placeId}' was not found.");
        if (!isAdmin && place.OwnerId != actorId)
            throw new ForbiddenException("Only the owner or an administrator can change this place.");
        return place;
    }

    private static PlaceValues Validate(SavePlaceRequest request)
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
            throw new ValidationException("Invalid place.", errors);

        return new PlaceValues(
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

    private sealed record PlaceValues(
        string Name,
        string Address,
        string Note,
        double Latitude,
        double Longitude,
        int Rating,
        string MarkerIcon,
        string MarkerColor);
}
