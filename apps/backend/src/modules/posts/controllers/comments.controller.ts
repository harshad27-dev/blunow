import { Response } from 'express';
import { CommentsService } from '../services/comments.service';
import { AuthRequest } from '../../../common/middleware/auth.middleware';

export class CommentsController {
  private commentsService = new CommentsService();

  getComments = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const comments = await this.commentsService.getComments(req.params.id, req.user!.id, { page, limit });
      res.status(200).json({ success: true, data: comments });
    } catch (error: any) {
      res.status(error.statusCode ?? 500).json({ success: false, message: error.message });
    }
  };

  createComment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const comment = await this.commentsService.createComment(
        req.params.id,
        req.user!.id,
        req.body.content,
        req.body.parentId,
      );
      res.status(201).json({ success: true, data: comment });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  deleteComment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await this.commentsService.deleteComment(req.params.commentId, req.user!.id);
      res.status(200).json({ success: true, message: 'Comment deleted' });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  updateComment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const comment = await this.commentsService.updateComment(
        req.params.commentId,
        req.user!.id,
        req.body.content,
      );
      res.status(200).json({ success: true, data: comment });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  reportComment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const report = await this.commentsService.reportComment(
        req.params.commentId,
        req.user!.id,
        {
          reason: req.body.reason || 'OTHER',
          description: req.body.description,
        },
      );
      res.status(201).json({ success: true, data: report });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  likeComment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await this.commentsService.likeComment(req.params.commentId, req.user!.id);
      res.status(200).json({ success: true, message: 'Comment liked' });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  unlikeComment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await this.commentsService.unlikeComment(req.params.commentId, req.user!.id);
      res.status(200).json({ success: true, message: 'Comment unliked' });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };
}
