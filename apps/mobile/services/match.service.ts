import { api } from './api';
import type {
  MatchRequestStatus,
  SendMatchRequestPayload,
} from '@/types/match.types';

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
    const payload: SendMatchRequestPayload = { receiverId, message };
    const response = await api.post('/match/request', payload);
    return response.data;
  },

  getIncomingRequests: async () => {
    const response = await api.get('/match/requests/incoming');
    return response.data;
  },

  getOutgoingRequests: async () => {
    const response = await api.get('/match/requests/outgoing');
    return response.data;
  },

  respondToRequest: async (
    requestId: string,
    status: Extract<MatchRequestStatus, 'ACCEPTED' | 'REJECTED'>,
  ) => {
    const response = await api.patch(`/match/requests/${requestId}`, { status });
    return response.data;
  },

  unmatch: async (matchId: string) => {
    const response = await api.delete(`/match/${matchId}`);
    return response.data;
  },
};
