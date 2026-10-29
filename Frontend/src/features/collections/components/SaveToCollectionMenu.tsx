import { lazy, Suspense, useRef, useState } from "react";
import { AnimateIcon } from "@animate-ui/react/icons";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { Ellipsis } from "@/components/animate-ui/icons/ellipsis";
import { useLocale } from "../../../context/LocaleContext";

// Loaded on demand so feed cards do not pull query/dialog code until the viewer saves something.
const SaveToCollectionDialog = lazy(() =>
  import("./SaveToCollectionDialog").then((module) => ({ default: module.SaveToCollectionDialog })),
);

export function SaveToCollectionMenu({ postId }: { postId: string }) {
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
              className="btn btn--ghost post-card__more"
              aria-label={t("Post options")}
              title={t("Post options")}
            >
              <Ellipsis size={20} aria-hidden="true" />
            </button>
          </DropdownMenu.Trigger>
        </AnimateIcon>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="post-card__menu"
            align="end"
            sideOffset={6}
            collisionPadding={8}
            onCloseAutoFocus={(event) => {
              if (open) event.preventDefault();
            }}
          >
            <DropdownMenu.Item
              className="post-card__menu-item"
              onSelect={() => setOpen(true)}
            >
              <Bookmark size={18} aria-hidden="true" />
              {t("Save to collection")}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      {open ? (
        <Suspense fallback={null}>
          <SaveToCollectionDialog postId={postId} onClose={() => {
            setOpen(false);
            triggerRef.current?.focus();
          }} />
        </Suspense>
      ) : null}
    </>
  );
}
