import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { useLocale } from "../../../context/LocaleContext";
import { startUploadRuntime } from "../services/uploadRuntime";

export function useUploadRuntime(): void {
  const userId = useAuthStore((state) => state.user?.id);
  const status = useAuthStore((state) => state.user?.status);
  const { t } = useLocale();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || status !== "active") return;
    return startUploadRuntime(userId, t, () => {
      void queryClient.invalidateQueries({ queryKey: ["uploads"] });
    });
  }, [userId, status, t, queryClient]);
}
