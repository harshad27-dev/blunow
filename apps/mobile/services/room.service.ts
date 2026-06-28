import { api } from "./api";

export const roomService = {
  getRoom: async (roomId: string) => {
    const response = await api.get("/rooms/" + roomId);
    return response.data;
  },
  getMembers: async (roomId: string) => {
    const response = await api.get("/rooms/" + roomId + "/members");
    return response.data;
  },
  joinRoom: async (roomId: string) => {
    const response = await api.post("/rooms/" + roomId + "/join");
    return response.data;
  },
  leaveRoom: async (roomId: string) => {
    const response = await api.delete("/rooms/" + roomId + "/leave");
    return response.data;
  },
};
