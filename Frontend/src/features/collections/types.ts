import type { UserSummary } from "../posts";

export type CollectionScope = "mine" | "public";

export const COLLECTION_NAME_MAX_LENGTH = 100;

export interface Collection {
  id: string;
  name: string;
  isPublic: boolean;
  owner: UserSummary;
  postCount: number;
  /** Custom preview when set, otherwise the first image of the earliest saved post. */
  previewMediaId: string | null;
  customPreviewMediaId: string | null;
  containsPost: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateCollectionInput {
  name: string;
  isPublic?: boolean;
  postId?: string;
}

export interface UpdateCollectionInput {
  name: string;
  isPublic: boolean;
  previewMediaId: string | null;
}
