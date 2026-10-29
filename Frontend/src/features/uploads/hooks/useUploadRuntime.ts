import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { useLocale } from "../../../context/LocaleContext";
import { startUploadRuntime } from "../services/uploadRuntime";

export function useUploadRuntime(): void {
  const userId = useAuthStore((state) => state.user?.id);
  const { t } = useLocale();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    return startUploadRuntime(userId, t, () => {
      for (const key of ["media", "albums", "uploads"]) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
    });
  }, [userId, t, queryClient]);
}
