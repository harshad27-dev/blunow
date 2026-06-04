import { Request, Response, NextFunction } from "express";
import { z } from "zod";

const createPostSchema = z
  .object({
    caption: z.string().max(2200).optional(),
    mediaUrls: z.array(z.string().url()).default([]),
    mediaTypes: z.array(z.enum(["IMAGE", "VIDEO", "AUDIO"])).default([]),
    isPublic: z.boolean().default(true),
    isAnonymous: z.boolean().default(false),
  })
  .refine((data) => data.caption?.trim() || data.mediaUrls.length > 0, {
    message: "Add text or media to create a post",
    path: ["caption"],
  });

const updatePostSchema = z.object({
  caption: z.string().max(2200).optional(),
  isPublic: z.boolean().optional(),
  isAnonymous: z.boolean().optional(),
});

export const validateCreatePost = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const result = createPostSchema.safeParse(req.body);
  if (!result.success) {
    res
      .status(400)
      .json({ success: false, errors: result.error.flatten().fieldErrors });
    return;
  }
  req.body = result.data;
  next();
};

export const validateUpdatePost = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const result = updatePostSchema.safeParse(req.body);
  if (!result.success) {
    res
      .status(400)
      .json({ success: false, errors: result.error.flatten().fieldErrors });
    return;
  }
  req.body = result.data;
  next();
};
