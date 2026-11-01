import { ActivityDialog } from "../../../components/common/ActivityDialog";
import { DownloadActivityHeatmap } from "./DownloadActivityHeatmap";

export function DownloadActivityDialog({ onClose }: { onClose: () => void }) {
  return <ActivityDialog title="Download activity" onClose={onClose}><DownloadActivityHeatmap /></ActivityDialog>;
}
