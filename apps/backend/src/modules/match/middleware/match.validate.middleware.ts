import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const matchRequestSchema = z.object({
  receiverId: z.string().uuid(),
  message: z.string().max(300).optional(),
});

const respondSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED']),
});

export const validateMatchRequest = (req: Request, res: Response, next: NextFunction): void => {
  const result = matchRequestSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
    return;
  }
  req.body = result.data;
  next();
};

export const validateRespondRequest = (req: Request, res: Response, next: NextFunction): void => {
  const result = respondSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
    return;
  }
  req.body = result.data;
  next();
};
