import { useShallow } from "zustand/react/shallow";
import { useAuthStore } from "@/store/authStore";
import { cancelUpload, retryUpload } from "../services/uploadRuntime";
import { useUploadProgress } from "../uploadProgress";
import { FileUploadProgress } from "./FileUploadProgress";

export function useUploadHistoryIds() {
  const userId = useAuthStore((state) => state.user?.id);
  return useUploadProgress(useShallow(({ transfers }) => Object.values(transfers)
    .filter((transfer) => transfer.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(({ id }) => id)));
}

export function UploadHistoryRow({ id, onDelete }: {
  id: string; onDelete: (id: string, name: string) => void;
}) {
  const user = useAuthStore((state) => state.user);
  const transfer = useUploadProgress((state) => state.transfers[id]?.userId === user?.id ? state.transfers[id] : undefined);
  if (!transfer) return null;
  const terminal = ["success", "failed", "cancelled"].includes(transfer.status);
  return <FileUploadProgress name={transfer.name} progress={transfer} compact
    createdAt={transfer.createdAt}
    onCancel={() => cancelUpload(id)}
    onRetry={user?.status === "active" ? () => retryUpload(id) : undefined}
    onDelete={terminal ? () => onDelete(id, transfer.name) : undefined} />;
}
