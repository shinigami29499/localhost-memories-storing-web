import { registerUiModule } from "@/features/ui-resources/uiModules";
import { PageDataPlaceholder } from "@/components/ui/PageDataPlaceholder";
import { PushTransition } from "@/hooks/PushTransition";
import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState, useMemo, type ComponentType, type CSSProperties } from "react";
import { HighlightItem } from "@animate-ui/react/primitives/effects/highlight";
import { NavigationHighlight, SwapLabel } from "@/components/ui";
import { PageHighlightBar } from "@/components/ui/PageHighlightBar";
import { cloneMobileSearchFooter, PageActionBar, usePageActionBarFooter } from "@/components/layout/PageActionBar";
import {
  Button,
  ConfirmationDialog,
  EmptyState,
  ErrorState,
  Spinner,
  showToast,
} from "@/components/ui";
import { CalendarCheck } from "@/components/animate-ui/icons/calendar-check";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Send } from "@/components/animate-ui/icons/send";
import { Pencil } from "@/components/animate-ui/icons/pencil";
import { Search } from "@/components/animate-ui/icons/search";
import { useLocale } from "@/context/LocaleContext";
import { useAuthStore } from "@/store/authStore";
import { ApiError } from "@/services/api";
import { useHomeLocation } from "@/features/locations/hooks/useHomeLocation";
import { useLocations } from "@/features/locations/hooks/useLocations";
import { useMapBounds } from "@/features/locations/hooks/useMapBounds";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { HeaderFilters, inDateRange } from "@/components/ui/HeaderFilters";
import { cityFromAddress } from "@/features/place/cityFromAddress";
import { locationService } from "@/features/locations/services/locationService";
import { LocationEditor } from "@/features/locations/components/LocationEditor";
import { useAnimationStore } from "@/store/animationStore";
import { MapLoadingOverlay } from "@/features/locations/components/MapLoadingOverlay";
import "../../../../../src/features/locations/components/mapControls.css";
import type { PlaceMapSettings } from "@/features/place/components/PlaceMap";
import { AddNavigationToolbar } from "@/features/navigation/components/AddNavigationToolbar";
import { placeService } from "@/features/place/services/placeService";
import { PlaceDialog } from "@/features/place/components/PlaceDialog";
import { SinglePlaceVisitHistory } from "@/features/place/components/SinglePlaceVisitHistory";
import { PlaceVisitHistory } from "@/features/place/components/PlaceVisitHistory";
import {
  PlaceEditor,
  type PlaceFormValues,
} from "@/features/place/components/PlaceEditor";
import { StarRating } from "@/features/place/components/StarRating";
import { Star } from "@/components/animate-ui/icons/star";
import {
  useCheckInPlace,
  useDeletePlace,
  useDeletePlaceVisit,
  useInfinitePlaceVisitHistory,
  usePlaceVisitHistory,
  useInfinitePlaces,
  usePlaces,
  useInfiniteMapPlaces,
  usePlace,
  usePlaceVisits,
  useSavePlace,
} from "@/features/place/hooks/usePlaces";
import {
  DEFAULT_PLACE_MARKER_COLOR,
  DEFAULT_PLACE_MARKER_ICON,
  type PlaceCoordinate,
  type Place,
} from "@/features/place/types";
import type { MediaFile, PickedLocation } from "@/features/media/types";
import "./place.css";

const PlaceMap = lazy(registerUiModule("Place map", () => import("@/features/place/components/PlaceMap").then((module) => ({ default: module.PlaceMap }))));

export type PlaceView = "map" | "saved" | "history";
export interface PlaceViewSwitchProps { view: PlaceView; onChange: (view: PlaceView) => void }

function PlaceViewSwitch({ view, onChange }: PlaceViewSwitchProps) {
  const { t } = useLocale();

  return (
    <div className="navigation-highlight-bar place__view-switch" role="group" aria-label={t("Place view")}>
      <NavigationHighlight value={view}>
        {([ ["map", "Map"], ["saved", "Saved"], ["history", "History"] ] as const).map(([value, label], index) => (
          <HighlightItem key={value} value={value} asChild>
            <button type="button" aria-pressed={view === value}
              onClick={() => onChange(value)}>
              <SwapLabel text={t(label)} index={index} />
            </button>
          </HighlightItem>
        ))}
      </NavigationHighlight>
    </div>
  );
}

import { emptyValues, usePlacePageController } from "@/pages/place/usePlacePageController";

export function PlacePage({ ViewSwitch = PlaceViewSwitch }: {
  ViewSwitch?: ComponentType<PlaceViewSwitchProps>;
} = {}) {
  const { t, location, isMobile, user, home, view, animationsEnabled, requestView, mapSettings, saved, mapStartReady, setMapStartReady, setHighlightMotionVersion, addToolbar, setAddToolbar, city, setCity, owner, setOwner, dateFrom, setDateFrom, dateTo, setDateTo, hasLocationFilters, placeSearch, setPlaceSearch, minimumRating, historySearch, setHistorySearch, historyMinimumRating, activeRating, setActiveRating, historySentinel, photoSelection, setPhotoSelection, handleMapBounds, photos, photosQuery, savedPlaces, mapPlacesQuery, query, save, remove, checkInMutation, removeVisitMutation, editor, setEditor, editorOpen, setEditorOpen, selectedId, setSelectedId, detailsOpen, setDetailsOpen, visitHistory, historyQuery, historyVisits, formError, setFormError, placeToDelete, setPlaceToDelete, confirmingDetailDeleteId, setConfirmingDetailDeleteId, placeToMove, setPlaceToMove, moveConfirmationOpen, setMoveConfirmationOpen, workspaceRef, manualHomePick, setManualHomePick, homeRelocationDraft, setHomeRelocationDraft, homeMoveConfirmationOpen, setHomeMoveConfirmationOpen, homeDialogOpen, setHomeDialogOpen, confirmHomeRemoval, setConfirmHomeRemoval, photoMoveConfirmationOpen, setPhotoMoveConfirmationOpen, places, filteredPlaces, cityOptions, ownerOptions, homePicking, selected, selectedVisits, selectedPhoto, photoRelocating, canEdit, canChangeMarker, mapPlaces, clearPreview, canMovePhoto, selectPhoto, movePhoto, confirmPhotoMove, pickHome, confirmHomeRelocation, cancelHomePick, startHomePick, openHomeDialog, removeHomeLocation, checkIn, removeVisit, startEdit, selectPlace, pickOnMap, cancelMapPick, movePlace, deletePlace, confirmMove, submit, confirmDelete } = usePlacePageController();
  const navigateToAlbums = useNavigate();


  const headerActions = document.getElementById("page-header-actions");
  const searchForm = (
          <form className={`place__search-bar${isMobile ? "" : " place__search-bar--header"}${activeRating > 0 ? " place__search-bar--rating-filtered" : ""}`} role="search" onSubmit={(event) => event.preventDefault()}>
            <input type="search" aria-label={t(view === "history" ? "Search visit history" : "Search saved places")}
              placeholder={t("Search places or users")} value={view === "history" ? historySearch : placeSearch} maxLength={120}
              onChange={(event) => view === "history" ? setHistorySearch(event.target.value) : setPlaceSearch(event.target.value)} />
            <div className="place__rating-controls" style={{ flexBasis: `${40 + Math.max(0, activeRating - 1) * 8}px` }}>
              {activeRating > 0 && (
                <button type="button" className="place__rating-filter-clear" aria-label={t("Clear rating filter")}
                  title={t("Clear rating filter")} onClick={() => setActiveRating(0)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                  </svg>
                </button>
              )}
              <button type="button" className="place__rating-filter" aria-label={`${t("Filter places by average rating")}: ${activeRating}`}
                title={t("Filter places by average rating")} aria-pressed={activeRating > 0}
                onClick={() => setActiveRating((rating) => rating === 5 ? 0 : rating + 1)}>
                {Array.from({ length: Math.max(1, activeRating) }, (_, index) => (
                  <Star key={index} className={animationsEnabled ? "place__rating-star--animated" : undefined}
                    size={20} fill={activeRating > 0 ? "currentColor" : "none"} aria-hidden="true" />
                ))}
              </button>
            </div>
            {(view === "history" ? historySearch : placeSearch) && (
              <>
                <span className="place__search-divider" aria-hidden="true" />
                <button type="button" className="place__search-clear" aria-label={t("Clear search")}
                  title={t("Clear search")} onClick={() => view === "history" ? setHistorySearch("") : setPlaceSearch("")}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                  </svg>
                </button>
              </>
            )}
            <AnimateIcon animateOnHover animateOnTap={false} completeOnStop asChild>
              <span className="place__search-icon" aria-hidden="true">
                <Search size={22} />
              </span>
            </AnimateIcon>
          </form>
  );

  return (
    <main className={`place${saved ? " place--saved" : ""}`}>
        <div className="place__content">
          <div className="place__scroll-inner">
            {editor && !editor.coordinate && (
              <div className="place__notice" role="status">
                <span>{t("Click the map, use your current location, or select a place label to set the marker.")}</span>
                <Button type="button" variant="secondary" onClick={cancelMapPick}>
                  {t("Cancel")}
                </Button>
              </div>
            )}
            {manualHomePick && (
              <div className="place__notice" role="status">
                <span>{t("Click the map to set your home location.")}</span>
                <Button type="button" variant="secondary" disabled={home.save.isPending} onClick={cancelHomePick}>
                  {t("Cancel")}
                </Button>
              </div>
            )}

            <PageHighlightBar id="place-navigation" label="location navigation" onToggle={() => {
              if (!saved && animationsEnabled && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                setMapStartReady(false);
                setHighlightMotionVersion((version) => version + 1);
              }
            }}><ViewSwitch view={view} onChange={requestView} /></PageHighlightBar>
            {!saved && !homeRelocationDraft && (!addToolbar || addToolbar.visible) && <AddNavigationToolbar onAdd={addToolbar?.add ?? (() => {})} disabled={addToolbar?.disabled ?? true} />}
            <div className="place__view-content" data-push-page-content aria-busy={view === "history" && historyQuery.isPending || undefined}>
            <PushTransition transitionKey={view} />
            <>
            {!saved && (
              <>
                {mapPlacesQuery.isError && !places.length ? (
                  <ErrorState message={t("Could not load places.")} onRetry={() => void mapPlacesQuery.refetch()} />
                ) : null}
                <div ref={workspaceRef} className="place__workspace">
                  <div className="place__map-panel">
                    {!mapStartReady ? <MapLoadingOverlay ready={false} className="map-loading-overlay" /> : <Suspense fallback={<MapLoadingOverlay ready={false} className="map-loading-overlay" />}><PlaceMap
                      onAddToolbarChange={setAddToolbar}
                      settingsRef={mapSettings}
                      onBoundsChange={handleMapBounds}
                      places={mapPlaces}
                      photos={photos}
                      selectedPhoto={selectedPhoto}
                      photoRelocating={photoRelocating}
                      canMovePhoto={canMovePhoto}
                      onSelectPhoto={selectPhoto}
                      onMovePhoto={movePhoto}
                      onEditPhoto={(photo) => setPhotoSelection({ id: photo.id, draft: photo.location ?? null, editing: true })}
                      onConfirmPhotoMove={() => setPhotoMoveConfirmationOpen(true)}
                      selectedId={selectedId}
                      draft={photoRelocating ? photoSelection?.draft ?? null : placeToMove?.coordinate ?? editor?.coordinate ?? null}
                      relocatingPlace={placeToMove?.place ?? null}
                      picking={!!editor && !editorOpen}
                      editorOpen={editorOpen}
                      homeLocation={home.query.data ?? null}
                      homeLocationReady={home.query.isFetched}
                      homeActionDisabled={save.isPending || remove.isPending || home.save.isPending}
                      onBrowseAlbums={() => navigateToAlbums("/album")}

                      homePicking={homePicking}
                      homeRelocationDraft={homeRelocationDraft}
                      onSelect={selectPlace}
                      onEdit={(place) => {
                        void placeService.get(place.id).then(startEdit).catch(() => showToast.error(t("Could not load places.")));
                      }}
                      onEditDraft={() => setEditorOpen(true)}
                      onConfirmRelocation={() => setMoveConfirmationOpen(true)}
                      onCancelRelocation={() => { setMoveConfirmationOpen(false); setPlaceToMove(null); }}
                      onCancelSelection={() => { clearPreview(); setPhotoMoveConfirmationOpen(false); }}
                      onCancelDraft={cancelMapPick}
                      canChange={canChangeMarker}
                      onMove={movePlace}
                      onDelete={deletePlace}
                      onPickHome={pickHome}
                      onMoveHome={(coordinate) => {
                        clearPreview();
                        setEditor(null);
                        setEditorOpen(false);
                        setManualHomePick(false);
                        setHomeRelocationDraft(coordinate);
                      }}
                      onConfirmHomeRelocation={() => setHomeMoveConfirmationOpen(true)}
                      onCancelHomeRelocation={() => { setHomeMoveConfirmationOpen(false); setHomeRelocationDraft(null); }}
                      onCreateAtCurrentLocation={(coordinate) => {
                        setSelectedId(null);
                        setDetailsOpen(false);
                        setFormError(null);
                        setEditor({ coordinate, values: { ...emptyValues } });
                        setEditorOpen(true);
                      }}
                      onHomeClick={() => {
                        setPhotoSelection(null);
                        setSelectedId(null);
                        setEditor(null);
                        setEditorOpen(false);
                        setFormError(null);
                        setManualHomePick(false);
                        if (!home.query.data) openHomeDialog();
                      }}
                      onPick={(coordinate, placeName) => {
                        if (photoRelocating && selectedPhoto) setPhotoSelection((current) => current?.id === selectedPhoto.id ? { ...current, draft: coordinate } : current);
                        else if (placeToMove) setPlaceToMove((current) => current ? { ...current, coordinate } : current);
                        else pickOnMap(coordinate, placeName);
                      }}
                    /></Suspense>}
                  </div>
                </div>
                {mapPlacesQuery.isFetchNextPageError ? (
                  <ErrorState message={t("Could not load more places.")} onRetry={() => void mapPlacesQuery.fetchNextPage()} />
                ) : mapPlacesQuery.hasNextPage ? (
                  <div className="place__photo-pages">
                    <span>{t("Showing {count} of {total} places in this area.", {
                      count: places.length, total: mapPlacesQuery.data?.pages[0]?.total ?? places.length,
                    })}</span>
                    <Button type="button" variant="secondary"
                      disabled={mapPlacesQuery.isFetchingNextPage || mapPlacesQuery.isPlaceholderData}
                      onClick={() => void mapPlacesQuery.fetchNextPage()}>
                      {t(mapPlacesQuery.isFetchingNextPage ? "Loading places..." : "Load more places")}
                    </Button>
                  </div>
                ) : null}
                {photosQuery.isError && !photos.length ? (
                  <ErrorState message={t("Could not load photos.")} onRetry={() => void photosQuery.refetch()} />
                ) : photosQuery.isFetchNextPageError ? (
                  <ErrorState message={t("Could not load more photos.")} onRetry={() => void photosQuery.fetchNextPage()} />
                ) : photosQuery.hasNextPage ? (
                  <div className="place__photo-pages">
                    <span>{t("Showing {count} of {total} photos in this area.", {
                      count: photosQuery.data?.pages.reduce((sum, page) => sum + page.items.length, 0) ?? 0,
                      total: photosQuery.data?.pages[0]?.total ?? 0,
                    })}</span>
                    <Button type="button" variant="secondary" disabled={photosQuery.isFetchingNextPage || photosQuery.isPlaceholderData}
                      onClick={() => void photosQuery.fetchNextPage()}>
                      {t(photosQuery.isFetchingNextPage ? "Loading photos..." : "Load more photos")}
                    </Button>
                  </div>
                ) : null}
              </>
            )}
            {saved && (
            view === "history" ? (
              <div className="place__history-panel">
                {historyQuery.isError && !historyVisits.length ? (
                  <ErrorState
                    message={t("Could not load visit history.")}
                    onRetry={() => void historyQuery.refetch()}
                  />
                ) : historyQuery.isPending ? <PageDataPlaceholder label={t("Loading...")} /> : historyVisits.length ? (
                  <PlaceVisitHistory
                    visits={historyVisits}
                    onShowOnMap={(visit) => { setSelectedId(visit.placeId); setDetailsOpen(false); requestView("map"); }}
                    showVisitor
                    showVisitorName
                    onRemove={removeVisit}
                    removingVisitId={removeVisitMutation.isPending ? removeVisitMutation.variables : null}
                  />
                ) : (
                  <EmptyState title={historySearch || historyMinimumRating || hasLocationFilters ? "No matching places" : "No visits yet"} hint={historySearch || historyMinimumRating || hasLocationFilters ? "Try a different search to find a visit." : "Your visit history will appear here after a check-in."} />
                )}
                {!historySearch.trim() && !historyMinimumRating && !hasLocationFilters && visitHistory.isFetchNextPageError && <ErrorState message={t("Could not load more visits.")} onRetry={() => void visitHistory.fetchNextPage()} />}
                {!historySearch.trim() && !historyMinimumRating && !hasLocationFilters && visitHistory.hasNextPage && <div ref={historySentinel}>{visitHistory.isFetchingNextPage && <Spinner />}</div>}
              </div>
            ) : query.isLoading ? <PageDataPlaceholder label={t("Loading places...")} /> : query.isError && !places.length ? (
              <ErrorState message="Could not load places." onRetry={() => void query.refetch()} />
            ) : (
              <>
                {!filteredPlaces.length ? (
                  <EmptyState title={placeSearch || minimumRating || hasLocationFilters ? "No matching places" : "No saved places yet"}
                    hint={placeSearch || minimumRating || hasLocationFilters
                      ? "Try a different search to find a saved place."
                      : "Saved places will appear here."}
                    action={!placeSearch && !minimumRating && !hasLocationFilters ? <Button type="button" variant="secondary" onClick={() => requestView("map")}>{t("Open map")}</Button> : undefined} />
                ) : (
                  <>
                    <ul className="place__list">
                      {filteredPlaces.map((place) => (
                        <li key={place.id}>
                          <button
                            type="button"
                            className="place__card"
                            aria-pressed={selectedId === place.id}
                            disabled={!!editor && editor.id !== place.id}
                            onClick={() => selectPlace(place)}
                          >
                            <span
                              className="place__chip"
                              style={{ "--marker-color": place.markerColor } as CSSProperties}
                              aria-hidden="true"
                            >
                              {place.markerIcon}
                            </span>
                            <span className="place__card-body">
                              <strong className="place__card-name">{place.name}</strong>
                              {isMobile ? <>
                                {place.address && <small>{place.address}</small>}
                                <StarRating value={place.rating} size="sm" />
                                <small className="place__card-owner">{place.owner.username}</small>
                              </> : <>
                                <small className="place__card-city">{t("at {city}", { city: "{city}" }).split("{city}").map((part, index) => index === 0 ? part : <span key={index}><strong>{place.city || cityFromAddress(place.address) || t("Unknown city")}</strong>{part}</span>)}</small>
                                <small className="place__card-owner">{t("by {user}", { user: "{user}" }).split("{user}").map((part, index) => index === 0 ? part : <span key={index}><strong>{place.owner.username}</strong>{part}</span>)}</small>
                                <StarRating value={place.rating} size="sm" />
                              </>}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {!hasLocationFilters && savedPlaces.isFetchNextPageError ? (
                  <ErrorState message={t("Could not load more places.")}
                    onRetry={() => void savedPlaces.fetchNextPage()} />
                ) : null}
                {!hasLocationFilters && savedPlaces.hasNextPage ? (
                  <Button type="button" variant="secondary" disabled={savedPlaces.isFetchingNextPage}
                    onClick={() => void savedPlaces.fetchNextPage()}>
                    {t(savedPlaces.isFetchingNextPage ? "Loading places..." : "Load more places")}
                  </Button>
                ) : null}
              </>
            )
            )}
        {saved && (isMobile ? <PageActionBar className="place__action-bar">{searchForm}</PageActionBar>
          : headerActions ? createPortal(<div className="header-search-controls">{searchForm}<HeaderFilters selects={[{ label: "City", value: city, onChange: setCity, options: cityOptions }, { label: "User", value: owner, onChange: setOwner, options: ownerOptions }]} date={{ label: view === "history" ? "Visited" : "Last check-in", from: dateFrom, to: dateTo, setFrom: setDateFrom, setTo: setDateTo }} /></div>, headerActions) : searchForm)}
            </>
            </div>

            {editorOpen && editor?.coordinate && (
              <PlaceDialog
                title={t(editor.id ? "Edit place" : "New place")}
                className="place__dialog--editor"
                closeDisabled={save.isPending}
                onClose={() => {
                  if (!save.isPending) {
                    setEditor(null);
                    setEditorOpen(false);
                    setFormError(null);
                  }
                }}
              >
                <PlaceEditor
                  values={editor.values}
                  coordinate={editor.coordinate}
                  saving={save.isPending}
                  isNew={!editor.id}
                  error={formError}
                  onChange={(values) => setEditor((current) => current ? { ...current, values } : current)}
                  onSubmit={() => void submit()}
                  onCancel={() => { setEditor(null); setEditorOpen(false); setFormError(null); }}
                />
              </PlaceDialog>
            )}

            {selected && !editor && detailsOpen && (
              <PlaceDialog
                className="place__dialog--details"
                title={selected.name}
                subtitle={t("Added by {username}", { username: selected.owner.username })}
                icon={
                  <span
                    className="place__chip"
                    style={{ "--marker-color": selected.markerColor } as CSSProperties}
                    aria-hidden="true"
                  >
                    {selected.markerIcon}
                  </span>
                }
                onClose={() => { setConfirmingDetailDeleteId(null); clearPreview(); }}
              >
                <div>
                  {selected.address && <p className="place__address">{selected.address}</p>}
                  <div className="place__details-rating">
                    <span className="place__average-rating">{selected.rating.toFixed(1)}</span>
                    <StarRating value={selected.rating} hideReadout />
                    {selectedVisits.data && <span className="place__check-in-count">
                      {t(selectedVisits.data.total === 1 ? "{count} check-in" : "{count} check-ins", { count: selectedVisits.data.total })}
                    </span>}
                  </div>
                  <div className="place__form-actions place__details-check-in">
                    <Button
                      type="button"
                      className="dialog-action dialog-action--normal place__check-in-action"
                      busy={checkInMutation.isPending}
                      onClick={() => void checkIn(selected)}
                    >
                      <CalendarCheck size={16} aria-hidden="true" />
                      {t("Check in")}
                    </Button>
                  </div>
                  <SinglePlaceVisitHistory placeId={selected.id} onShowOnMap={saved ? (visit) => { setSelectedId(visit.placeId); setDetailsOpen(false); requestView("map"); } : undefined} />
                  {canEdit(selected) && (
                    <>
                      <div className="dialog-actions place__details-actions">
                        {confirmingDetailDeleteId === selected.id ? <>
                          <Button type="button" variant="danger" className="dialog-action dialog-action--danger" autoFocus disabled={remove.isPending}
                            onClick={() => setConfirmingDetailDeleteId(null)}>{t("Cancel")}</Button>
                          <Button type="button" variant="danger" className="dialog-action dialog-action--danger-confirm" busy={remove.isPending}
                            onClick={() => void remove.mutateAsync(selected.id).then(() => {
                              setConfirmingDetailDeleteId(null);
                              clearPreview();
                              showToast.delete(t("Place deleted."));
                            }).catch((error: unknown) => {
                              showToast.error(error instanceof ApiError ? error.message : t("Could not complete this action. Please retry."));
                            })}>{t("Delete place")}</Button>
                        </> : <>
                          <Button type="button" variant="danger" className="dialog-action dialog-action--danger" onClick={() => setConfirmingDetailDeleteId(selected.id)}>
                            {t("Delete")}
                          </Button>
                          <Button type="button" className="dialog-action dialog-action--normal place__edit-action" onClick={() => startEdit(selected)}>
                            <Pencil size={16} aria-hidden="true" />
                            {t("Edit")}
                          </Button>
                        </>}
                      </div>
                      {confirmingDetailDeleteId === selected.id && <p className="dialog-actions__note place__details-delete-note">
                        {t("{name} will be removed from the map.", { name: selected.name })}
                      </p>}
                    </>
                  )}
                </div>
              </PlaceDialog>
            )}

            {homeDialogOpen && (
              <PlaceDialog
                title={t("Home location")}
                className="place__dialog--home"
                onClose={() => setHomeDialogOpen(false)}
              >
                <div className="place__home-dialog">
                  {home.query.isPending || home.query.isFetching ? (
                    <Spinner />
                  ) : home.query.isError ? (
                    <>
                      <p role="alert">{t("Could not load your home location. Add it manually or retry.")}</p>
                      <div className="place__form-actions">
                        <Button type="button" className="dialog-action dialog-action--normal" onClick={startHomePick}>{t("Add manually")}</Button>
                        <Button type="button" className="dialog-action dialog-action--normal" onClick={() => void home.query.refetch()}>
                          {t("Retry")}
                        </Button>
                      </div>
                    </>
                  ) : home.query.data ? (
                    <>
                      <p className="place__coordinate-readout">
                        {home.query.data.latitude.toFixed(6)}, {home.query.data.longitude.toFixed(6)}
                      </p>
                      <div className="dialog-actions">
                        <Button
                          variant="danger"
                          className="dialog-action dialog-action--danger"
                          onClick={() => {
                            setHomeDialogOpen(false);
                            setConfirmHomeRemoval(true);
                          }}
                        >
                          {t("Remove home marker")}
                        </Button>
                        <Button
                          className="dialog-action dialog-action--normal"
                          onClick={startHomePick}
                        >
                          {t("Change home location")}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p>{t("Home not set.")}</p>
                      <div className="place__form-actions">
                        <Button
                          className="dialog-action dialog-action--normal"
                          onClick={startHomePick}
                        >
                          {t("Add now")}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </PlaceDialog>
            )}

            {placeToMove && moveConfirmationOpen && (
              <ConfirmationDialog
                title="Move this place?"
                confirmLabel="Move place"
                onConfirm={confirmMove}
                onClose={() => setMoveConfirmationOpen(false)}
              >
                <p>{t("{name} will move to {latitude}, {longitude}.", {
                  name: placeToMove.place.name,
                  latitude: placeToMove.coordinate.latitude.toFixed(6),
                  longitude: placeToMove.coordinate.longitude.toFixed(6),
                })}</p>
              </ConfirmationDialog>
            )}
            {homeRelocationDraft && homeMoveConfirmationOpen && (
              <ConfirmationDialog
                title="Change your home location?"
                confirmLabel="Change home location"
                onConfirm={confirmHomeRelocation}
                onClose={() => setHomeMoveConfirmationOpen(false)}
              >
                <p>{t("Your home marker will move to {latitude}, {longitude}.", {
                  latitude: homeRelocationDraft.latitude.toFixed(6),
                  longitude: homeRelocationDraft.longitude.toFixed(6),
                })}</p>
              </ConfirmationDialog>
            )}
            {selectedPhoto && photoRelocating && photoMoveConfirmationOpen && photoSelection?.draft && (
              <ConfirmationDialog
                title="Move this photo?"
                confirmLabel="Move photo"
                onConfirm={confirmPhotoMove}
                onClose={() => setPhotoMoveConfirmationOpen(false)}
              >
                <p>{t("{name} will move to {latitude}, {longitude}.", {
                  name: selectedPhoto.originalFilename,
                  latitude: photoSelection.draft.latitude.toFixed(6),
                  longitude: photoSelection.draft.longitude.toFixed(6),
                })}</p>
              </ConfirmationDialog>
            )}
            {placeToDelete && (
              <ConfirmationDialog
                title="Delete this place?"
                confirmLabel="Delete place"
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
                confirmLabel="Remove home location"
                danger
                onConfirm={removeHomeLocation}
                onClose={() => setConfirmHomeRemoval(false)}
              >
                <p>{t("The home marker will be removed. You can set it again later.")}</p>
              </ConfirmationDialog>
            )}
          </div>
        </div>
    </main>
  );
}
