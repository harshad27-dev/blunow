import rateLimit from 'express-rate-limit';

export const matchRateLimitMiddleware = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // max 50 match requests per hour
  message: { success: false, message: 'Too many match requests. Please slow down.' },
});
