import { Response } from 'express';
import { MatchService } from '../services/match.service';
import { MatchRequestService } from '../services/match-request.service';
import { AuthRequest } from '../../../common/middleware/auth.middleware';

export class MatchController {
  private matchService = new MatchService();
  private matchRequestService = new MatchRequestService();

  sendRequest = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const request = await this.matchRequestService.sendRequest(req.user!.id, req.body);
      res.status(201).json({ success: true, data: request });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  getIncomingRequests = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const requests = await this.matchRequestService.getIncoming(req.user!.id);
      res.status(200).json({ success: true, data: requests });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getOutgoingRequests = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const requests = await this.matchRequestService.getOutgoing(req.user!.id);
      res.status(200).json({ success: true, data: requests });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  respondToRequest = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await this.matchRequestService.respond(req.params.id, req.user!.id, req.body.status);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  getMatches = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const matches = await this.matchService.getMatches(req.user!.id);
      res.status(200).json({ success: true, data: matches });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getRecommendations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const recommendations = await this.matchService.getRecommendations(req.user!.id, limit, {
        minAge: parseOptionalNumber(req.query.minAge),
        maxAge: parseOptionalNumber(req.query.maxAge),
        maxDistance: parseOptionalNumber(req.query.maxDistance),
        gender: parseOptionalString(req.query.gender),
        useMyPreference: parseOptionalBoolean(req.query.useMyPreference),
        interests: parseOptionalList(req.query.interests),
        verifiedOnly: parseOptionalBoolean(req.query.verifiedOnly),
        onlineOnly: parseOptionalBoolean(req.query.onlineOnly),
      });
      res.status(200).json({ success: true, data: recommendations });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  dismissRecommendation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await this.matchService.dismissRecommendation(req.user!.id, req.params.userId);
      res.status(200).json({ success: true, message: 'Recommendation dismissed' });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  unmatch = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await this.matchService.unmatch(req.params.id, req.user!.id);
      res.status(200).json({ success: true, message: 'Unmatched successfully' });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };
}

const parseOptionalString = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const parseOptionalNumber = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseOptionalBoolean = (value: unknown) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

const parseOptionalList = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
};
