import type { PhotoLocation } from "../../media/types";
import { uploadService } from "../../uploads/services/uploadService";
import { locationService } from "./locationService";

/** Applies a map location to the images produced by one upload batch. */
export async function locateUploadedBatch(batchId: string, location: PhotoLocation): Promise<string[]> {
  const ids = await uploadService.imageIds(batchId);
  const tagged: string[] = [];
  for (let offset = 0; offset < ids.length; offset += 10) {
    const batch = ids.slice(offset, offset + 10);
    const results = await Promise.allSettled(batch.map((id) => locationService.set(id, location)));
    results.forEach((result, index) => { if (result.status === "fulfilled") tagged.push(batch[index]); });
  }
  return tagged;
}
