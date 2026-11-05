import { Outlet, useLocation } from "react-router-dom";
import { GalleryNavigation } from "./GalleryNavigation";
import "./gallery.css";

export function GalleryLayout() {
  const { pathname } = useLocation();
  const active = pathname === "/gallery/album" ? "album" : pathname === "/gallery/trash" ? "trash" : "gallery";

  return (
    <div className="gallery-layout">
      <div className="gallery-layout__header">
        <GalleryNavigation active={active} />
      </div>
      <div className="gallery-layout__content">
        <Outlet />
      </div>
    </div>
  );
}
