import { api } from './api';

export interface CreatePostPayload {
  caption?: string;
  mediaUrls?: string[];
  mediaTypes?: ('IMAGE' | 'VIDEO' | 'AUDIO')[];
  isPublic?: boolean;
}

export const postService = {
  uploadMedia: async (uri: string, mimeType: string = 'image/jpeg'): Promise<string> => {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'upload.jpg';
    
    // React Native FormData requires this specific shape for file uploads
    formData.append('file', {
      uri,
      name: filename,
      type: mimeType,
    } as any);

    const response = await api.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // We assume the backend returns { data: { url: 'https...' } } based on standard patterns.
    // If it returns the url directly or differently, adjust here.
    return response.data?.data?.url || response.data?.url || '';
  },

  createPost: async (payload: CreatePostPayload) => {
    const response = await api.post('/posts', payload);
    return response.data;
  },

  getUserPosts: async (userId: string) => {
    const response = await api.get(`/posts/user/${userId}`);
    return response.data;
  }
};
