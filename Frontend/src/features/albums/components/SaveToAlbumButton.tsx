import type { ButtonHTMLAttributes } from "react";
import { useQueries } from "@tanstack/react-query";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { RefreshCw } from "@/components/animate-ui/icons/refresh-cw";
import { useLocale } from "../../../context/LocaleContext";
import { albumKeys } from "../hooks/useAlbums";
import { albumService } from "../services/albumService";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  mediaIds: string[];
  size?: number;
}

export function SaveToAlbumButton({ mediaIds, size = 18, children, ...props }: Props) {
  const { t } = useLocale();
  const albums = useQueries({
    queries: mediaIds.map((mediaId) => ({
      queryKey: albumKeys.list("mine", mediaId),
      queryFn: () => albumService.list("mine", mediaId),
    })),
  });
  const loading = albums.some((query) => query.isPending);
  const failed = albums.some((query) => query.isError);
  const saved = albums.length > 0
    && albums.every((query) => query.data?.some((album) => album.containsMedia));

  return (
    <button
      type="button"
      {...props}
      title={failed ? t("Could not load albums.") : props.title}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <LoaderCircle size={size} className="spinner__wheel" aria-hidden="true" />
      ) : failed ? (
        <RefreshCw size={size} aria-label={t("Could not load albums.")} />
      ) : (
        <Bookmark
          size={size}
          stroke={saved ? "var(--notification-icon)" : "#fff"}
          fill="none"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}
