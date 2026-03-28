import { Response } from 'express';
import { StoriesService } from '../services/stories.service';
import { AuthRequest } from '../../../common/middleware/auth.middleware';

export class StoriesController {
  private storiesService = new StoriesService();

  getStories = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const stories = await this.storiesService.getActiveStories(req.user!.id);
      res.status(200).json({ success: true, data: stories });
    } catch (error: any) {
      res.status(error.statusCode ?? 500).json({ success: false, message: error.message });
    }
  };

  createStory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const story = await this.storiesService.createStory(req.user!.id, req.body);
      res.status(201).json({ success: true, data: story });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  getStory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const story = await this.storiesService.getStoryById(req.params.id);
      res.status(200).json({ success: true, data: story });
    } catch (error: any) {
      res.status(error.statusCode ?? 404).json({ success: false, message: error.message });
    }
  };

  deleteStory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await this.storiesService.deleteStory(req.params.id, req.user!.id);
      res.status(200).json({ success: true, message: 'Story deleted' });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  viewStory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await this.storiesService.recordView(req.params.id, req.user!.id);
      res.status(200).json({ success: true, message: 'View recorded' });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };
}
