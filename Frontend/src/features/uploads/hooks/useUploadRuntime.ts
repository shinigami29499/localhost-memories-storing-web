import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { useLocale } from "../../../context/LocaleContext";
import { showToast } from "../../../components/ui/Toast";
import { startUploadRuntime } from "../services/uploadRuntime";

export function useUploadRuntime(): void {
  const userId = useAuthStore((state) => state.user?.id);
  const status = useAuthStore((state) => state.user?.status);
  const { t } = useLocale();
  const translate = useRef(t);
  translate.current = t;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    return startUploadRuntime(userId, ({ albumId, name }) => {
      void queryClient.invalidateQueries({ queryKey: ["albums"] });
      void queryClient.invalidateQueries({ queryKey: ["media"] });
      showToast.success(translate.current("{name} uploaded", { name }), { id: `album-upload:${albumId}` });
    }, status === "active");
  }, [userId, status, queryClient]);
}
