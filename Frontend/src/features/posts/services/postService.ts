import { api } from "../../../services/api";
import type { AdminPost, Comment, DeletedPost, PagedFeed, Post, ReactionCount } from "../types";

export const postService = {
  feed(offset = 0, limit = 10): Promise<PagedFeed<Post>> {
    return api(`/api/posts?offset=${offset}&limit=${limit}`);
  },

  get(postId: string): Promise<Post> {
    return api(`/api/posts/${postId}`);
  },

  async create(caption: string | undefined, files: File[]): Promise<Post> {
    const form = new FormData();
    if (caption) form.set("caption", caption);
    for (const file of files) form.append("files", file, file.name);
    return api<Post>("/api/posts", { method: "POST", body: form });
  },

  updateCaption(postId: string, caption: string): Promise<Post> {
    return api<Post>(`/api/posts/${postId}`, { method: "PUT", body: { caption } });
  },

  remove(postId: string): Promise<void> {
    return api<void>(`/api/posts/${postId}`, { method: "DELETE" });
  },

  listDeleted(offset = 0, limit = 50): Promise<PagedFeed<DeletedPost>> {
    return api(`/api/posts/deleted?offset=${offset}&limit=${limit}`);
  },

  /** Admin listing of every post, active and soft-deleted. */
  listAll(offset = 0, limit = 50): Promise<PagedFeed<AdminPost>> {
    return api(`/api/posts/all?offset=${offset}&limit=${limit}`);
  },

  restore(postId: string): Promise<void> {
    return api<void>(`/api/posts/${postId}/restore`, { method: "POST" });
  },

  purge(postId: string): Promise<void> {
    return api<void>(`/api/posts/${postId}/permanent`, { method: "DELETE" });
  },
};

export const commentService = {
  list(postId: string, offset = 0, limit = 50): Promise<Comment[]> {
    return api(`/api/posts/${postId}/comments?offset=${offset}&limit=${limit}`);
  },

  add(postId: string, content: string): Promise<Comment> {
    return api<Comment>(`/api/posts/${postId}/comments`, { method: "POST", body: { content } });
  },

  remove(commentId: string): Promise<void> {
    return api<void>(`/api/comments/${commentId}`, { method: "DELETE" });
  },
};

export const reactionService = {
  add(postId: string, reactionType: string): Promise<ReactionCount[]> {
    return api(`/api/posts/${postId}/reactions`, { method: "POST", body: { reactionType } });
  },

  remove(postId: string, reactionType: string): Promise<ReactionCount[]> {
    return api(`/api/posts/${postId}/reactions/${encodeURIComponent(reactionType)}`, { method: "DELETE" });
  },
};