import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Spinner } from "@/components/ui";
import "./mobile-gallery-shared.css";

export function MobileGalleryLayout() {
  return (
    <div className="gallery-layout">
      <div className="gallery-layout__content">
        <Suspense fallback={<div className="mobile-page-suspense" data-mobile-page-pending><Spinner page /></div>}><Outlet /></Suspense>
      </div>
    </div>
  );
}
