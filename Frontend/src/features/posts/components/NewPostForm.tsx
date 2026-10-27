import { useRef, useState } from "react";
import { AnimateIcon } from "@animate-ui/react/icons";
import { postService } from "../services/postService";
import { Button, showToast } from "../../../components/ui";
import { Paperclip } from "@/components/animate-ui/icons/paperclip";
import { PencilLine } from "@/components/animate-ui/icons/pencil-line";
import { SendHorizontal } from "@/components/animate-ui/icons/send-horizontal";
import { X } from "@/components/animate-ui/icons/x";
import { ErrorState } from "../../../components/ui/Status";
import type { Post } from "../types";
import { useLocale } from "../../../context/LocaleContext";

const ACCEPTED = "image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime";
const MAX_MB = 100;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const MAX_TOTAL_GB = 20;
const MAX_TOTAL_BYTES = MAX_TOTAL_GB * 1024 * 1024 * 1024;

interface Props {
  onCreated: (post: Post) => void;
}

/** Upload composer: optional caption + one or more image/video files â†’ POST /api/posts. */
export function NewPostForm({ onCreated }: Props) {
  const { t } = useLocale();
  const fileInput = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const pick = (picked: FileList | null) => {
    setError(null);
    const chosen: File[] = [];
    let totalBytes = files.reduce((total, file) => total + file.size, 0);
    for (const file of Array.from(picked ?? [])) {
      if (file.size > MAX_BYTES) {
        setError(t("'{name}' exceeds the {limit} MB limit.", { name: file.name, limit: MAX_MB }));
        continue;
      }
      if (file.size > MAX_TOTAL_BYTES - totalBytes) {
        setError(t("Adding '{name}' would exceed the {limit} GB total limit.", { name: file.name, limit: MAX_TOTAL_GB }));
        continue;
      }
      chosen.push(file);
      totalBytes += file.size;
    }
    setFiles((prev) => [...prev, ...chosen]);
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

  const submit = async () => {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const created = await postService.create(caption.trim() || undefined, files);
      onCreated(created);
      showToast.success(t("Post successfully"));
      setCaption("");
      setFiles([]);
      if (fileInput.current) fileInput.current.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Upload failed."));
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
      <textarea
        className="new-post__caption"
        placeholder={t("Write something…")}
        value={caption}
        maxLength={4000}
        onChange={(e) => setCaption(e.target.value)}
        aria-label={t("Post caption")}
      />

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

      {error ? <ErrorState message={error} /> : null}
    </section>
  );
}
