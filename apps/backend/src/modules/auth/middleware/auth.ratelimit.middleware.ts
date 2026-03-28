import rateLimit from 'express-rate-limit';

// Strict rate limiter for auth routes to prevent brute force attacks
export const strictRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
});
