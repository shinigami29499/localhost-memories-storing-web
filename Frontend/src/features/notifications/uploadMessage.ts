type Translate = (key: string, values?: Record<string, string | number>) => string;

export function uploadMessage(t: Translate, images: number, videos: number, username?: string) {
  const values = { images, videos, username: username ?? "" };
  if (!videos) return t(username ? "{username} just uploaded {images} images." : "Uploaded {images} images", values);
  if (!images) return t(username ? "{username} just uploaded {videos} videos." : "Uploaded {videos} videos", values);
  return t(username ? "{username} just uploaded {images} images and {videos} videos." : "Uploaded {images} images and {videos} videos", values);
}
