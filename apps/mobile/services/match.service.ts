import { api } from './api';
import type {
  MatchRecommendationFilters,
  MatchRequestStatus,
  SendMatchRequestPayload,
} from '@/types/match.types';

export const matchService = {
  getMatches: async () => {
    const response = await api.get('/match');
    return response.data;
  },

  getRecommendations: async (filters: MatchRecommendationFilters = {}) => {
    const response = await api.get('/match/recommendations', {
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      params: {
        ...filters,
        interests: filters.interests?.join(','),
      },
    });
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

  dismissRecommendation: async (userId: string) => {
    const response = await api.post(`/match/recommendations/${userId}/dismiss`);
    return response.data;
  },

  unmatch: async (matchId: string) => {
    const response = await api.delete(`/match/${matchId}`);
    return response.data;
  },
};
