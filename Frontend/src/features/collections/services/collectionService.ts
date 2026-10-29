import { api } from "../../../services/api";
import type { PagedFeed, Post } from "../../posts";
import type { Collection, CollectionScope, CreateCollectionInput, UpdateCollectionInput } from "../types";

export const collectionService = {
  list(scope: CollectionScope = "mine", postId?: string): Promise<Collection[]> {
    const params = new URLSearchParams({ scope });
    if (postId) params.set("postId", postId);
    return api(`/api/collections?${params.toString()}`);
  },

  get(collectionId: string): Promise<Collection> {
    return api(`/api/collections/${collectionId}`);
  },

  posts(collectionId: string, offset = 0, limit = 20): Promise<PagedFeed<Post>> {
    return api(`/api/collections/${collectionId}/posts?offset=${offset}&limit=${limit}`);
  },

  create(input: CreateCollectionInput): Promise<Collection> {
    return api<Collection>("/api/collections", { method: "POST", body: { ...input } });
  },

  update(collectionId: string, input: UpdateCollectionInput): Promise<Collection> {
    return api<Collection>(`/api/collections/${collectionId}`, { method: "PUT", body: { ...input } });
  },

  remove(collectionId: string): Promise<void> {
    return api<void>(`/api/collections/${collectionId}`, { method: "DELETE" });
  },

  addPost(collectionId: string, postId: string): Promise<Collection> {
    return api<Collection>(`/api/collections/${collectionId}/posts`, { method: "POST", body: { postId } });
  },

  removePost(collectionId: string, postId: string): Promise<Collection> {
    return api<Collection>(`/api/collections/${collectionId}/posts/${postId}`, { method: "DELETE" });
  },
};
