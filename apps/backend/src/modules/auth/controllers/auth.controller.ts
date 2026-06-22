import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthRequest } from '../../../common/middleware/auth.middleware';

export class AuthController {
  private authService = new AuthService();

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.register(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.login(req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.statusCode ?? 401).json({ success: false, message: error.message });
    }
  };

  googleMobileLogin = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.googleMobileLogin(req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.statusCode ?? 401).json({ success: false, message: error.message });
    }
  };

  requestLoginOtp = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.requestLoginOtp(req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  startAuth = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.startAuth(req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  requestRegistrationOtp = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.requestRegistrationOtp(req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  registerWithOtp = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.registerWithOtp(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.requestPasswordReset(req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.resetPassword(req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.refreshToken(req.body.refreshToken);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.statusCode ?? 401).json({ success: false, message: error.message });
    }
  };

  logout = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await this.authService.logout(req.user!.id, req.body.refreshToken);
      res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error: any) {
      res.status(error.statusCode ?? 500).json({ success: false, message: error.message });
    }
  };

  getMe = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = await this.authService.getMe(req.user!.id);
      res.status(200).json({ success: true, data: user });
    } catch (error: any) {
      res.status(error.statusCode ?? 500).json({ success: false, message: error.message });
    }
  };
}
