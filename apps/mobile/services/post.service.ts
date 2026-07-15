import { api } from "./api";
import type { AxiosProgressEvent } from "axios";

export interface CreatePostPayload {
  caption?: string;
  mediaUrls?: string[];
  mediaTypes?: ("IMAGE" | "VIDEO" | "AUDIO")[];
  isPublic?: boolean;
  isAnonymous?: boolean;
}

export const postService = {
  uploadMedia: async (
    uri: string,
    mimeType: string = "image/jpeg",
    onProgress?: (progress: number) => void,
  ): Promise<string> => {
    const formData = new FormData();
    const filename = uri.split("/").pop() || "upload.jpg";

    // React Native FormData requires this specific shape for file uploads
    formData.append("file", {
      uri,
      name: filename,
      type: mimeType,
    } as any);

    const response = await api.post("/media/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (!event.total) return;
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      },
    });

    // We assume the backend returns { data: { url: 'https...' } } based on standard patterns.
    // If it returns the url directly or differently, adjust here.
    return response.data?.data?.url || response.data?.url || "";
  },

  createPost: async (payload: CreatePostPayload) => {
    const response = await api.post("/posts", payload);
    return response.data;
  },

  updatePost: async (
    postId: string,
    payload: Partial<CreatePostPayload>,
  ) => {
    const response = await api.patch("/posts/" + postId, payload);
    return response.data;
  },

  deletePost: async (postId: string) => {
    const response = await api.delete("/posts/" + postId);
    return response.data;
  },

  getPost: async (postId: string) => {
    const response = await api.get(`/posts/${postId}`);
    return response.data;
  },

  getUserPosts: async (userId: string) => {
    const response = await api.get(`/posts/user/${userId}`);
    return response.data;
  },

  getSavedPosts: async () => {
    const response = await api.get("/posts/saved");
    return response.data;
  },

  getTrendingPosts: async (limit = 12) => {
    const response = await api.get("/posts/trending", {
      params: { limit },
    });
    return response.data;
  },

  likePost: async (postId: string) => {
    const response = await api.post(`/posts/${postId}/like`);
    return response.data;
  },

  unlikePost: async (postId: string) => {
    const response = await api.delete(`/posts/${postId}/like`);
    return response.data;
  },

  savePost: async (postId: string) => {
    const response = await api.post(`/posts/${postId}/save`);
    return response.data;
  },

  unsavePost: async (postId: string) => {
    const response = await api.delete(`/posts/${postId}/save`);
    return response.data;
  },

  getComments: async (postId: string, page = 1, limit = 20) => {
    const response = await api.get(`/posts/${postId}/comments`, {
      params: { page, limit },
    });
    return response.data;
  },

  addComment: async (postId: string, content: string, parentId?: string) => {
    const response = await api.post(`/posts/${postId}/comments`, {
      content,
      parentId,
    });
    return response.data;
  },

  deleteComment: async (postId: string, commentId: string) => {
    const response = await api.delete(`/posts/${postId}/comments/${commentId}`);
    return response.data;
  },

  likeComment: async (postId: string, commentId: string) => {
    const response = await api.post(`/posts/${postId}/comments/${commentId}/like`);
    return response.data;
  },

  unlikeComment: async (postId: string, commentId: string) => {
    const response = await api.delete(`/posts/${postId}/comments/${commentId}/like`);
    return response.data;
  },

  updateComment: async (postId: string, commentId: string, content: string) => {
    const response = await api.patch(
      "/posts/" + postId + "/comments/" + commentId,
      { content },
    );
    return response.data;
  },

  reportComment: async (
    postId: string,
    commentId: string,
    reason: string,
    description?: string,
  ) => {
    const response = await api.post(
      "/posts/" + postId + "/comments/" + commentId + "/report",
      { reason, description },
    );
    return response.data;
  },
};
