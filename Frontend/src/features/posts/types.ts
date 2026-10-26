export interface UserSummary {
  id: string;
  username: string;
}

export interface Post {
  id: string;
  caption: string;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
  author: UserSummary;
  mediaCount: number;
  commentCount: number;
  reactionCounts: ReactionCount[];
  myReactions: string[];
  media: MediaFile[];
}

export interface AdminPost {
  id: string;
  caption: string;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
  author: UserSummary;
  deletedBy: UserSummary | null;
  mediaCount: number;
  commentCount: number;
  media: AdminPostMedia[];
}

export interface AdminPostMedia {
  id: string;
  mediaKind: "image" | "video";
  mimeType: string;
}

export interface DeletedPost {
  id: string;
  caption: string;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string;
  author: UserSummary;
  deletedBy: UserSummary | null;
  mediaCount: number;
  commentCount: number;
}

export interface MediaFile {
  id: string;
  mediaKind: "image" | "video";
  mimeType: string;
  createdAt: string;
  updatedAt: string | null;
  relativePath: string;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
  author: UserSummary;
}

export interface ReactionCount {
  reactionType: string;
  count: number;
}

export interface PagedFeed<T> {
  offset: number;
  limit: number;
  total: number;
  items: T[];
}

export interface UserSummary {
  id: string;
  username: string;
}