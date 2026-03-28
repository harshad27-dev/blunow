import { Response } from 'express';
import { MediaService } from '../services/media.service';
import { AuthRequest } from '../../../common/middleware/auth.middleware';
import { AppError } from '../../../common/middleware/error.middleware';

export class MediaController {
  private mediaService = new MediaService();

  uploadMedia = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) throw new AppError('No file provided', 400);

      const media = await this.mediaService.uploadMedia(req.user!.id, req.file);
      res.status(201).json({ success: true, data: media });
    } catch (error: any) {
      res.status(error.statusCode ?? 500).json({ success: false, message: error.message });
    }
  };

  getMedia = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const media = await this.mediaService.getMedia(req.params.id);
      res.status(200).json({ success: true, data: media });
    } catch (error: any) {
      res.status(error.statusCode ?? 404).json({ success: false, message: error.message });
    }
  };

  deleteMedia = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await this.mediaService.deleteMedia(req.params.id, req.user!.id);
      res.status(200).json({ success: true, message: 'Media deleted successfully' });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };
}
