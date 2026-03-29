import { PostsRepository } from '../models/posts.repository';
import { eventBus } from '../../../events/event-bus';
import { EVENTS } from '../../../events/event-constants';
import { AppError } from '../../../common/middleware/error.middleware';

export class PostsService {
  private postsRepository = new PostsRepository();

  async createPost(authorId: string, data: {
    caption?: string;
    mediaUrls: string[];
    mediaTypes: any[];
    isPublic: boolean;
  }) {
    const post = await this.postsRepository.create({ ...data, authorId });
    eventBus.emit(EVENTS.POST.CREATED, { postId: post.id, authorId });
    return post;
  }

  async getPostById(id: string) {
    const post = await this.postsRepository.findById(id);
    if (!post) throw new AppError('Post not found', 404);
    return post;
  }

  async updatePost(id: string, userId: string, data: any) {
    const post = await this.postsRepository.findById(id);
    if (!post) throw new AppError('Post not found', 404);
    if (post.authorId !== userId) throw new AppError('Forbidden', 403);
    return this.postsRepository.update(id, data);
  }

  async deletePost(id: string, userId: string) {
    const post = await this.postsRepository.findById(id);
    if (!post) throw new AppError('Post not found', 404);
    if (post.authorId !== userId) throw new AppError('Forbidden', 403);
    await this.postsRepository.delete(id);
    eventBus.emit(EVENTS.POST.DELETED, { postId: id, authorId: userId });
  }

  async savePost(id: string, userId: string, collectionId?: string) {
    const post = await this.postsRepository.findById(id);
    if (!post) throw new AppError('Post not found', 404);
    return this.postsRepository.savePost(id, userId, collectionId);
  }

  async unsavePost(id: string, userId: string) {
    const post = await this.postsRepository.findById(id);
    if (!post) throw new AppError('Post not found', 404);
    return this.postsRepository.unsavePost(id, userId);
  }
}
