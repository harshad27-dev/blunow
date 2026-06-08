import { useEffect, useMemo } from "react";
import { io, type Socket } from "socket.io-client";
import { Config } from "@/constants/config";
import { storage } from "@/utils/storage";

type ServerToClientEvents = {
  "chat:message:new": (message: unknown) => void;
  "chat:typing": (payload: { userId: string; isTyping: boolean }) => void;
  "chat:read": (payload: { chatId: string; userId: string }) => void;
  "chat:error": (payload: { message?: string }) => void;
};

type ClientToServerEvents = {
  "chat:join": (chatId: string) => void;
  "chat:leave": (chatId: string) => void;
  "chat:message": (payload: {
    chatId: string;
    type: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO";
    content?: string;
    mediaUrl?: string;
  }) => void;
  "chat:typing": (payload: { chatId: string; isTyping: boolean }) => void;
  "chat:read": (chatId: string) => void;
};

export type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export const useChatSocket = () => {
  const socket = useMemo<ChatSocket>(
    () =>
      io(`${Config.API_URL}/chat`, {
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: 5,
        transports: ["websocket"],
      }),
    [],
  );

  useEffect(() => {
    let mounted = true;

    const connect = async () => {
      const token = await storage.get(Config.TOKEN_KEY);
      if (!mounted || !token) return;

      socket.auth = { token };
      socket.connect();
    };

    connect();

    return () => {
      mounted = false;
      socket.disconnect();
    };
  }, [socket]);

  return socket;
};
