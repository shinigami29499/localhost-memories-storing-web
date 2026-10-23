import { useState } from "react";
import { postService } from "../../services/postService";
import { ConfirmationDialog } from "../ui/ConfirmationDialog";

interface Props {
  postId: string;
  isDeleted?: boolean;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

export function DeletePostDialog({ postId, isDeleted = false, onClose, onDeleted }: Props) {
  const [permanent, setPermanent] = useState(isDeleted);

  return (
    <ConfirmationDialog
      title={permanent ? "Permanently delete this post?" : "Delete this post?"}
      danger
      onClose={onClose}
      onConfirm={async () => {
        if (permanent) await postService.purge(postId);
        else await postService.remove(postId);
        onDeleted(postId);
      }}
    >
      <p>
        {permanent
          ? "Warning: this permanently deletes the post, its media files, comments, and reactions. This cannot be undone or restored."
          : "This will remove the post from the feed and move its media to trash. An administrator can restore it later."}
        {!permanent ? (
          <>
            {" "}
            <button type="button" className="confirmation-dialog__link" onClick={() => setPermanent(true)}>
              Do you want to permanently delete instead?
            </button>
          </>
        ) : null}
      </p>
    </ConfirmationDialog>
  );
}
