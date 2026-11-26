import { useRef } from "react";
import { queueAlbumUploads } from "@/features/uploads/services/uploadRuntime";
import { useAuthStore } from "@/store/authStore";
import type { Album } from "../types";

export function useAlbumUpload(album: Album | undefined) {
  const user = useAuthStore((state) => state.user);
  const canUpload = Boolean(album && user?.status === "active" && (album.isPublic || album.owner.id === user.id));
  const uploadInput = useRef<HTMLInputElement>(null);
  const uploadFiles = (files: File[]) => {
    if (!album || !user || !canUpload || files.length === 0) return;
    queueAlbumUploads(album.id, files, user.id);
  };

  return { canUpload, uploadInput, uploadFiles };
}
