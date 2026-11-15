import { useNavigate, useRouteError } from "react-router-dom";
import { Home } from "@/components/animate-ui/icons/home";
import { RotateCcw } from "@/components/animate-ui/icons/rotate-ccw";
import { useLocale } from "@/context/LocaleContext";
import { getRouteErrorDetails } from "@/hooks/getRouteErrorDetails";
import "./mobile-error.css";

export function MobileErrorPage() {
  const { t } = useLocale();
  const { title, message } = getRouteErrorDetails(useRouteError());
  const navigate = useNavigate();
  return <main className="mobile-error">
    <div className="mobile-error__content">
      <span className="mobile-error__icon" aria-hidden="true">!</span>
      <h1>{t(title)}</h1>
      <p>{t(message)}</p>
      <div className="mobile-error__actions">
        <button className="btn btn--primary" type="button" onClick={() => navigate("/")}><Home size={18} aria-hidden="true" />{t("Go Home")}</button>
        <button className="btn btn--secondary" type="button" onClick={() => navigate(0)}><RotateCcw size={18} aria-hidden="true" />{t("Try Again")}</button>
      </div>
    </div>
  </main>;
}
