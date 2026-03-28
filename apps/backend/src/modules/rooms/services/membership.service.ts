import { RoomsRepository } from '../models/rooms.repository';
import { eventBus } from '../../../events/event-bus';
import { EVENTS } from '../../../events/event-constants';

export class MembershipService {
  private roomsRepository = new RoomsRepository();

  async joinRoom(roomId: string, userId: string) {
    await this.roomsRepository.addMember(roomId, userId);
    eventBus.emit(EVENTS.ROOM.MEMBER_JOINED, { roomId, userId });
  }

  async leaveRoom(roomId: string, userId: string) {
    await this.roomsRepository.removeMember(roomId, userId);
    eventBus.emit(EVENTS.ROOM.MEMBER_LEFT, { roomId, userId });
  }

  async addAdmin(roomId: string, userId: string) {
    await this.roomsRepository.addMember(roomId, userId, true);
  }

  async isAdmin(roomId: string, userId: string): Promise<boolean> {
    const membership = await this.roomsRepository.findMembership(roomId, userId);
    return membership?.isAdmin ?? false;
  }

  async getRoomMembers(roomId: string) {
    return this.roomsRepository.findMembers(roomId);
  }
}
