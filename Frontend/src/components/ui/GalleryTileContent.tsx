import type { ReactNode } from "react";
import "./gallery-tile.css";

interface Props {
  preview: ReactNode;
  title: ReactNode;
  author?: ReactNode;
  overlay?: ReactNode;
}

export function GalleryTileContent({ preview, title, author, overlay }: Props) {
  return <>
    <span className="gallery-tile__preview">{preview}</span>
    {overlay}
    <span className="gallery-tile__info">
      <span className="gallery-tile__title">{title || "\u00a0"}</span>
      <span className="gallery-tile__author">{author || "\u00a0"}</span>
    </span>
  </>;
}
