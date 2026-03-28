import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const createRoomSchema = z.object({
  name: z.string().min(3).max(50),
  description: z.string().max(500).optional(),
  type: z.enum(['PUBLIC', 'PRIVATE', 'TOPIC']).default('PUBLIC'),
  topic: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional(),
  maxMembers: z.number().int().min(2).max(1000).default(100),
});

export const validateCreateRoom = (req: Request, res: Response, next: NextFunction): void => {
  const result = createRoomSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
    return;
  }
  req.body = result.data;
  next();
};
