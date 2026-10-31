import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Download } from "@/components/animate-ui/icons/download";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { useNavigate } from "react-router-dom";
import { startTransition } from "react";
import { showToast } from "../../../components/ui/Toast";
import { useLocale } from "../../../context/LocaleContext";
import type { MediaFile } from "../../media/types";
import { enqueueDownloads, useDownloadStore } from "../services/downloadQueue";

interface Props {
  media: MediaFile[];
  className: string;
  includeDeleted?: boolean;
  disabled?: boolean;
  beforeNavigate?: () => Promise<void>;
}

export function DownloadButton({ media, className, includeDeleted = false, disabled = false, beforeNavigate }: Props) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const busy = useDownloadStore((state) => state.batches.some((batch) => batch.items.some((item) =>
    (item.status === "Pending" || item.status === "Downloading")
    && media.some((file) => file.id === item.mediaId),
  )));
  const label = media.length > 1 ? "Download selected" : "Download";
  return (
    <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
      <button
        type="button"
        className={className}
        aria-label={t(label)}
        title={t(label)}
        disabled={disabled || media.length === 0 || busy}
        aria-busy={busy || undefined}
        onClick={() => {
          try {
            const batchId = enqueueDownloads(media, includeDeleted);
            showToast.success(t("Download batch started"), { description: t("Track downloads in Sync > Download."), onClick: () => {
              if (!beforeNavigate) { navigate("/sync/download", { state: { highlightBatchId: batchId } }); return; }
              void beforeNavigate().then(() => startTransition(() => navigate("/sync/download", { state: { highlightBatchId: batchId } })));
            } });
          } catch (error) {
            showToast.error(t("Could not start this download."), error instanceof Error ? error.message : undefined);
          }
        }}
      >
        {busy
          ? <LoaderCircle size={20} className="spinner__wheel" aria-hidden="true" />
          : <Download size={20} aria-hidden="true" />}
      </button>
    </AnimateIcon>
  );
}
