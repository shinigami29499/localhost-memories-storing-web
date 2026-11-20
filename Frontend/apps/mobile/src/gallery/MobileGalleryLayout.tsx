import { Suspense } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Spinner } from "@/components/ui";
import { useLocale } from "@/context/LocaleContext";
import { useAuthStore } from "@/store/authStore";
import { PushTransition } from "@/hooks/PushTransition";
import { useAnimationStore } from "@/store/animationStore";
import { motion, useReducedMotion } from "motion/react";
import "./mobile-gallery-shared.css";
import "./mobile-gallery-layout.css";
import "../layout/mobile-highlight-navigation.css";

export function MobileGalleryLayout() {
  const { pathname } = useLocation();
  const { t } = useLocale();
  const isAdmin = useAuthStore((state) => ["admin", "superadmin"].includes(state.user?.role?.toLowerCase() ?? ""));
  const animationsEnabled = useAnimationStore((state) => state.enabled);
  const reducedMotion = useReducedMotion();
  const active = pathname === "/gallery/album" ? "album" : pathname === "/gallery/trash" ? "trash" : "gallery";
  const links = [
    { value: "gallery", label: "Gallery", to: "/gallery" },
    { value: "album", label: "Album", to: "/gallery/album" },
    ...(isAdmin ? [{ value: "trash", label: "Trash", to: "/gallery/trash" }] : []),
  ];

  return <div className="gallery-layout mobile-gallery-layout">
    <div className="gallery-layout__header mobile-gallery-layout__header">
      <nav className="mobile-highlight-nav" aria-label={t("Gallery")}>
        {links.map((link) => <Link key={link.value} to={link.to} aria-current={active === link.value ? "page" : undefined}>
          {t(link.label)}
          {active === link.value && <motion.span className="mobile-highlight-nav__indicator" layoutId="mobile-gallery-indicator"
            transition={animationsEnabled && !reducedMotion ? { type: "spring", stiffness: 500, damping: 40 } : { duration: 0 }} />}
        </Link>)}
      </nav>
    </div>
    <div className="gallery-layout__content" data-push-page-content>
      <PushTransition transitionKey={active} />
      <Suspense key={active} fallback={<div className="mobile-page-suspense" data-mobile-page-pending><Spinner page /></div>}><Outlet /></Suspense>
    </div>
  </div>;
}
