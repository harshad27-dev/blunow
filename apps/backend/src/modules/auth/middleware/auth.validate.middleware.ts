import { Request, Response, NextFunction } from "express";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-z0-9]+([._]?[a-z0-9]+)*$/, "Invalid username format"),
  birthDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  gender: z.enum(["MALE", "FEMALE", "NON_BINARY", "OTHER"]),
  location: z.string().max(120).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

const requestLoginOtpSchema = z.object({
  email: z.string().email(),
});

const registerWithOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-z0-9]+([._]?[a-z0-9]+)*$/, "Invalid username format"),
  birthDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  gender: z.enum(["MALE", "FEMALE", "NON_BINARY", "OTHER"]),
  location: z.string().max(120).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

const googleMobileSchema = z.object({
  idToken: z.string().min(20),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const validateRegister = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    res
      .status(400)
      .json({ success: false, errors: result.error.flatten().fieldErrors });
    return;
  }
  req.body = result.data;
  next();
};

export const validateLogin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res
      .status(400)
      .json({ success: false, errors: result.error.flatten().fieldErrors });
    return;
  }
  req.body = result.data;
  next();
};

export const validateRequestLoginOtp = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const result = requestLoginOtpSchema.safeParse(req.body);
  if (!result.success) {
    res
      .status(400)
      .json({ success: false, errors: result.error.flatten().fieldErrors });
    return;
  }
  req.body = result.data;
  next();
};

export const validateRegisterWithOtp = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const result = registerWithOtpSchema.safeParse(req.body);
  if (!result.success) {
    res
      .status(400)
      .json({ success: false, errors: result.error.flatten().fieldErrors });
    return;
  }
  req.body = result.data;
  next();
};

export const validateGoogleMobileLogin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const result = googleMobileSchema.safeParse(req.body);
  if (!result.success) {
    res
      .status(400)
      .json({ success: false, errors: result.error.flatten().fieldErrors });
    return;
  }
  req.body = result.data;
  next();
};

export const validateRefreshToken = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const result = refreshTokenSchema.safeParse(req.body);
  if (!result.success) {
    res
      .status(400)
      .json({ success: false, errors: result.error.flatten().fieldErrors });
    return;
  }
  req.body = result.data;
  next();
};

export const validateResetPassword = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const result = resetPasswordSchema.safeParse(req.body);
  if (!result.success) {
    res
      .status(400)
      .json({ success: false, errors: result.error.flatten().fieldErrors });
    return;
  }
  req.body = result.data;
  next();
};
