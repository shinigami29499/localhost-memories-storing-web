import { Link } from "react-router-dom";
import { useLocale } from "../../context/LocaleContext";

export function Brand({ textOnly = false }: { textOnly?: boolean }) {
  const { t } = useLocale();
  return (
    <Link className="brand" to="/" aria-label={t("ShinigaCim home")}>
      {!textOnly && <span className="brand__mark" aria-hidden="true">S</span>}
      <span>ShinigaCim{!textOnly && <span className="brand__dot">.</span>}</span>
    </Link>
  );
}
