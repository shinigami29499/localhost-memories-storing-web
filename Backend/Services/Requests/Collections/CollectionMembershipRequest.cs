namespace Services.Requests.Collections;

public sealed record CollectionMembershipRequest
{
    public IReadOnlyList<Guid> MediaIds { get; init; } = [];
}
