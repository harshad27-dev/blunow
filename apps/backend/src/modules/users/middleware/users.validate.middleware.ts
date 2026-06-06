import { Request, Response, NextFunction } from "express";
import { z } from "zod";

const genderSchema = z.enum(["MALE", "FEMALE", "NON_BINARY", "OTHER"]);
const sexualitySchema = z.enum(["STRAIGHT", "GAY", "LESBIAN", "BI", "ASEXUAL"]);

const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-z0-9]+([._]?[a-z0-9]+)*$/, "Invalid username format")
    .optional(),
  bio: z.string().max(500).optional(),
  age: z.number().int().min(18).max(99).optional(),
  birthDate: z.string().datetime().optional(),
  gender: genderSchema.optional(),
  sexuality: sexualitySchema.optional(),
  location: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  avatarUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  interests: z.array(z.string()).max(20).optional(),
  interestedIn: z.array(z.string()).max(10).optional(),
  lookingFor: z.array(z.string()).max(10).optional(),
  relationship: z.string().max(80).optional(),
  minAge: z.number().int().min(18).max(99).optional(),
  maxAge: z.number().int().min(18).max(99).optional(),
  maxDistance: z.number().int().min(1).max(500).optional(),
  drinking: z.string().max(40).optional(),
  smoking: z.string().max(40).optional(),
  workout: z.string().max(40).optional(),
  pets: z.string().max(40).optional(),
  zodiac: z.string().max(40).optional(),
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

export const validateUpdateProfile = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const result = updateProfileSchema.safeParse(req.body);
  if (!result.success) {
    res
      .status(400)
      .json({ success: false, errors: result.error.flatten().fieldErrors });
    return;
  }
  req.body = result.data;
  next();
};

export const validateUpdatePreferences = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const result = updatePreferencesSchema.safeParse(req.body);
  if (!result.success) {
    res
      .status(400)
      .json({ success: false, errors: result.error.flatten().fieldErrors });
    return;
  }
  req.body = result.data;
  next();
};

export const validateUpdateInterests = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const result = updateInterestsSchema.safeParse(req.body);
  if (!result.success) {
    res
      .status(400)
      .json({ success: false, errors: result.error.flatten().fieldErrors });
    return;
  }
  req.body = result.data;
  next();
};
