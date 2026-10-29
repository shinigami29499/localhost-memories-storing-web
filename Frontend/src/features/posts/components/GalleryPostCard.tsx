import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import { Checkbox } from "@animate-ui/react/primitives/base-ui/checkbox";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { Check } from "@/components/animate-ui/icons/check";
import { Clapperboard } from "@/components/animate-ui/icons/clapperboard";
import { useLocale } from "../../../context/LocaleContext";
import { mediaUrl } from "../../../utils/media";
import type { Post } from "../types";

interface Props {
  post: Post;
  onOpen?: (post: Post) => void;
  selectionMode?: boolean;
  selected?: boolean;
  onSelect?: (postId: string, selected: boolean) => void;
  onLongPress?: (postId: string) => void;
  savedCollectionCount?: number;
  onSavedCollectionClick?: () => void;
}

const LONG_PRESS_DELAY = 550;
const LONG_PRESS_MOVE_TOLERANCE = 12;

export function GalleryPostCard({
  post,
  onOpen,
  selectionMode = false,
  selected = false,
  onSelect,
  onLongPress,
  savedCollectionCount = 0,
  onSavedCollectionClick,
}: Props) {
  const { t } = useLocale();
  const [failedId, setFailedId] = useState<string | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  const skipClick = useRef(false);
  const file = post.media[0];
  const failed = file && failedId === file.id;
  const content = (
    <>
      {!file || failed ? (
        <span className="gallery-card__placeholder">{t(failed ? "Could not load this media." : "No media")}</span>
      ) : file.mediaKind === "video" ? (
        <video src={mediaUrl(file.id)} preload="metadata" muted playsInline aria-hidden="true" onError={() => setFailedId(file.id)} />
      ) : (
        <img src={mediaUrl(file.id)} alt="" loading="lazy" onError={() => setFailedId(file.id)} />
      )}
      {file?.mediaKind === "video" ? (
        <span className="gallery-card__kind" aria-label={t("Video")}><Clapperboard size={16} aria-hidden="true" /></span>
      ) : null}
      {post.mediaCount > 1 ? <span className="gallery-card__more">+{post.mediaCount - 1}</span> : null}
    </>
  );
  const clearPress = () => {
    if (pressTimer.current !== null) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pressOrigin.current = null;
  };
  const startPress = (event: PointerEvent<HTMLButtonElement>) => {
    if (!onLongPress || event.button !== 0) return;
    clearPress();
    pressOrigin.current = { x: event.clientX, y: event.clientY };
    pressTimer.current = setTimeout(() => {
      pressTimer.current = null;
      skipClick.current = true;
      onLongPress(post.id);
    }, LONG_PRESS_DELAY);
  };
  const movePress = (event: PointerEvent<HTMLButtonElement>) => {
    const origin = pressOrigin.current;
    if (!origin) return;
    if (
      Math.abs(event.clientX - origin.x) > LONG_PRESS_MOVE_TOLERANCE
      || Math.abs(event.clientY - origin.y) > LONG_PRESS_MOVE_TOLERANCE
    ) clearPress();
  };
  const finishPress = () => {
    clearPress();
    window.setTimeout(() => { skipClick.current = false; }, 0);
  };
  const openOrSelect = () => {
    if (skipClick.current) {
      skipClick.current = false;
      return;
    }
    if (selectionMode) {
      onSelect?.(post.id, !selected);
      return;
    }
    onOpen?.(post);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!selectionMode && onLongPress && event.shiftKey && event.key === " ") {
      event.preventDefault();
      onLongPress(post.id);
    }
  };

  return (
    <article className={`gallery-card${selected ? " gallery-card--selected" : ""}`}>
      <div className="gallery-card__frame">
        {onOpen ? (
          <button
            type="button"
            className="gallery-card__media"
            aria-label={t(selectionMode ? (selected ? "Deselect post by {username}" : "Select post by {username}") : "View media by {username}", { username: post.author.username })}
            aria-description={!selectionMode && onLongPress ? t("Hold to select, or press Shift+Space.") : undefined}
            aria-pressed={selectionMode ? selected : undefined}
            onClick={openOrSelect}
            onKeyDown={handleKeyDown}
            onPointerDown={selectionMode ? undefined : startPress}
            onPointerMove={movePress}
            onPointerUp={finishPress}
            onPointerCancel={finishPress}
            onContextMenu={(event) => {
              if (onLongPress) event.preventDefault();
            }}
          >
            {content}
          </button>
        ) : (
          <Link
            to={`/posts/${post.id}`}
            className="gallery-card__media"
            aria-label={t("View post by {username}", { username: post.author.username })}
          >
            {content}
          </Link>
        )}
        {selectionMode ? (
          <Checkbox.Root
            checked={selected}
            className="gallery-card__checkbox"
            aria-label={t(selected ? "Deselect post by {username}" : "Select post by {username}", { username: post.author.username })}
            onCheckedChange={(checked) => onSelect?.(post.id, checked === true)}
          >
            <Checkbox.Indicator>
              <Check size={16} aria-hidden="true" />
            </Checkbox.Indicator>
          </Checkbox.Root>
        ) : null}
        {!selectionMode && savedCollectionCount > 0 && onSavedCollectionClick ? (
          <button
            type="button"
            className="gallery-card__saved"
            aria-label={t("Open saved collections for post by {username}", { username: post.author.username })}
            title={t("Open saved collections")}
            onClick={onSavedCollectionClick}
          >
            <Bookmark size={18} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </article>
  );
}
