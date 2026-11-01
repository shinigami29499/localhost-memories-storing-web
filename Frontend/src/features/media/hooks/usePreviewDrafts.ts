import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { showToast } from "../../../components/ui";
import { useLocale } from "../../../context/LocaleContext";
import { previewService } from "../services/previewService";

export function usePreviewDrafts() {
  const ids = useRef(new Set<string>());
  const queryClient = useQueryClient();
  const { t } = useLocale();
  const translate = useRef(t);
  translate.current = t;
  const register = useCallback((mediaId: string) => { ids.current.add(mediaId); }, []);
  const retain = useCallback((mediaIds: string[]) => {
    const selected = new Set(mediaIds);
    for (const mediaId of ids.current) {
      if (selected.has(mediaId)) continue;
      ids.current.delete(mediaId);
      void previewService.releaseDraft(mediaId)
        .then(() => queryClient.invalidateQueries({ queryKey: ["previews"] }))
        .catch((error: unknown) => {
          ids.current.add(mediaId);
          showToast.error(translate.current("Could not remove unused preview."), error instanceof Error ? error.message : undefined);
        });
    }
  }, [queryClient]);

  useEffect(() => {
    const drafts = ids.current;
    return () => {
      for (const mediaId of drafts) {
        void previewService.releaseDraft(mediaId)
          .then(() => queryClient.invalidateQueries({ queryKey: ["previews"] }))
          .catch((error: unknown) => {
            showToast.error(translate.current("Could not remove unused preview."), error instanceof Error ? error.message : undefined);
          });
      }
      drafts.clear();
    };
  }, [queryClient]);

  return { register, retain };
}
