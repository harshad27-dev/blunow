import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const updateProfileSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-z0-9]+([._]?[a-z0-9]+)*$/, 'Invalid username format').optional(),
  bio: z.string().max(500).optional(),
  location: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
});

const updatePreferencesSchema = z.object({
  minAge: z.number().int().min(18).max(99).optional(),
  maxAge: z.number().int().min(18).max(99).optional(),
  maxDistance: z.number().int().min(1).max(500).optional(),
  lookingFor: z.array(z.string()).optional(),
});

const updateInterestsSchema = z.object({
  interests: z.array(z.string()).min(1).max(20),
});

export const validateUpdateProfile = (req: Request, res: Response, next: NextFunction): void => {
  const result = updateProfileSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
    return;
  }
  req.body = result.data;
  next();
};

export const validateUpdatePreferences = (req: Request, res: Response, next: NextFunction): void => {
  const result = updatePreferencesSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
    return;
  }
  req.body = result.data;
  next();
};

export const validateUpdateInterests = (req: Request, res: Response, next: NextFunction): void => {
  const result = updateInterestsSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
    return;
  }
  req.body = result.data;
  next();
};
