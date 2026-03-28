import { RoomsRepository } from '../models/rooms.repository';
import { MembershipService } from './membership.service';
import { eventBus } from '../../../events/event-bus';
import { EVENTS } from '../../../events/event-constants';
import { AppError } from '../../../common/middleware/error.middleware';

export class RoomsService {
  private roomsRepository = new RoomsRepository();
  private membershipService = new MembershipService();

  async createRoom(creatorId: string, data: any) {
    const room = await this.roomsRepository.create({ ...data, createdBy: creatorId });
    // Creator automatically joins as admin
    await this.membershipService.addAdmin(room.id, creatorId);
    eventBus.emit(EVENTS.ROOM.CREATED, { roomId: room.id, creatorId });
    return room;
  }

  async getRooms(filters: { page: number; limit: number; type?: any }) {
    return this.roomsRepository.findMany(filters);
  }

  async getRoomById(id: string) {
    const room = await this.roomsRepository.findById(id);
    if (!room) throw new AppError('Room not found', 404);
    return room;
  }

  async updateRoom(roomId: string, userId: string, data: any) {
    const isAdmin = await this.membershipService.isAdmin(roomId, userId);
    if (!isAdmin) throw new AppError('Forbidden: Must be room admin', 403);
    return this.roomsRepository.update(roomId, data);
  }

  async deleteRoom(roomId: string, userId: string) {
    const isAdmin = await this.membershipService.isAdmin(roomId, userId);
    if (!isAdmin) throw new AppError('Forbidden: Must be room admin', 403);
    await this.roomsRepository.delete(roomId);
  }
}
