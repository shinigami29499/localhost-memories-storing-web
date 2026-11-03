import { Outlet, useLocation } from "react-router-dom";
import { PageTransition } from "../../components/layout/PageTransition";
import { useLocale } from "../../context/LocaleContext";
import { readPageTransitionEffect } from "../../utils/pageTransition";
import { GalleryNavigation } from "./GalleryNavigation";
import "./gallery.css";

export function GalleryLayout() {
  const { pathname } = useLocation();
  const { t } = useLocale();
  const active = pathname === "/gallery/album" ? "album" : pathname === "/gallery/trash" ? "trash" : "gallery";
  const copy = active === "album"
    ? { eyebrow: "Keep what matters", title: "Album", description: "Your memories, organized into albums." }
    : active === "trash"
      ? { eyebrow: "Your library", title: "Trash", description: "Restore deleted media to your library." }
      : pathname === "/gallery/favorites"
        ? { eyebrow: "Your library", title: "Favorites", description: "Images and videos you have favorited." }
        : { eyebrow: "Your library", title: "Gallery", description: "Browse images and videos in your library." };

  return (
    <div className="gallery-layout">
      <div className="gallery-layout__header">
        <header className="gallery-page__header">
          <p className="gallery-page__eyebrow">{t(copy.eyebrow)}</p>
          <h1>{t(copy.title)}<span className="brand__dot">.</span></h1>
          <p>{t(copy.description)}</p>
        </header>
        <GalleryNavigation active={active} />
      </div>
      <div className="gallery-layout__content">
        <PageTransition effect={readPageTransitionEffect()} transitionKey={pathname} liveRoot skipUpdates>
          <Outlet />
        </PageTransition>
      </div>
    </div>
  );
}
