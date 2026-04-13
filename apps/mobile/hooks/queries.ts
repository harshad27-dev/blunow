import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedService } from '@/services/feed.service';
import { postService, CreatePostPayload } from '@/services/post.service';

/**
 * Validates and normalizes the feed data response
 */
export const useFeedQuery = () => {
  return useQuery({
    queryKey: ['feed'],
    queryFn: async () => {
      const data = await feedService.getFeed();
      if (!data?.success || !data?.feed) {
        return [];
      }
      return data.feed;
    },
  });
};

/**
 * Handles media upload (if any) and then post creation.
 */
interface CreatePostParams extends CreatePostPayload {
  imageUri?: string | null;
}

export const useCreatePostMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreatePostParams) => {
      const { imageUri, ...postPayload } = params;

      let uploadedUrls: string[] = [];
      let uploadedTypes: ('IMAGE' | 'VIDEO' | 'AUDIO')[] = [];

      if (imageUri) {
        const uploadedUrl = await postService.uploadMedia(imageUri);
        if (uploadedUrl) {
          uploadedUrls.push(uploadedUrl);
          uploadedTypes.push('IMAGE');
        }
      }

      return postService.createPost({
        ...postPayload,
        mediaUrls: uploadedUrls,
        mediaTypes: uploadedTypes,
      });
    },
    onSuccess: () => {
      // Invalidate feed query to refetch latest posts automatically
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
};
