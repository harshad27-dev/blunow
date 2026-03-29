import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z.string().min(3).max(20).regex(/^[a-z0-9]+([._]?[a-z0-9]+)*$/, 'Invalid username format'),
  birthDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  gender: z.enum(['MALE', 'FEMALE', 'NON_BINARY', 'OTHER']),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const validateRegister = (req: Request, res: Response, next: NextFunction): void => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
    return;
  }
  req.body = result.data;
  next();
};

export const validateLogin = (req: Request, res: Response, next: NextFunction): void => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
    return;
  }
  req.body = result.data;
  next();
};

export const validateRefreshToken = (req: Request, res: Response, next: NextFunction): void => {
  const result = refreshTokenSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
    return;
  }
  req.body = result.data;
  next();
};
