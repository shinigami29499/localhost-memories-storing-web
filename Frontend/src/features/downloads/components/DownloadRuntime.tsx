import { useEffect } from "react";
import { useAuthStore } from "../../../store/authStore";
import { clearDownloads } from "../services/downloadQueue";

export function DownloadRuntime() {
  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe((state, previous) => {
      if (state.user?.id !== previous.user?.id || !state.accessToken) clearDownloads();
    });
    return () => {
      unsubscribe();
      clearDownloads();
    };
  }, []);
  return null;
}
