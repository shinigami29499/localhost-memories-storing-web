import { useState } from "react";
import type { MediaFile } from "../../types";
import { mediaUrl, formatBytes } from "../../utils/Media";

/**
 * Renders the media files of a post. Images get immediate previews; videos use a
 * native <video> element with range-supported streaming from the backend.
 */
export function MediaGallery({ media }: { media: MediaFile[] }) {
  const [lightbox, setLightbox] = useState<MediaFile | null>(null);

  if (media.length === 0) return null;

  return (
    <div className={`media-gallery ${media.length > 1 ? "media-gallery--grid" : ""}`}>
      {media.map((file) => (
        <figure
          key={file.id}
          className="media-gallery__item"
          onClick={() => file.mediaKind === "image" && setLightbox(file)}
        >
          {file.mediaKind === "image" ? (
            <img
              src={mediaUrl(file.id)}
              alt={file.originalFilename}
              loading="lazy"
              className="media-gallery__image"
            />
          ) : file.mediaKind === "video" ? (
            <video
              src={mediaUrl(file.id)}
              controls
              preload="metadata"
              className="media-gallery__video"
            />
          ) : (
            <div className="media-gallery__unsupported">
              <p>Unsupported media type ({file.mimeType})</p>
              <a href={mediaUrl(file.id)} download={file.originalFilename}>
                Download
              </a>
            </div>
          )}
          <figcaption className="media-gallery__meta">
            {file.originalFilename} · {formatBytes(file.fileSizeBytes)}
          </figcaption>
        </figure>
      ))}

      {lightbox ? (
        <div className="media-lightbox" onClick={() => setLightbox(null)} role="dialog" aria-label={lightbox.originalFilename}>
          <img src={mediaUrl(lightbox.id)} alt={lightbox.originalFilename} />
        </div>
      ) : null}
    </div>
  );
}
