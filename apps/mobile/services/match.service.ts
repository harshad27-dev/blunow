import { api } from './api';

export const matchService = {
  getMatches: async () => {
    const response = await api.get('/match');
    return response.data;
  },

  getRecommendations: async () => {
    const response = await api.get('/match/recommendations');
    return response.data;
  },

  sendRequest: async (receiverId: string, message?: string) => {
    const response = await api.post('/match/request', { receiverId, message });
    return response.data;
  },
};
