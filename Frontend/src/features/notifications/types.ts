export interface PostNotification {
  id: string;
  notificationType: "PostUploaded" | "CommentAdded" | "ReactionAdded";
  postId: string;
  actorId: string;
  actorUsername: string;
  postCaption: string;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationFeed {
  items: PostNotification[];
  unreadCount: number;
}
