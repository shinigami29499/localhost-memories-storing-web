import { Suspense } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Spinner } from "@/components/ui";
import { useLocale } from "@/context/LocaleContext";
import { useAuthStore } from "@/store/authStore";
import { PushTransition } from "@/hooks/PushTransition";
import "./mobile-gallery-shared.css";
import "./mobile-gallery-layout.css";

export function MobileGalleryLayout() {
  const { pathname } = useLocation();
  const { t } = useLocale();
  const isAdmin = useAuthStore((state) => state.user?.role?.toLowerCase() === "admin");
  const active = pathname === "/gallery/album" ? "album" : pathname === "/gallery/trash" ? "trash" : "gallery";
  const links = [
    { value: "gallery", label: "Gallery", to: "/gallery" },
    { value: "album", label: "Album", to: "/gallery/album" },
    ...(isAdmin ? [{ value: "trash", label: "Trash", to: "/gallery/trash" }] : []),
  ];

  return <div className="gallery-layout mobile-gallery-layout">
    <div className="gallery-layout__header mobile-gallery-layout__header">
      <nav className="mobile-gallery-nav" aria-label={t("Gallery")}>
        {links.map((link) => <Link key={link.value} to={link.to} aria-current={active === link.value ? "page" : undefined}>{t(link.label)}</Link>)}
      </nav>
    </div>
    <div className="gallery-layout__content" data-push-page-content>
      <PushTransition transitionKey={active} />
      <Suspense key={active} fallback={<Spinner page />}><Outlet /></Suspense>
    </div>
  </div>;
}
