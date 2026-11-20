import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/context/LocaleContext";
import { useAuthStore } from "@/store/authStore";
import { userService } from "../services/userService";
import "./approval-notice.css";

export function ApprovalNotice() {
  const { t } = useLocale();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const requestRevision = useRef(0);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      const revision = requestRevision.current;
      const current = useAuthStore.getState().user;
      void userService.profile().then((profile) => {
        const latest = useAuthStore.getState().user;
        if (requestRevision.current === revision && latest?.id === current?.id && latest?.status === current?.status) updateUser(profile);
      }).catch(() => undefined);
    };
    refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [updateUser]);

  if (user?.status !== "pending_approval" && user?.status !== "rejected" && user?.status !== "disabled") return null;
  return <section className="approval-notice" role="status">
    <span>{t(user.status === "rejected" ? "Your approval request was rejected. You can request approval again." : user.status === "disabled" ? "Your account is paused. You can view content, but cannot make changes." : "Your account is awaiting approval. You can view content, but cannot make changes.")}</span>
    {user.status === "rejected" && <button type="button" disabled={busy} onClick={() => {
      requestRevision.current += 1; setBusy(true); setError(false);
      void userService.requestApproval().then(updateUser).catch(() => setError(true)).finally(() => setBusy(false));
    }}>{t("Request approval again")}</button>}
    {error && <span role="alert">{t("Could not request approval. Please try again.")}</span>}
  </section>;
}
