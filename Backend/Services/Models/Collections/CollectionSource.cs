using Domains.Entities;

namespace Services.Models.Collections;

/// <summary>Collection row with resolved counts and preview, produced by persistence queries.</summary>
public sealed record CollectionSource(
    Collection Collection,
    User Owner,
    int PostCount,
    Guid? CustomPreviewMediaId,
    Guid? DefaultPreviewMediaId,
    bool ContainsPost);
