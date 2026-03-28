import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const uploadMediaSchema = z.object({
  type: z.enum(['IMAGE', 'VIDEO', 'AUDIO']).optional(), // Usually inferred from file
});

export const validateMediaUpload = (req: Request, res: Response, next: NextFunction): void => {
  const result = uploadMediaSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
    return;
  }
  next();
};
