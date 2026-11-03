import { HighlightItem } from "@animate-ui/react/primitives/effects/highlight";
import { NavigationHighlight } from "../../components/ui";
import { Link } from "react-router-dom";
import { useLocale } from "../../context/LocaleContext";
import { useAuthStore } from "../../store/authStore";
export function GalleryNavigation({ active }: { active: "gallery" | "album" | "trash" }) {
  const { t } = useLocale();
  const isAdmin = useAuthStore((state) => state.user?.role?.toLowerCase() === "admin");
  const links = [{ value: "gallery", label: "Gallery", to: "/gallery" }, { value: "album", label: "Album", to: "/gallery/album" }, ...(isAdmin ? [{ value: "trash", label: "Trash", to: "/gallery/trash" }] : [])];
  return <nav className="gallery-page__media-toolbar" aria-label={t("Gallery")}><div className="gallery-page__media-filters"><NavigationHighlight value={active}>{links.map(({ value, label, to }) => <HighlightItem key={value} value={value} asChild><Link to={to} className="gallery-page__media-option" aria-current={active === value ? "page" : undefined}>{t(label)}</Link></HighlightItem>)}</NavigationHighlight></div></nav>;
}
