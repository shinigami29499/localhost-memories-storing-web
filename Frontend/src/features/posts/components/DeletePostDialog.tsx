import { useState } from "react";
import { postService } from "../services/postService";
import { ConfirmationDialog, showToast } from "../../../components/ui";
import { useLocale } from "../../../context/LocaleContext";

interface Props {
  postId: string;
  isDeleted?: boolean;
  allowPermanentDelete?: boolean;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

export function DeletePostDialog({
  postId,
  isDeleted = false,
  allowPermanentDelete = true,
  onClose,
  onDeleted,
}: Props) {
  const { t } = useLocale();
  const [permanent, setPermanent] = useState(isDeleted);

  return (
    <ConfirmationDialog
      title={t(permanent ? "Permanently delete this post?" : "Delete this post?")}
      danger
      onClose={onClose}
      onConfirm={async () => {
        if (permanent) await postService.purge(postId);
        else await postService.remove(postId);
        showToast.success(t("Post deleted successfully"));
        onDeleted(postId);
      }}
    >
      <p>
        {permanent
          ? t("Warning: this permanently deletes the post, its media files, comments, and reactions. This cannot be undone or restored.")
          : t("This will remove the post from the feed and move its media to trash. An administrator can restore it later.")}
        {!permanent && allowPermanentDelete ? (
          <>
            {" "}
            <button type="button" className="confirmation-dialog__link" onClick={() => setPermanent(true)}>
              {t("Do you want to permanently delete instead?")}
            </button>
          </>
        ) : null}
      </p>
    </ConfirmationDialog>
  );
}
