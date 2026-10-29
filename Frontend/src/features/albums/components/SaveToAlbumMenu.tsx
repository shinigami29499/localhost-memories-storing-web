import { lazy, Suspense, useRef, useState } from "react";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { Ellipsis } from "@/components/animate-ui/icons/ellipsis";
import { useLocale } from "../../../context/LocaleContext";

// Loaded on demand so media controls do not pull dialog code until needed.
const SaveToAlbumDialog = lazy(() =>
  import("./SaveToAlbumDialog").then((module) => ({ default: module.SaveToAlbumDialog })),
);

export function SaveToAlbumMenu({ mediaIds }: { mediaIds: string[] }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <DropdownMenu.Root>
        <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
          <DropdownMenu.Trigger asChild>
            <button
              ref={triggerRef}
              type="button"
              className="btn btn--ghost album-save-menu__trigger"
              aria-label={t("Media options")}
              title={t("Media options")}
            >
              <Ellipsis size={20} aria-hidden="true" />
            </button>
          </DropdownMenu.Trigger>
        </AnimateIcon>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="album-save-menu__content"
            align="end"
            sideOffset={6}
            collisionPadding={8}
            onCloseAutoFocus={(event) => {
              if (open) event.preventDefault();
            }}
          >
            <DropdownMenu.Item
              className="album-save-menu__item"
              onSelect={() => setOpen(true)}
            >
              <Bookmark size={18} aria-hidden="true" />
              {t("Save to album")}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      {open ? (
        <Suspense fallback={null}>
          <SaveToAlbumDialog mediaIds={mediaIds} onClose={() => {
            setOpen(false);
            triggerRef.current?.focus();
          }} />
        </Suspense>
      ) : null}
    </>
  );
}
