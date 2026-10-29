import { useEffect, useRef, useState } from "react";
import { AnimateIcon } from "@animate-ui/react/icons";
import { postService } from "../services/postService";
import { mentionService } from "../services/mentionService";
import { Button, showToast } from "../../../components/ui";
import { Paperclip } from "@/components/animate-ui/icons/paperclip";
import { PencilLine } from "@/components/animate-ui/icons/pencil-line";
import { SendHorizontal } from "@/components/animate-ui/icons/send-horizontal";
import { X } from "@/components/animate-ui/icons/x";
import { useLocale } from "../../../context/LocaleContext";
import type { UserSummary } from "../types";

const ACCEPTED = "image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime";
const MAX_MB = 100;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const MAX_TOTAL_GB = 20;
const MAX_TOTAL_BYTES = MAX_TOTAL_GB * 1024 * 1024 * 1024;
const MENTION_SUGGESTION_ID = "new-post-mention-suggestions";

interface MentionContext {
  start: number;
  end: number;
  query: string;
}

function findMentionContext(value: string, cursor: number): MentionContext | null {
  const match = /(?:^|[^A-Za-z0-9_@])@([A-Za-z0-9_.-]{1,64})$/.exec(value.slice(0, cursor));
  if (!match) return null;

  return {
    start: cursor - match[1].length - 1,
    end: cursor,
    query: match[1],
  };
}

interface Props {
  onSubmitted: () => void;
}

/** Feed composer: optional caption and media queued as one tracked post submission. */
export function NewPostForm({ onSubmitted }: Props) {
  const { t } = useLocale();
  const fileInput = useRef<HTMLInputElement>(null);
  const captionInput = useRef<HTMLTextAreaElement>(null);
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [mentionContext, setMentionContext] = useState<MentionContext | null>(null);
  const [mentionCandidates, setMentionCandidates] = useState<UserSummary[]>([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);

  useEffect(() => {
    if (!mentionContext) {
      setMentionCandidates([]);
      setMentionLoading(false);
      return;
    }

    let cancelled = false;
    setMentionCandidates([]);
    setMentionLoading(true);
    const timer = window.setTimeout(() => {
      void mentionService.searchCandidates(mentionContext.query)
        .then((candidates) => {
          if (!cancelled) {
            setMentionCandidates(candidates);
            setActiveMentionIndex(0);
          }
        })
        .catch((cause: unknown) => {
          if (!cancelled) {
            showToast.error(
              cause instanceof Error && cause.message
                ? cause.message
                : t("Could not load mention suggestions."),
            );
          }
        })
        .finally(() => {
          if (!cancelled) setMentionLoading(false);
        });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mentionContext?.query, t]);

  const pick = (picked: FileList | null) => {
    const chosen: File[] = [];
    let totalBytes = files.reduce((total, file) => total + file.size, 0);
    let validationError: string | null = null;
    for (const file of Array.from(picked ?? [])) {
      if (file.size > MAX_BYTES) {
        validationError = t("'{name}' exceeds the {limit} MB limit.", { name: file.name, limit: MAX_MB });
        continue;
      }
      if (file.size > MAX_TOTAL_BYTES - totalBytes) {
        validationError = t("Adding '{name}' would exceed the {limit} GB total limit.", { name: file.name, limit: MAX_TOTAL_GB });
        continue;
      }
      chosen.push(file);
      totalBytes += file.size;
    }
    setFiles((prev) => [...prev, ...chosen]);
    if (validationError) showToast.error(validationError);
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      pick(e.dataTransfer.files);
    }
  };

  const updateMentionContext = (value: string, cursor: number) => {
    setMentionContext(findMentionContext(value, cursor));
  };

  const selectMention = (candidate: UserSummary) => {
    if (!mentionContext) return;

    const before = caption.slice(0, mentionContext.start);
    const after = caption.slice(mentionContext.end);
    const separator = after.length === 0 || /^[A-Za-z0-9_@#]/.test(after) ? " " : "";
    const inserted = `@${candidate.username}${separator}`;
    const nextCaption = `${before}${inserted}${after}`;
    const nextCursor = before.length + inserted.length;

    setCaption(nextCaption);
    setMentionContext(null);
    window.requestAnimationFrame(() => {
      captionInput.current?.focus();
      captionInput.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleCaptionKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!mentionContext || mentionCandidates.length === 0) {
      if (event.key === "Escape") setMentionContext(null);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveMentionIndex((index) => (index + 1) % mentionCandidates.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveMentionIndex((index) => (index - 1 + mentionCandidates.length) % mentionCandidates.length);
    } else if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      selectMention(mentionCandidates[activeMentionIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setMentionContext(null);
    }
  };

  const submit = async () => {
    if (files.length === 0 || busy) return;
    setBusy(true);
    try {
      await postService.submitTracked(caption.trim() || undefined, files);
      onSubmitted();
      showToast.info(t("Post upload queued"));
      setCaption("");
      setMentionContext(null);
      setFiles([]);
      if (fileInput.current) fileInput.current.value = "";
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : t("Upload failed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className={`new-post ${isDragging ? "new-post--dragging" : ""}`}
      id="create-post"
      aria-labelledby="new-post-title"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="new-post__heading">
        <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
          <span className="new-post__symbol" aria-hidden="true">
            <PencilLine size={25} aria-hidden="true" />
          </span>
        </AnimateIcon>
        <div>
          <h3 id="new-post-title">{t("What is your moment?")}</h3>
          <p>{t("A little of your world, shared with everyone.")}</p>
        </div>
      </div>
      <div className="new-post__caption-field">
        <textarea
          ref={captionInput}
          className="new-post__caption"
          placeholder={t("Write something…")}
          value={caption}
          maxLength={4000}
          onChange={(event) => {
            setCaption(event.target.value);
            updateMentionContext(event.target.value, event.target.selectionStart);
          }}
          onClick={(event) => updateMentionContext(event.currentTarget.value, event.currentTarget.selectionStart)}
          onSelect={(event) => updateMentionContext(event.currentTarget.value, event.currentTarget.selectionStart)}
          onKeyDown={handleCaptionKeyDown}
          role="combobox"
          aria-multiline="true"
          aria-label={t("Post caption")}
          aria-describedby="post-caption-tags-help"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-controls={mentionCandidates.length > 0 ? MENTION_SUGGESTION_ID : undefined}
          aria-expanded={mentionCandidates.length > 0}
          aria-activedescendant={mentionCandidates[activeMentionIndex]
            ? `new-post-mention-${mentionCandidates[activeMentionIndex].id}`
            : undefined}
        />
        {mentionContext ? (
          <div className="new-post__mentions">
            {mentionLoading ? (
              <p className="new-post__mention-status" role="status">{t("Searching people…")}</p>
            ) : mentionCandidates.length > 0 ? (
              <div id={MENTION_SUGGESTION_ID} role="listbox" aria-label={t("Mention suggestions")}>
                {mentionCandidates.map((candidate, index) => (
                  <button
                    key={candidate.id}
                    id={`new-post-mention-${candidate.id}`}
                    type="button"
                    role="option"
                    aria-selected={index === activeMentionIndex}
                    className="new-post__mention-option"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectMention(candidate)}
                  >
                    <span className="new-post__mention-at" aria-hidden="true">@</span>
                    {candidate.username}
                  </button>
                ))}
              </div>
            ) : (
              <p className="new-post__mention-status" role="status">{t("No matching people found.")}</p>
            )}
          </div>
        ) : null}
      </div>
      <p className="new-post__hint new-post__tag-hint" id="post-caption-tags-help">
        {t("Type @username to mention someone, or use #topic to add a topic tag.")}
      </p>

      <div className="new-post__row">
        <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
          <label className="btn btn--secondary new-post__pick">
            <Paperclip size={18} aria-hidden="true" /> {t("Attach media")}
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPTED}
              multiple
              aria-hidden="false"
              className="sr-only"
              onChange={(e) => pick(e.target.files)}
            />
          </label>
        </AnimateIcon>
        <Button
          onClick={submit}
          busy={busy}
          disabled={files.length === 0}
          aria-label={t("Post")}
          title={t("Post")}
        >
          <SendHorizontal size={18} aria-hidden="true" />
        </Button>
      </div>

      <div className="new-post__attachments">
        {files.map((file, index) => (
          <span key={`${file.name}-${index}`} className="new-post__chip">
            {file.name}
            <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
              <button
                className="new-post__chip-remove"
                onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                aria-label={t("Remove {name}", { name: file.name })}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </AnimateIcon>
          </span>
        ))}
      </div>
      <p className="new-post__hint">
        {t("Images (jpg, png, gif, webp) and videos (mp4, webm, mov) up to {maxMb} MB each and {maxGb} GB total per post.", { maxMb: MAX_MB, maxGb: MAX_TOTAL_GB })}
      </p>

    </section>
  );
}
