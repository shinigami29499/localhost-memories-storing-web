import type { AdminPost } from "../../features/posts";
import { MediaPreview } from "../../features/posts/components/MediaPreview";

export function AdminMediaPreview({ post, onClose }: { post: AdminPost; onClose: () => void }) {
  return <MediaPreview post={post} includeDeleted onClose={onClose} />;
}
