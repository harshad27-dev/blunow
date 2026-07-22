import { PostsRepository } from "../models/posts.repository";
import { eventBus } from "../../../events/event-bus";
import { EVENTS } from "../../../events/event-constants";
import { AppError } from "../../../common/middleware/error.middleware";
import { prisma } from "../../../prisma/prisma";

export class PostsService {
  private postsRepository = new PostsRepository();

  async createPost(
    authorId: string,
    data: {
      caption?: string;
      mediaUrls: string[];
      mediaTypes: any[];
      isPublic: boolean;
      isAnonymous: boolean;
    },
  ) {
    const post = await this.postsRepository.create({ ...data, authorId });
    eventBus.emit(EVENTS.POST.CREATED, { postId: post.id, authorId });
    return maskAnonymousPost({ ...post, isOwnPost: true });
  }

  async getPostById(id: string, viewerId: string) {
    const post = await this.postsRepository.findById(id);
    if (!post) throw new AppError("Post not found", 404);
    if (
      post.authorId !== viewerId &&
      (!post.isPublic ||
        !(await this.canViewUserContent(viewerId, post.authorId)))
    ) {
      throw new AppError("Post not found", 404);
    }
    const isFollowing = viewerId
      ? Boolean(
          await prisma.userFollow.findUnique({
            where: {
              followerId_followingId: {
                followerId: viewerId,
                followingId: post.authorId,
              },
            },
            select: { followerId: true },
          }),
        )
      : false;

    return maskAnonymousPost({
      ...post,
      isOwnPost: post.authorId === viewerId,
      isFollowing,
    });
  }

  async updatePost(id: string, userId: string, data: any) {
    const post = await this.postsRepository.findById(id);
    if (!post) throw new AppError("Post not found", 404);
    if (post.authorId !== userId) throw new AppError("Forbidden", 403);
    return this.postsRepository.update(id, data);
  }

  async deletePost(id: string, userId: string) {
    const post = await this.postsRepository.findById(id);
    if (!post) throw new AppError("Post not found", 404);
    if (post.authorId !== userId) throw new AppError("Forbidden", 403);
    await this.postsRepository.delete(id);
    eventBus.emit(EVENTS.POST.DELETED, { postId: id, authorId: userId });
  }

  async savePost(id: string, userId: string, collectionId?: string) {
    const post = await this.postsRepository.findById(id);
    if (!post) throw new AppError("Post not found", 404);
    return this.postsRepository.savePost(id, userId, collectionId);
  }

  async unsavePost(id: string, userId: string) {
    const post = await this.postsRepository.findById(id);
    if (!post) throw new AppError("Post not found", 404);
    return this.postsRepository.unsavePost(id, userId);
  }

  async getUserPosts(userId: string, viewerId?: string) {
    if (
      viewerId &&
      viewerId !== userId &&
      !(await this.canViewUserContent(viewerId, userId))
    ) {
      return [];
    }
    const posts = await this.postsRepository.findByAuthorId(
      userId,
      userId === viewerId,
    );
    return posts.map((post) =>
      maskAnonymousPost({ ...post, isOwnPost: post.authorId === viewerId }),
    );
  }

  private async canViewUserContent(viewerId: string, userId: string) {
    const [profile, follow, block] = await Promise.all([
      prisma.profile.findUnique({
        where: { userId },
        select: { isPrivate: true },
      }),
      prisma.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: userId,
          },
        },
        select: { followerId: true },
      }),
      prisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: viewerId, blockedId: userId },
            { blockerId: userId, blockedId: viewerId },
          ],
        },
        select: { blockerId: true },
      }),
    ]);

    if (block) return false;
    return !profile?.isPrivate || Boolean(follow);
  }

  async getSavedPosts(userId: string) {
    const posts = await this.postsRepository.findSavedByUserId(userId);
    return posts.map((post) =>
      maskAnonymousPost({ ...post, isOwnPost: post.authorId === userId }),
    );
  }

  async getTrendingPosts(limit = 20) {
    const normalizedLimit = Math.min(Math.max(limit, 1), 40);
    const posts = await this.postsRepository.findTrending(normalizedLimit);
    return posts.map(maskAnonymousPost);
  }
}

const maskAnonymousPost = (post: any) => {
  if (!post?.isAnonymous) return post;

  return {
    ...post,
    authorId: null,
    author: {
      ...post.author,
      id: null,
      googleId: undefined,
      passwordHash: undefined,
      email: undefined,
      fcmToken: undefined,
      profile: {
        username: "Anonymous",
        avatarUrl: null,
      },
    },
  };
};
