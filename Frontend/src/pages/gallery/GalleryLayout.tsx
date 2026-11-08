import { PushTransition } from "../../hooks/PushTransition";
import { Outlet, useLocation } from "react-router-dom";
import { PageHighlightBar } from "../../components/ui/PageHighlightBar";
import { GalleryNavigation } from "./GalleryNavigation";
import "./gallery.css";

export function GalleryLayout() {
  const { pathname } = useLocation();
  const active = pathname === "/gallery/album" ? "album" : pathname === "/gallery/trash" ? "trash" : "gallery";
  return (
    <div className="gallery-layout">
      <div className="gallery-layout__header">
        <PageHighlightBar id="gallery-navigation" label="gallery navigation"><GalleryNavigation active={active} /></PageHighlightBar>
      </div>
      <div className="gallery-layout__content" data-push-page-content>
        <PushTransition transitionKey={active} />
        <Outlet />
      </div>
    </div>
  );
}
