import { Request, Response, Router } from "express";
import { SearchRepository } from "../models/search.repository";
import {
  AuthRequest,
  authenticate,
} from "../../../common/middleware/auth.middleware";

class SearchController {
  private repo = new SearchRepository();

  getDiscoverPeople = async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const category = (req.query.category as string) || "For you";
      const data = await this.repo.getDiscoverPeople(
        req.user!.id,
        limit,
        (page - 1) * limit,
        category,
      );
      res.json({ success: true, ...data });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  };

  getUnifiedSearch = async (req: Request, res: Response) => {
    try {
      const q = req.query.q as string;
      const type = (req.query.type as string) || "all";
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const data = await this.repo.getUnifiedSearch(
        q,
        type,
        limit,
        (page - 1) * limit,
      );
      res.json({ success: true, query: q, type, results: data });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  };

  getAdvancedSearch = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const data = await this.repo.getAdvancedSearch(
        req.query,
        limit,
        (page - 1) * limit,
      );
      res.json({ success: true, ...data });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  };
}

class TrendingController {
  private repo = new SearchRepository();

  getTrendingHashtags = async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const data = await this.repo.getTrendingHashtags(limit);
      res.json({ success: true, ...data });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  };
}

const router = Router();
const sCtrl = new SearchController();
const tCtrl = new TrendingController();

router.use(authenticate);

router.get("/search/advanced", sCtrl.getAdvancedSearch);
router.get("/search/discover", sCtrl.getDiscoverPeople);
router.get("/search", sCtrl.getUnifiedSearch);

// Mount tending router separately or together (mapping via app.ts)
export const trendingRouter = Router();
trendingRouter.use(authenticate);
trendingRouter.get("/hashtags", tCtrl.getTrendingHashtags);

export default router;
