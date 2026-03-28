import { Response } from 'express';
import { PostsService } from '../services/posts.service';
import { LikesService } from '../services/likes.service';
import { AuthRequest } from '../../../common/middleware/auth.middleware';

export class PostsController {
  private postsService = new PostsService();
  private likesService = new LikesService();

  createPost = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const post = await this.postsService.createPost(req.user!.id, req.body);
      res.status(201).json({ success: true, data: post });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  getPost = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const post = await this.postsService.getPostById(req.params.id);
      res.status(200).json({ success: true, data: post });
    } catch (error: any) {
      res.status(error.statusCode ?? 404).json({ success: false, message: error.message });
    }
  };

  updatePost = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const post = await this.postsService.updatePost(req.params.id, req.user!.id, req.body);
      res.status(200).json({ success: true, data: post });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  deletePost = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await this.postsService.deletePost(req.params.id, req.user!.id);
      res.status(200).json({ success: true, message: 'Post deleted' });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  likePost = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await this.likesService.likePost(req.params.id, req.user!.id);
      res.status(200).json({ success: true, message: 'Post liked' });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  unlikePost = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await this.likesService.unlikePost(req.params.id, req.user!.id);
      res.status(200).json({ success: true, message: 'Post unliked' });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };
}
