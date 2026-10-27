import { Link } from "react-router-dom";
import { useLocale } from "../../context/LocaleContext";

export function Brand() {
  const { t } = useLocale();
  return (
    <Link className="brand" to="/" aria-label={t("ShinigaCim home")}>
      <span className="brand__mark" aria-hidden="true">S</span>
      <span>ShinigaCim<span className="brand__dot">.</span></span>
    </Link>
  );
}
