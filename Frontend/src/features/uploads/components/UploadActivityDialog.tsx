import { ActivityDialog } from "../../../components/common/ActivityDialog";
import { UploadActivityHeatmap } from "./UploadActivityHeatmap";

export function UploadActivityDialog({ onClose }: { onClose: () => void }) {
  return <ActivityDialog title="Upload activity" onClose={onClose}><UploadActivityHeatmap /></ActivityDialog>;
}
