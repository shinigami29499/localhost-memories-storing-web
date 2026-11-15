import type { CSSProperties } from "react";
import { StarRating } from "@/features/place/components/StarRating";
import type { SavedPlacesListProps } from "@/pages/place/usePlacePageController";

export function MobileSavedPlacesList({ places, selectedId, editing, editingId, onSelect }: SavedPlacesListProps) {
  return <ul className="place__list mobile-saved-places">
    {places.map((place) => <li key={place.id}>
      <button type="button" className="place__card mobile-saved-places__card"
        aria-pressed={selectedId === place.id} disabled={editing && editingId !== place.id}
        onClick={() => onSelect(place)}>
        <span className="place__chip" style={{ "--marker-color": place.markerColor } as CSSProperties} aria-hidden="true">
          {place.markerIcon}
        </span>
        <span className="place__card-body">
          <strong className="place__card-name">{place.name}</strong>
          {place.address && <small>{place.address}</small>}
          <StarRating value={place.rating} size="sm" />
          <small className="place__card-owner">{place.owner.username}</small>
        </span>
      </button>
    </li>)}
  </ul>;
}
