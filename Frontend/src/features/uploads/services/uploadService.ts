import { api, uploadWithProgress } from "../../../services/api";

export const uploadService = {
  upload(
    albumId: string,
    id: string,
    file: File,
    onProgress: (loaded: number, transferred: boolean) => void,
    signal: AbortSignal,
  ): Promise<{ mediaId: string }> {
    return uploadWithProgress(
      `/api/library/album/${encodeURIComponent(albumId)}/media/file/${encodeURIComponent(id)}`,
      file,
      onProgress,
      signal,
      "PUT",
    );
  },

  imageIds(batchId: string): Promise<string[]> {
    return api(`/api/sync/upload/batch/${encodeURIComponent(batchId)}/image`);
  },
};
