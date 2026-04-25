import { Router } from 'express';
import { PostsController } from '../controllers/posts.controller';
import { CommentsController } from '../controllers/comments.controller';
import { authenticate } from '../../../common/middleware/auth.middleware';
import { validateCreatePost, validateUpdatePost } from '../middleware/posts.validate.middleware';

const router = Router();
const postsController = new PostsController();
const commentsController = new CommentsController();

router.use(authenticate);

// Posts
router.post('/', validateCreatePost, postsController.createPost);
router.get('/:id', postsController.getPost);
router.get('/user/:id', postsController.getUserPosts);
router.patch('/:id', validateUpdatePost, postsController.updatePost);
router.delete('/:id', postsController.deletePost);

// Likes
router.post('/:id/like', postsController.likePost);
router.delete('/:id/like', postsController.unlikePost);

// Saves (Bookmarks)
router.post('/:id/save', postsController.savePost);
router.delete('/:id/save', postsController.unsavePost);

// Comments
router.get('/:id/comments', commentsController.getComments);
router.post('/:id/comments', commentsController.createComment);
router.delete('/:postId/comments/:commentId', commentsController.deleteComment);

export default router;
