import { useRef, useState } from "react";
import { postService } from "../services/postService";
import { Button } from "../../../components/ui";
import { Paperclip, PencilLine, X } from "lucide-react";
import { ErrorState } from "../../../components/ui/Status";
import type { Post } from "../types";

const ACCEPTED = "image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime";
const MAX_MB = 100;
const MAX_BYTES = MAX_MB * 1024 * 1024;

interface Props {
  onCreated: (post: Post) => void;
}

/** Upload composer: caption + one or more image/Video files → POST /api/posts. */
export function NewPostForm({ onCreated }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const pick = (picked: FileList | null) => {
    setError(null);
    const chosen: File[] = [];
    for (const file of Array.from(picked ?? [])) {
      if (file.size > MAX_BYTES) {
        setError(`'${file.name}' exceeds the ${MAX_MB} MB limit.`);
        continue;
      }
      chosen.push(file);
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
    if (!caption.trim() || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const created = await postService.create(caption.trim(), files);
      onCreated(created);
      setCaption("");
      setFiles([]);
      if (fileInput.current) fileInput.current.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
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
        <span className="new-post__symbol" aria-hidden="true">
          <PencilLine size={18} aria-hidden="true" />
        </span>
        <div>
          <h3 id="new-post-title">What is your moment?</h3>
          <p>A little of your world, shared with everyone.</p>
        </div>
      </div>
      <textarea
        className="new-post__caption"
        placeholder="Share media with the community… (caption)"
        value={caption}
        maxLength={4000}
        onChange={(e) => setCaption(e.target.value)}
        aria-label="Post caption"
      />

      <div className="new-post__row">
        <label className="btn btn--secondary new-post__pick">
          <Paperclip size={18} aria-hidden="true" /> Attach media
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
        <Button onClick={submit} busy={busy} disabled={!caption.trim() || files.length === 0}>
          Post
        </Button>
      </div>

      <div className="new-post__attachments">
        {files.map((file, index) => (
          <span key={`${file.name}-${index}`} className="new-post__chip">
            {file.name}
            <button
              className="new-post__chip-remove"
              onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
              aria-label={`Remove ${file.name}`}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>
      <p className="new-post__hint">Images (jpg, png, gif, webp) and videos (mp4, webm, mov) up to {MAX_MB} MB each.</p>

      {error ? <ErrorState message={error} /> : null}
    </section>
  );
}
