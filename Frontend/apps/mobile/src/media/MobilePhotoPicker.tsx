import { FileUploadProgress } from "@/features/uploads/components/FileUploadProgress";
import { CustomDialog as Dialog } from "@/components/ui/CustomDialog";
import * as Tabs from "@radix-ui/react-tabs";
import { HighlightItem } from "@animate-ui/react/primitives/effects/highlight";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { UploadLift } from "@/components/animate-ui/icons/upload-lift";
import { Button, ErrorState, NavigationHighlight, Spinner } from "@/components/ui";
import { mediaPreviewUrl } from "@/utils/media";
import { usePhotoPicker, type PhotoPickerProps } from "@/features/media/components/usePhotoPicker";

const sources = [{ value: "gallery", label: "Gallery" }, { value: "preview", label: "Preview" }] as const;

export function MobilePhotoPicker(props: PhotoPickerProps) {
  const { selectedIds = [], backdropClassName = "", viewportClassName = "" } = props;
  const { t, inputRef, bodyRef, selectedRef, source, picked, setPicked, initialized, tabId, initialImage, query, busy, dialogProps, viewportStyle, full, images, upload, previewTransfer, cancelPreviewUpload, dismissPreviewUpload, close, changeSource, handleScroll, confirm } = usePhotoPicker(props);
  return (
    <Dialog.Root {...dialogProps}>
      <Dialog.Portal>
        <Dialog.Backdrop className={`confirmation-dialog-backdrop ${backdropClassName}`} />
        <Dialog.Viewport className={`confirmation-dialog-viewport ${viewportClassName}`} style={viewportStyle}>
          <Dialog.Popup className="place-picker" aria-busy={busy} initialFocus={() => selectedRef.current ?? bodyRef.current}>
            <header className="place-picker__header">
              <div>
                <Dialog.Title className="place-picker__title">{t("Choose photos")}</Dialog.Title>
                <Dialog.Description className="place-picker__count">
                  {t("{count} of {max} selected", { count: picked ? 1 : 0, max: 1 })}
                </Dialog.Description>
              </div>
            </header>
            <Tabs.Root className="photo-picker__tabs" value={source} onValueChange={changeSource}>
              <Tabs.List className="navigation-highlight-bar photo-picker__tab-list" aria-label={t("Photo source")}>
                <NavigationHighlight value={source}>
                  {sources.map(({ value, label }) => (
                    <HighlightItem key={value} value={value} asChild>
                      <Tabs.Trigger id={`${tabId}-${value}`} value={value}
                        disabled={busy || !initialized}>
                        {t(label)}
                      </Tabs.Trigger>
                    </HighlightItem>
                  ))}
                </NavigationHighlight>
              </Tabs.List>
              <div ref={bodyRef} className="place-picker__body" role="tabpanel" tabIndex={-1} aria-labelledby={`${tabId}-${source}`}
                onScroll={handleScroll}>
                {!initialized ? initialImage.isError ? (
                  <ErrorState message={t("Could not load media.")} onRetry={() => void initialImage.refetch()} />
                ) : <Spinner label={t("Loading images...")} /> : (
                  <>
                    <input ref={inputRef} type="file" accept="image/*" hidden onChange={(event) => {
                      void upload(event.currentTarget.files?.[0]);
                      event.currentTarget.value = "";
                    }} />
                    <div className="place-picker__grid" role="group" aria-label={t("Choose photos")}>
                      {source === "preview" && <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                        <button type="button" className="place-picker__item place-picker__upload"
                          disabled={busy || full} onClick={() => inputRef.current?.click()}>
                          {busy ? <Spinner label={t("Uploading...")} /> : <><UploadLift size={28} aria-hidden="true" />{t("Upload")}</>}
                        </button>
                      </AnimateIcon>}
                      {images.map((image) => (
                        <button key={image.id} ref={picked?.id === image.id ? selectedRef : undefined} type="button"
                          className="place-picker__item" aria-pressed={picked?.id === image.id}
                          aria-label={image.originalFilename} title={image.originalFilename}
                          disabled={busy || (full && !selectedIds.includes(image.id))}
                          onClick={() => setPicked(image)}>
                          <img src={mediaPreviewUrl(image.id)} alt="" loading="lazy" />
                          {picked?.id === image.id && <span className="place-picker__badge" aria-hidden="true">1</span>}
                        </button>
                      ))}
                    </div>
                    {query.isPending || query.isFetchingNextPage ? <Spinner label={t("Loading images...")} /> : null}
                    {query.isError && !query.isFetchNextPageError ? (
                      <ErrorState message={t("Could not load media.")} onRetry={() => void query.refetch()} />
                    ) : null}
                    {query.isSuccess && images.length === 0 ? <p className="album-photo-picker__note">{t("No images yet.")}</p> : null}
                    {query.isFetchNextPageError ? <Button type="button" className="dialog-action dialog-action--normal place-picker__more"
                      onClick={() => void query.fetchNextPage()}>{t("Load more")}</Button> : null}
                  </>
                )}
              </div>
            </Tabs.Root>
            <footer className="place-picker__footer">
              {previewTransfer && <FileUploadProgress name={previewTransfer.file.name} progress={previewTransfer.progress}
                onCancel={cancelPreviewUpload} onRetry={source === "preview" && !full ? () => void upload(previewTransfer.file) : undefined}
                onDismiss={dismissPreviewUpload} />}
              <div className="place-picker__actions dialog-actions">
                <Button type="button" variant="danger" className="dialog-action dialog-action--danger place-picker__cancel" disabled={busy} onClick={() => close()}>{t("Cancel")}</Button>
                <Button type="button" className="dialog-action dialog-action--normal" disabled={busy || !initialized || (!picked && selectedIds.length > 0)} onClick={confirm}>{t("Done")}</Button>
              </div>
            </footer>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
