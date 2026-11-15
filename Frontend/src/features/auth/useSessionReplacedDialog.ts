import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCustomDialog } from "../../components/ui/CustomDialog";
import { useLocale } from "../../context/LocaleContext";
import { sessionReplacedEvent } from "./sessionReplacement";

export function useSessionReplacedDialog() {
  const { dialogProps, close, openDialog } = useCustomDialog(() => {}, { dismissible: false, defaultOpen: false });
  const queryClient = useQueryClient();
  const { t } = useLocale();
  useEffect(() => {
    const onReplaced = () => { queryClient.clear(); openDialog(); };
    window.addEventListener(sessionReplacedEvent, onReplaced);
    return () => window.removeEventListener(sessionReplacedEvent, onReplaced);
  }, [queryClient, openDialog]);
  return { dialogProps, close, t };
}
