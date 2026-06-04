import { api } from "./api";

export const storyService = {
  getUserStories: async (userId: string) => {
    const response = await api.get(`/stories/user/${userId}`);
    return response.data;
  },

  getStory: async (storyId: string) => {
    const response = await api.get(`/stories/${storyId}`);
    return response.data;
  },

  recordView: async (storyId: string) => {
    const response = await api.post(`/stories/${storyId}/view`);
    return response.data;
  },
};
