import { PostsRepository } from '../models/posts.repository';
import { eventBus } from '../../../events/event-bus';
import { EVENTS } from '../../../events/event-constants';

export class LikesService {
  private postsRepository = new PostsRepository();

  async likePost(postId: string, userId: string) {
    await this.postsRepository.addLike(postId, userId);
    eventBus.emit(EVENTS.POST.LIKED, { postId, userId });
  }

  async unlikePost(postId: string, userId: string) {
    await this.postsRepository.removeLike(postId, userId);
  }
}
