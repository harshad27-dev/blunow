import { api } from "./api";

export interface CreateStoryPayload {
  mediaUrl: string;
  mediaType: "IMAGE" | "VIDEO" | "AUDIO";
  caption?: string;
}

export const storyService = {
  getStories: async () => {
    const response = await api.get("/stories");
    return response.data;
  },

  createStory: async (payload: CreateStoryPayload) => {
    const response = await api.post("/stories", payload);
    return response.data;
  },

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

  replyToStory: async (storyId: string, content: string) => {
    const response = await api.post(`/stories/${storyId}/reply`, { content });
    return response.data;
  },

  deleteStory: async (storyId: string) => {
    const response = await api.delete("/stories/" + storyId);
    return response.data;
  },
};
