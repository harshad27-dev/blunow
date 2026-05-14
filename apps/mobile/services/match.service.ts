import { api } from './api';

export const matchService = {
  getMatches: async () => {
    const response = await api.get('/match');
    return response.data;
  },
};
