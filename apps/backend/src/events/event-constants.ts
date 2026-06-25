// Central registry of all internal domain events
// Services emit these; other services listen via eventBus.on()

export const EVENTS = {
  AUTH: {
    USER_REGISTERED: 'auth.user.registered',
    PASSWORD_RESET_REQUESTED: 'auth.password.reset.requested',
  },
  USER: {
    PROFILE_UPDATED: 'user.profile.updated',
    PREFERENCES_UPDATED: 'user.preferences.updated',
    INTERESTS_UPDATED: 'user.interests.updated',
    DEACTIVATED: 'user.deactivated',
  },
  MATCH: {
    REQUEST_SENT: 'match.request.sent',
    REQUEST_ACCEPTED: 'match.request.accepted',
    REQUEST_REJECTED: 'match.request.rejected',
    MATCHED: 'match.matched',
  },
  POST: {
    CREATED: 'post.created',
    LIKED: 'post.liked',
    COMMENTED: 'post.commented',
    DELETED: 'post.deleted',
  },
  STORY: {
    CREATED: 'story.created',
    VIEWED: 'story.viewed',
    EXPIRED: 'story.expired',
  },
  CHAT: {
    MESSAGE_SENT: 'chat.message.sent',
    CHAT_CREATED: 'chat.created',
  },
  ROOM: {
    CREATED: 'room.created',
    MEMBER_JOINED: 'room.member.joined',
    MEMBER_LEFT: 'room.member.left',
  },
  CONFESSION: {
    CREATED: 'confession.created',
    REVEALED: 'confession.revealed',
    REVEAL_REQUESTED: 'confession.reveal.requested',
  },
  NOTIFICATION: {
    PUSH_REQUESTED: 'notification.push.requested',
    INAPP_REQUESTED: 'notification.inapp.requested',
  },
  MEDIA: {
    UPLOAD_COMPLETED: 'media.upload.completed',
    PROCESSING_REQUESTED: 'media.processing.requested',
  },
  MODERATION: {
    REPORT_CREATED: 'moderation.report.created',
    USER_BANNED: 'moderation.user.banned',
    REPORT_RESOLVED: 'moderation.report.resolved',
  },
} as const;
