import rateLimit from 'express-rate-limit';

// Global rate limiter applied to all routes
export const rateLimitMiddleware = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX ?? '100'),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});

// Stricter limiter for sensitive routes (auth, match)
export const strictRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts, please try again in 15 minutes.',
  },
});

export const socialActionRateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many actions, please slow down.',
  },
});

export const contentCreationRateLimitMiddleware = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many uploads or posts, please try again later.',
  },
});
