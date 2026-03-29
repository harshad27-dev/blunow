import { Response } from 'express';
import { RoomsService } from '../services/rooms.service';
import { MembershipService } from '../services/membership.service';
import { AuthRequest } from '../../../common/middleware/auth.middleware';

export class RoomsController {
  private roomsService = new RoomsService();
  private membershipService = new MembershipService();

  getRooms = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const type = req.query.type as any;
      const rooms = await this.roomsService.getRooms({ page, limit, type });
      res.status(200).json({ success: true, data: rooms });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getRecommendedRooms = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // In MVP, recommended rooms is just fetching top rooms
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const type = req.query.type as any;
      const rooms = await this.roomsService.getRooms({ page, limit, type });
      res.status(200).json({ success: true, text: "Recommendations", data: rooms });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  createRoom = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const room = await this.roomsService.createRoom(req.user!.id, req.body);
      res.status(201).json({ success: true, data: room });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  getRoom = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const room = await this.roomsService.getRoomById(req.params.id);
      res.status(200).json({ success: true, data: room });
    } catch (error: any) {
      res.status(error.statusCode ?? 404).json({ success: false, message: error.message });
    }
  };

  updateRoom = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const room = await this.roomsService.updateRoom(req.params.id, req.user!.id, req.body);
      res.status(200).json({ success: true, data: room });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  deleteRoom = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await this.roomsService.deleteRoom(req.params.id, req.user!.id);
      res.status(200).json({ success: true, message: 'Room deleted' });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  joinRoom = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await this.membershipService.joinRoom(req.params.id, req.user!.id);
      res.status(200).json({ success: true, message: 'Joined room' });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  leaveRoom = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await this.membershipService.leaveRoom(req.params.id, req.user!.id);
      res.status(200).json({ success: true, message: 'Left room' });
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
    }
  };

  getMembers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const members = await this.membershipService.getRoomMembers(req.params.id);
      res.status(200).json({ success: true, data: members });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}
