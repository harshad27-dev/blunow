import { api } from './api';

export const feedService = {
  getFeed: async (params?: any) => {
    const response = await api.get('/feed', { params });
    return response.data;
  }
};
