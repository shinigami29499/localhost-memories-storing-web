import { useState, useMemo, type CSSProperties } from "react";
import {
  Button,
  ConfirmationDialog,
  EmptyState,
  ErrorState,
  Spinner,
  showToast,
} from "../../components/ui";
import { useLocale } from "../../context/LocaleContext";
import { useAuthStore } from "../../store/authStore";
import { ApiError } from "../../services/api";
import { useHomeLocation } from "../../features/locations/hooks/useHomeLocation";
import { mediaPreviewUrl } from "../../utils/media";
import { FoodMap } from "../../features/food/components/FoodMap";
import { FoodPlaceDialog } from "../../features/food/components/FoodPlaceDialog";
import {
  FoodPlaceEditor,
  type FoodPlaceFormValues,
} from "../../features/food/components/FoodPlaceEditor";
import { StarRating } from "../../features/food/components/StarRating";
import {
  useDeleteFoodPlace,
  useFoodPlaces,
  useSaveFoodPlace,
} from "../../features/food/hooks/useFoodPlaces";
import {
  DEFAULT_FOOD_MARKER_COLOR,
  DEFAULT_FOOD_MARKER_ICON,
  type FoodCoordinate,
  type FoodPlace,
} from "../../features/food/types";
import "./food.css";

interface EditorState {
  id?: string;
  coordinate: FoodCoordinate | null;
  previousCoordinate?: FoodCoordinate;
  values: FoodPlaceFormValues;
}

const emptyValues: FoodPlaceFormValues = {
  name: "",
  address: "",
  note: "",
  rating: 0,
  markerIcon: DEFAULT_FOOD_MARKER_ICON,
  markerColor: DEFAULT_FOOD_MARKER_COLOR,
  mediaIds: [],
};

function toEditorState(place: FoodPlace): EditorState {
  return {
    id: place.id,
    coordinate: { latitude: place.latitude, longitude: place.longitude },
    values: {
      name: place.name,
      address: place.address,
      note: place.note,
      rating: place.rating,
      markerIcon: place.markerIcon,
      markerColor: place.markerColor,
      mediaIds: [...place.mediaIds],
    },
  };
}

export function FoodPage() {
  const { t } = useLocale();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const home = useHomeLocation(user?.id);
  const query = useFoodPlaces();
  const save = useSaveFoodPlace();
  const remove = useDeleteFoodPlace();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [placeToDelete, setPlaceToDelete] = useState<FoodPlace | null>(null);
  const [manualHomePick, setManualHomePick] = useState(false);
  const [homePromptDismissed, setHomePromptDismissed] = useState(false);
  const [homeDialogOpen, setHomeDialogOpen] = useState(false);
  const [confirmHomeRemoval, setConfirmHomeRemoval] = useState(false);

  const places = query.data ?? [];
  const homePrompt = home.query.isSuccess && !home.query.data && !homePromptDismissed;
  const homePicking = manualHomePick || (homePrompt && !editor);
  const selected = places.find((place) => place.id === selectedId);
  const canEdit = (place: FoodPlace) => place.owner.id === user?.id || isAdmin;
  const mapPlaces = useMemo(
    () => editor?.id && editor.coordinate ? places.filter((place) => place.id !== editor.id) : places,
    [places, editor?.id, editor?.coordinate],
  );
  const rated = places.filter((place) => place.rating > 0).length;

  const pickHome = async (coordinate: FoodCoordinate) => {
    try {
      await home.save.mutateAsync(coordinate);
      setManualHomePick(false);
      setHomePromptDismissed(true);
      showToast.success(t("Home location saved."));
    } catch (error) {
      showToast.error(error instanceof ApiError ? error.message : t("Could not save your home location."));
    }
  };

  const cancelHomePick = () => {
    setManualHomePick(false);
    setHomePromptDismissed(true);
  };

  const removeHomeLocation = async () => {
    await home.clear.mutateAsync();
    setHomePromptDismissed(false);
    showToast.success(t("Home location removed."));
  };

  const startEdit = (place: FoodPlace) => {
    setSelectedId(place.id);
    setFormError(null);
    setEditor(toEditorState(place));
  };

  const selectPlace = (place: FoodPlace) => {
    if (editor && editor.id !== place.id) return;
    setSelectedId(place.id);
  };

  /** Moves a draft marker or starts a new place at the selected map point. */
  const pickOnMap = (coordinate: FoodCoordinate, placeName?: string) => {
    if (!editor) {
      if (!home.query.data) setHomePromptDismissed(false);
      setSelectedId(null);
      setFormError(null);
      setEditor({ coordinate, values: { ...emptyValues, name: placeName ?? "" } });
      return;
    }
    setEditor((current) => {
      if (!current) return current;
      const name = !current.values.name.trim() && placeName ? placeName : current.values.name;
      return { ...current, coordinate, previousCoordinate: undefined, values: { ...current.values, name } };
    });
  };

  const cancelMapPick = () => {
    setEditor((current) => {
      if (!current) return current;
      if (current.previousCoordinate)
        return { ...current, coordinate: current.previousCoordinate, previousCoordinate: undefined };
      return null;
    });
    setFormError(null);
  };

  const submit = async () => {
    if (!editor?.coordinate) return;
    const name = editor.values.name.trim();
    if (!name) {
      setFormError(t("Enter a name for this place."));
      return;
    }

    setFormError(null);
    try {
      const saved = await save.mutateAsync({
        id: editor.id,
        input: {
          ...editor.values,
          name,
          address: editor.values.address.trim(),
          note: editor.values.note.trim(),
          latitude: editor.coordinate.latitude,
          longitude: editor.coordinate.longitude,
        },
      });
      setEditor(null);
      setSelectedId(saved.id);
      showToast.success(t(editor.id ? "Food place updated." : "Food place saved."));
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t("Could not save this food place."));
    }
  };

  const confirmDelete = async () => {
    if (!placeToDelete) return;
    await remove.mutateAsync(placeToDelete.id);
    if (selectedId === placeToDelete.id) setSelectedId(null);
    if (editor?.id === placeToDelete.id) setEditor(null);
    showToast.success(t("Food place deleted."));
  };

  return (
    <main className="food">
      <header className="food__header">
        <div>
          <h1>{t("Food")}<span className="brand__dot">.</span></h1>
          <p>{t("Save the places you ate at, rate them, and keep your notes on the map.")}</p>
        </div>
      </header>
      <p className="food__hint">{t("Mapbox requires internet access and receives map coordinates. Your notes stay on this server.")}</p>
      {editor && !editor.coordinate && (
        <div className="food__notice" role="status">
          <span>{t("Click the map, use your current location, or select a place label to set the marker.")}</span>
          <Button type="button" variant="secondary" onClick={cancelMapPick}>
            {t(editor.previousCoordinate ? "Cancel location change" : "Cancel")}
          </Button>
        </div>
      )}
      {home.query.isError && (
        <div className="food__notice" role="alert">
          <span>{t("Could not load your home location.")}</span>
          <Button type="button" variant="secondary" onClick={() => void home.query.refetch()}>
            {t("Retry")}
          </Button>
        </div>
      )}
      {(homePrompt || manualHomePick) && (
        <div className="food__notice" role="status">
          <span>{t(manualHomePick
            ? "Click the map to set your home location."
            : editor
              ? "Your home location is not set."
              : "Home not set.")}</span>
          {manualHomePick ? (
            <Button type="button" variant="secondary" disabled={home.save.isPending} onClick={cancelHomePick}>
              {t("Cancel")}
            </Button>
          ) : editor ? (
            <>
              <Button type="button" disabled={home.save.isPending} onClick={() => setManualHomePick(true)}>
                {t("Set home")}
              </Button>
              <Button type="button" variant="secondary" onClick={cancelHomePick}>
                {t("Not now")}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" disabled={home.save.isPending} onClick={() => setManualHomePick(true)}>
                {t("Add now")}
              </Button>
              <Button type="button" variant="secondary" onClick={cancelHomePick}>
                {t("Set home later")}
              </Button>
            </>
          )}
        </div>
      )}

      {query.isLoading ? <Spinner /> : query.isError && !places.length ? (
        <ErrorState message="Could not load food places." onRetry={() => void query.refetch()} />
      ) : (
        <>
          <div className="food__workspace">
            <div className="food__map-panel">
              <FoodMap
                places={mapPlaces}
                selectedId={selectedId}
                draft={editor?.coordinate ?? null}
                draftIcon={editor?.values.markerIcon ?? DEFAULT_FOOD_MARKER_ICON}
                draftColor={editor?.values.markerColor ?? DEFAULT_FOOD_MARKER_COLOR}
                picking={!!editor}
                homeLocation={home.query.data ?? null}
                homeLocationReady={home.query.isSuccess || home.query.isError}
                homePicking={homePicking}
                onSelect={selectPlace}
                onPickHome={(coordinate) => void pickHome(coordinate)}
                onHomeUnavailable={() => {
                  if (home.query.isSuccess) setHomeDialogOpen(true);
                  else void home.query.refetch();
                }}
                onRequestHomePick={() => {
                  setHomePromptDismissed(false);
                  setManualHomePick(true);
                }}
                onHomeMarkerClick={() => setHomeDialogOpen(true)}
                onPick={pickOnMap}
              />
            </div>
          </div>
          {!places.length ? (
            <EmptyState title="No food places yet" hint="Click the map or use your current location to add your first place." />
          ) : (
            <>
              <div className="food__library-header">
                <h2>{t("Places")} <span>{t("{rated} of {total} rated", { rated, total: places.length })}</span></h2>
              </div>
              <ul className="food__list">
                {places.map((place) => (
                  <li key={place.id}>
                    <button
                      type="button"
                      className="food__card"
                      aria-pressed={selectedId === place.id}
                      disabled={!!editor && editor.id !== place.id}
                      onClick={() => selectPlace(place)}
                    >
                      <span
                        className="food__chip"
                        style={{ "--marker-color": place.markerColor } as CSSProperties}
                        aria-hidden="true"
                      >
                        {place.markerIcon}
                      </span>
                      <span className="food__card-body">
                        <strong>{place.name}</strong>
                        {place.address && <small>{place.address}</small>}
                        <StarRating value={place.rating} size="sm" />
                        {place.note && <small>{place.note}</small>}
                        <small className="food__card-owner">{place.owner.username}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      {editor?.coordinate && (
        <FoodPlaceDialog
          title={t(editor.id ? "Edit food place" : "New food place")}
          closeDisabled={save.isPending}
          onClose={() => {
            if (!save.isPending) {
              setEditor(null);
              setFormError(null);
            }
          }}
        >
          <FoodPlaceEditor
            values={editor.values}
            coordinate={editor.coordinate}
            saving={save.isPending}
            isNew={!editor.id}
            error={formError}
            onChange={(values) => setEditor((current) => current ? { ...current, values } : current)}
            onSubmit={() => void submit()}
            onCancel={() => { setEditor(null); setFormError(null); }}
            onChangeLocation={() => setEditor((current) => current?.coordinate
              ? { ...current, previousCoordinate: current.coordinate, coordinate: null }
              : current)}
          />
        </FoodPlaceDialog>
      )}

      {selected && !editor && (
        <FoodPlaceDialog
          title={selected.name}
          onClose={() => setSelectedId(null)}
        >
          <div>
            <div className="food__details-head">
              <span
                className="food__chip"
                style={{ "--marker-color": selected.markerColor } as CSSProperties}
                aria-hidden="true"
              >
                {selected.markerIcon}
              </span>
              <h2>{selected.name}</h2>
            </div>
            {selected.address && <p className="food__address">{selected.address}</p>}
            <StarRating value={selected.rating} />
            {selected.mediaIds.length > 0 && (
              <ul className="food__gallery" aria-label={t("Photos")}>
                {selected.mediaIds.map((mediaId) => (
                  <li key={mediaId}>
                    <img src={mediaPreviewUrl(mediaId)} alt="" loading="lazy" />
                  </li>
                ))}
              </ul>
            )}
            {selected.note
              ? <p className="food__note">{selected.note}</p>
              : <p className="food__hint">{t("No note yet.")}</p>}
            <p className="food__coordinate-readout">
              {selected.latitude.toFixed(6)}, {selected.longitude.toFixed(6)}
            </p>
            <p className="food__hint">{t("Added by {username}", { username: selected.owner.username })}</p>
            {canEdit(selected) ? (
              <div className="food__form-actions">
                <Button variant="secondary" onClick={() => startEdit(selected)}>{t("Edit")}</Button>
                <Button variant="danger" onClick={() => {
                  setPlaceToDelete(selected);
                  setSelectedId(null);
                }}>{t("Delete")}</Button>
              </div>
            ) : (
              <p className="food__hint">{t("Only the owner or an administrator can change this food place.")}</p>
            )}
          </div>
        </FoodPlaceDialog>
      )}

      {homeDialogOpen && home.query.isSuccess && (
        <FoodPlaceDialog
          title={t("Home location")}
          onClose={() => setHomeDialogOpen(false)}
        >
          <div className="food__home-dialog">
            {home.query.data ? (
              <>
                <p className="food__coordinate-readout">
                  {home.query.data.latitude.toFixed(6)}, {home.query.data.longitude.toFixed(6)}
                </p>
                <div className="food__form-actions">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setHomeDialogOpen(false);
                      setHomePromptDismissed(false);
                      setManualHomePick(true);
                    }}
                  >
                    {t("Change home location")}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setHomeDialogOpen(false);
                      setConfirmHomeRemoval(true);
                    }}
                  >
                    {t("Remove home marker")}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p>{t("Home not set.")}</p>
                <div className="food__form-actions">
                  <Button
                    onClick={() => {
                      setHomeDialogOpen(false);
                      setHomePromptDismissed(false);
                      setManualHomePick(true);
                    }}
                  >
                    {t("Add now")}
                  </Button>
                </div>
              </>
            )}
          </div>
        </FoodPlaceDialog>
      )}

      {placeToDelete && (
        <ConfirmationDialog
          title="Delete this food place?"
          danger
          onConfirm={confirmDelete}
          onClose={() => setPlaceToDelete(null)}
        >
          <p>{t("{name} will be removed from the map.", { name: placeToDelete.name })}</p>
        </ConfirmationDialog>
      )}
      {confirmHomeRemoval && (
        <ConfirmationDialog
          title="Remove your home location?"
          danger
          onConfirm={removeHomeLocation}
          onClose={() => setConfirmHomeRemoval(false)}
        >
          <p>{t("The home marker will be removed. You can set it again later.")}</p>
        </ConfirmationDialog>
      )}
    </main>
  );
}
