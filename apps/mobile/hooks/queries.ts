import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedService } from '@/services/feed.service';
import { postService, CreatePostPayload } from '@/services/post.service';
import { userService } from '@/services/user.service';
import { searchService } from '@/services/search.service';
import { matchService } from '@/services/match.service';
import { storyService } from '@/services/story.service';


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
      queryClient.invalidateQueries({ queryKey: ['user-posts'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['saved-posts'] });
    },
  });
};

/**
 * Fetches stats for a specific user
 */
export const useUserStatsQuery = (userId?: string) => {
  return useQuery({
    queryKey: ['user-stats', userId],
    queryFn: async () => {
      if (!userId) return null;
      const data = await userService.getStats(userId);
      if (!data?.success || !data?.stats) {
        return {
          followers: 0,
          following: 0,
          postsCount: 0,
          matchCount: 0,
          storiesCount: 0,
          likesReceived: 0,
          conversationsCount: 0,
          savedPostsCount: 0,
          profileViews: 0,
          lastUpdated: null,
        };
      }
      return {
        followers: data.stats.followers || 0,
        following: data.stats.following || 0,
        postsCount: data.stats.postsCount || 0,
        matchCount: data.stats.matchCount || 0,
        storiesCount: data.stats.storiesCount || 0,
        likesReceived: data.stats.likesReceived || 0,
        conversationsCount: data.stats.conversationsCount || 0,
        savedPostsCount: data.stats.savedPostsCount || 0,
        profileViews: data.stats.profileViews || 0,
        lastUpdated: data.stats.lastUpdated || null,
      };
    },
    enabled: !!userId,
  });
};

/**
 * Fetches all posts for a specific user
 */
export const useUserPostsQuery = (userId?: string) => {
  return useQuery({
    queryKey: ['user-posts', userId],
    queryFn: async () => {
      if (!userId) return [];
      const response = await postService.getUserPosts(userId);
      if (!response?.success || !Array.isArray(response.data)) {
        return [];
      }
      // Normalize backend data structure to match ProfilePostGrid expectations
      return response.data.map((post: any) => ({
        id: post.id,
        thumbnailUrl: post.mediaUrls?.[0] || '', // Use the first media URL as thumbnail
      }));
    },
    enabled: !!userId,
  });
};

/**
 * Fetches saved posts for the current user
 */
export const useSavedPostsQuery = (enabled = true) => {
  return useQuery({
    queryKey: ['saved-posts'],
    queryFn: async () => {
      const response = await postService.getSavedPosts();
      if (!response?.success || !Array.isArray(response.data)) {
        return [];
      }
      return response.data.map((post: any) => ({
        id: post.id,
        thumbnailUrl: post.mediaUrls?.[0] || '',
      }));
    },
    enabled,
  });
};

/**
 * Fetches active stories for a specific user
 */
export const useUserStoriesQuery = (userId?: string, enabled = true) => {
  return useQuery({
    queryKey: ['user-stories', userId],
    queryFn: async () => {
      if (!userId) return [];
      const response = await storyService.getUserStories(userId);
      if (!response?.success || !Array.isArray(response.data)) {
        return [];
      }
      return response.data.map((story: any) => ({
        id: story.id,
        thumbnailUrl: story.mediaUrl || '',
      }));
    },
    enabled: !!userId && enabled,
  });
};

/**
 * Fetches matches for the current user
 */
export const useMatchesQuery = (enabled = true) => {
  return useQuery({
    queryKey: ['matches'],
    queryFn: async () => {
      const response = await matchService.getMatches();
      if (!response?.success || !Array.isArray(response.data)) {
        return [];
      }
      return response.data;
    },
    enabled,
  });
};

/**
 * Updates the user's profile information
 */
export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      return userService.updateProfile(payload);
    },
    onSuccess: () => {
      // Invalidate user data to refetch fresh profile info
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    },
  });
};

/**
 * Real-time unified search
 */
export const useSearchQuery = (q: string, type: string = 'users') => {
  return useQuery({
    queryKey: ['search', q, type],
    queryFn: async () => {
      if (!q || q.length < 2) return { users: [], posts: [], rooms: [] };
      const response = await searchService.getUnifiedSearch(q, type);
      if (!response?.success || !response?.results) {
        return { users: [], posts: [], rooms: [] };
      }
      return response.results;
    },
    enabled: q.length >= 2,
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Fetches full profile data for any user
 */
export const useUserProfileQuery = (userId?: string) => {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const data = await userService.getProfile(userId);
      if (!data?.success || !data?.data) {
        return null;
      }
      return data.data;
    },
    enabled: !!userId,
  });
};
