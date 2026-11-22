import { Outlet } from "react-router-dom";
import "./mobile-gallery-shared.css";

export function MobileGalleryLayout() {
  return (
    <div className="gallery-layout">
      <div className="gallery-layout__content">
        <Outlet />
      </div>
    </div>
  );
}
