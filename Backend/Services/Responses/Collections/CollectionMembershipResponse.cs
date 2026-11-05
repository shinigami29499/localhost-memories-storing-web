namespace Services.Responses.Collections;

public sealed record CollectionMembershipItemResponse(Guid MediaId, IReadOnlyList<Guid> AlbumIds);

public sealed record CollectionMembershipResponse(IReadOnlyList<CollectionMembershipItemResponse> Items);
