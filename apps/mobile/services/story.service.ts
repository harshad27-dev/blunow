import { api } from './api';

export const storyService = {
  getUserStories: async (userId: string) => {
    const response = await api.get(`/stories/user/${userId}`);
    return response.data;
  },
};
