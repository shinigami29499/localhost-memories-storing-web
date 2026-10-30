import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Download } from "@/components/animate-ui/icons/download";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { showToast } from "../../../components/ui/Toast";
import { useLocale } from "../../../context/LocaleContext";
import type { MediaFile } from "../../media/types";
import { enqueueDownloads, useDownloadStore } from "../services/downloadQueue";

interface Props {
  media: MediaFile[];
  className: string;
  includeDeleted?: boolean;
  disabled?: boolean;
}

export function DownloadButton({ media, className, includeDeleted = false, disabled = false }: Props) {
  const { t } = useLocale();
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
            enqueueDownloads(media, includeDeleted);
            showToast.info(t("Download batch started"), t("Track downloads in Sync > Download."));
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
