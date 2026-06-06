import { api } from './api';

export interface UnifiedSearchResult {
  users: Array<{
    id: string;
    username: string;
    avatarUrl: string;
    bio: string;
    birthDate: string;
    interests: string[];
    location: string;
  }>;
  posts: any[];
  rooms: any[];
}

export const searchService = {
  getDiscoverPeople: async (page: number = 1, limit: number = 20) => {
    const response = await api.get('/search/discover', {
      params: { page, limit },
    });
    return response.data;
  },

  getUnifiedSearch: async (q: string, type: string = 'all', page: number = 1, limit: number = 20) => {
    const response = await api.get('/search', {
      params: { q, type, page, limit },
    });
    return response.data;
  },

  getAdvancedSearch: async (filters: any, page: number = 1, limit: number = 20) => {
    const response = await api.get('/search/advanced', {
      params: { ...filters, page, limit },
    });
    return response.data;
  },

  getTrendingHashtags: async (limit: number = 10) => {
    const response = await api.get('/trending/hashtags', {
      params: { limit },
    });
    return response.data;
  }
};
