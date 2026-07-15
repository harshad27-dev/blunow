import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const createStorySchema = z.object({
  mediaUrl: z.string().url(),
  mediaType: z.enum(['IMAGE', 'VIDEO']),
  caption: z.string().max(200).optional(),
});

export const validateCreateStory = (req: Request, res: Response, next: NextFunction): void => {
  const result = createStorySchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
    return;
  }
  req.body = result.data;
  next();
};
const storyReplySchema = z.object({
  content: z.string().trim().min(1).max(500),
});

export const validateStoryReply = (req: Request, res: Response, next: NextFunction): void => {
  const result = storyReplySchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
    return;
  }
  req.body = result.data;
  next();
};
