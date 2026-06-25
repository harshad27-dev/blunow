import { Router } from "express";
import { PostsController } from "../controllers/posts.controller";
import { CommentsController } from "../controllers/comments.controller";
import { authenticate } from "../../../common/middleware/auth.middleware";
import {
  validateCreatePost,
  validateUpdatePost,
} from "../middleware/posts.validate.middleware";
import {
  contentCreationRateLimitMiddleware,
  socialActionRateLimitMiddleware,
} from "../../../common/middleware/rate-limit.middleware";

const router = Router();
const postsController = new PostsController();
const commentsController = new CommentsController();

router.use(authenticate);

// Posts
router.post("/", contentCreationRateLimitMiddleware, validateCreatePost, postsController.createPost);
router.get("/saved", postsController.getSavedPosts);
router.get("/user/:id", postsController.getUserPosts);
router.get("/:id", postsController.getPost);
router.patch("/:id", validateUpdatePost, postsController.updatePost);
router.delete("/:id", postsController.deletePost);

// Likes
router.post("/:id/like", socialActionRateLimitMiddleware, postsController.likePost);
router.delete("/:id/like", socialActionRateLimitMiddleware, postsController.unlikePost);

// Saves (Bookmarks)
router.post("/:id/save", socialActionRateLimitMiddleware, postsController.savePost);
router.delete("/:id/save", socialActionRateLimitMiddleware, postsController.unsavePost);

// Comments
router.get("/:id/comments", commentsController.getComments);
router.post("/:id/comments", socialActionRateLimitMiddleware, commentsController.createComment);
router.post("/:postId/comments/:commentId/like", socialActionRateLimitMiddleware, commentsController.likeComment);
router.delete("/:postId/comments/:commentId/like", socialActionRateLimitMiddleware, commentsController.unlikeComment);
router.patch("/:postId/comments/:commentId", commentsController.updateComment);
router.post("/:postId/comments/:commentId/report", socialActionRateLimitMiddleware, commentsController.reportComment);
router.delete("/:postId/comments/:commentId", commentsController.deleteComment);

export default router;
