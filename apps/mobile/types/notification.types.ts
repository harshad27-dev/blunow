export type NotificationType =
  | "MATCH"
  | "MESSAGE"
  | "LIKE"
  | "COMMENT"
  | "STORY_VIEW"
  | "CONFESSION"
  | "ROOM_INVITE"
  | "SYSTEM";

export type AppNotification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
};

export type NotificationPreferences = {
  pushEnabled: boolean;
  matches: boolean;
  messages: boolean;
  likes: boolean;
  comments: boolean;
  storyViews: boolean;
  confessions: boolean;
  roomInvites: boolean;
  system: boolean;
};
