import { isRouteErrorResponse, useRouteError, useNavigate } from "react-router-dom";
import { Home } from "@/components/animate-ui/icons/home";
import { RotateCcw } from "@/components/animate-ui/icons/rotate-ccw";
import { useLocale } from "../context/LocaleContext";

export function ErrorPage() {
  const { t } = useLocale();
  const error = useRouteError();
  const navigate = useNavigate();

  let title = "Unexpected Error";
  let message = "Something went wrong. Please try again.";

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    message = error.data?.message || error.data || "The requested page could not be found.";
  } else if (error instanceof Error) {
    if (error.message.includes("Element type is invalid")) {
      title = "Component Error";
      message = "A component failed to load. This may be due to a missing or incorrect import.";
    } else {
      message = error.message;
    }
  }

  return (
    <main className="error-page">
      <div className="error-page__content">
        <div className="error-page__icon">
          <span aria-hidden="true">!</span>
        </div>
        <h1 className="error-page__title">{t(title)}</h1>
        <p className="error-page__message">{t(message)}</p>
        <div className="error-page__actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => navigate("/")}
          >
            <Home size={18} aria-hidden="true" />
            {t("Go Home")}
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => navigate(0)}
          >
            <RotateCcw size={18} aria-hidden="true" />
            {t("Try Again")}
          </button>
        </div>
      </div>
    </main>
  );
}
