import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Spinner } from "@/components/ui";

export function GalleryLayout() {
  return (
    <div className="gallery-layout">
      <div className="gallery-layout__content">
        <Suspense fallback={<Spinner page />}><Outlet /></Suspense>
      </div>
    </div>
  );
}
