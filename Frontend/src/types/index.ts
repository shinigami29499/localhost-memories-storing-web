export interface AuthUser {
  id: string;
  username: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAtUtc: string;
  user: AuthUser;
}

export interface UserSummary {
  id: string;
  username: string;
}

export interface MediaFile {
  id: string;
  mediaKind: "image" | "video" | string;
  mimeType: string;
  originalFilename: string;
  fileSizeBytes: number;
  storagePath: string;
}

export interface ReactionCount {
  reactionType: string;
  count: number;
}

export interface Post {
  id: string;
  caption: string;
  createdAt: string;
  updatedAt: string | null;
  author: UserSummary;
  media: MediaFile[];
  commentCount: number;
  reactionCounts: ReactionCount[];
  myReactionTypes: string[];
}

export interface PagedFeed<T> {
  offset: number;
  limit: number;
  total: number;
  items: T[];
}

export interface Comment {
  id: string;
  postId: string;
  author: UserSummary;
  content: string;
  createdAt: string;
  updatedAt: string | null;
}
