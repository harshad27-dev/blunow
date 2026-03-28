import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const createConfessionSchema = z.object({
  content: z.string().min(10).max(1000),
  isAnonymous: z.boolean().default(true),
});

export const validateCreateConfession = (req: Request, res: Response, next: NextFunction): void => {
  const result = createConfessionSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
    return;
  }
  req.body = result.data;
  next();
};
