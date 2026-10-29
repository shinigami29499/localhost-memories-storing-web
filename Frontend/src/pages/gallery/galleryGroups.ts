import type { Post } from "../../features/posts";

export interface GalleryDateGroup {
  key: string;
  date: Date;
  posts: Post[];
}

function dayKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Groups posts by local creation day, preserving the incoming (newest-first) order. */
export function groupPostsByDate(posts: Post[]): GalleryDateGroup[] {
  const groups: GalleryDateGroup[] = [];
  const byKey = new Map<string, GalleryDateGroup>();
  for (const post of posts) {
    const date = new Date(post.createdAt);
    const key = dayKey(date);
    let group = byKey.get(key);
    if (!group) {
      group = { key, date: new Date(date.getFullYear(), date.getMonth(), date.getDate()), posts: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.posts.push(post);
  }
  return groups;
}

export function formatGroupLabel(date: Date, language: string, t: (key: string) => string, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((today.getTime() - date.getTime()) / 86_400_000);
  if (days === 0) return t("Today");
  if (days === 1) return t("Yesterday");
  return date.toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}
