import { Image, MapPin } from "lucide-react";
import "./page-data-placeholder.css";

type PlaceholderLayout = "rows" | "users" | "cards" | "media" | "map" | "value";
const defaultCounts: Record<PlaceholderLayout, number> = { rows: 4, users: 5, cards: 3, media: 9, map: 1, value: 1 };

export function PageDataPlaceholder({ label, layout = "rows", count = defaultCounts[layout] }: {
  label: string;
  layout?: PlaceholderLayout;
  count?: number;
}) {
  return (
    <span className="mobile-content-placeholder" data-layout={layout} role="status">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, index) => (
        <span className="mobile-content-placeholder__item" key={index} aria-hidden="true">
          {layout === "map" ? <MapPin /> : (
            <>
              {layout === "users" && <span className="mobile-content-placeholder__avatar" />}
              {layout === "media" && <span className="mobile-content-placeholder__preview"><Image /></span>}
              <span className="mobile-content-placeholder__lines">
                <span />
                {layout !== "value" && <span />}
              </span>
            </>
          )}
        </span>
      ))}
    </span>
  );
}
