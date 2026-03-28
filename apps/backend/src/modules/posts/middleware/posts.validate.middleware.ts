import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const createPostSchema = z.object({
  caption: z.string().max(2200).optional(),
  mediaUrls: z.array(z.string().url()).min(1),
  mediaTypes: z.array(z.enum(['IMAGE', 'VIDEO', 'AUDIO'])),
  isPublic: z.boolean().default(true),
});

const updatePostSchema = z.object({
  caption: z.string().max(2200).optional(),
  isPublic: z.boolean().optional(),
});

export const validateCreatePost = (req: Request, res: Response, next: NextFunction): void => {
  const result = createPostSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
    return;
  }
  req.body = result.data;
  next();
};

export const validateUpdatePost = (req: Request, res: Response, next: NextFunction): void => {
  const result = updatePostSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
    return;
  }
  req.body = result.data;
  next();
};
