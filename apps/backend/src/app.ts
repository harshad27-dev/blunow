import express, { Application } from 'express';
import helmet from 'helmet';
import { corsMiddleware } from './common/middleware/cors.middleware';
import { loggerMiddleware } from './common/middleware/logger.middleware';
import { rateLimitMiddleware } from './common/middleware/rate-limit.middleware';
import { errorHandler } from './common/middleware/error.middleware';
import { notFoundHandler } from './common/middleware/not-found.middleware';

// Module routes
import authRoutes from './modules/auth/routes/auth.routes';
import usersRoutes from './modules/users/routes/users.routes';
import feedRoutes from './modules/feed/routes/feed.routes';
import postsRoutes from './modules/posts/routes/posts.routes';
import storiesRoutes from './modules/stories/routes/stories.routes';
import matchRoutes from './modules/match/routes/match.routes';
import chatRoutes from './modules/chat/routes/chat.routes';
import roomsRoutes from './modules/rooms/routes/rooms.routes';
import confessionsRoutes from './modules/confessions/routes/confessions.routes';
import notificationsRoutes from './modules/notifications/routes/notifications.routes';
import mediaRoutes from './modules/media/routes/media.routes';
import moderationRoutes from './modules/moderation/routes/moderation.routes';
import adminModerationRoutes from './modules/moderation/routes/admin-moderation.routes';
import searchRoutes, { trendingRouter } from './modules/search/routes/search.routes';

const app: Application = express();

// ─── Global Middleware ─────────────────────────────────────────────────────────
app.use(helmet());
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(loggerMiddleware);
app.use(rateLimitMiddleware);

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/stories', storiesRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/confessions', confessionsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/admin/moderation', adminModerationRoutes);
app.use('/api', searchRoutes);
app.use('/api/trending', trendingRouter);

// ─── Error Handling ────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
