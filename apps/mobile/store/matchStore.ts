import { create } from "zustand";
import type { Match, MatchRecommendation, MatchRequest } from "@/types/match.types";

type MatchState = {
  matches: Match[];
  recommendations: MatchRecommendation[];
  incomingRequests: MatchRequest[];
  outgoingRequests: MatchRequest[];
  setMatches: (matches: Match[]) => void;
  setRecommendations: (recommendations: MatchRecommendation[]) => void;
  setIncomingRequests: (requests: MatchRequest[]) => void;
  setOutgoingRequests: (requests: MatchRequest[]) => void;
  clearMatches: () => void;
};

export const useMatchStore = create<MatchState>((set) => ({
  matches: [],
  recommendations: [],
  incomingRequests: [],
  outgoingRequests: [],
  setMatches: (matches) => set({ matches }),
  setRecommendations: (recommendations) => set({ recommendations }),
  setIncomingRequests: (incomingRequests) => set({ incomingRequests }),
  setOutgoingRequests: (outgoingRequests) => set({ outgoingRequests }),
  clearMatches: () =>
    set({
      matches: [],
      recommendations: [],
      incomingRequests: [],
      outgoingRequests: [],
    }),
}));
