import { prisma } from '../../../prisma/prisma';

export class RoomsRepository {
  async create(data: any) {
    return prisma.room.create({ data });
  }

  async findMany(filters: { page: number; limit: number; type?: any }) {
    const skip = (filters.page - 1) * filters.limit;
    return prisma.room.findMany({
      where: filters.type ? { type: filters.type } : {},
      include: { _count: { select: { memberships: true } } },
      skip,
      take: filters.limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.room.findUnique({
      where: { id },
      include: { _count: { select: { memberships: true } } },
    });
  }

  async update(id: string, data: any) {
    return prisma.room.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.room.delete({ where: { id } });
  }

  async addMember(roomId: string, userId: string, isAdmin = false) {
    return prisma.roomMembership.upsert({
      where: { roomId_userId: { roomId, userId } },
      create: { roomId, userId, isAdmin },
      update: { isAdmin },
    });
  }

  async removeMember(roomId: string, userId: string) {
    return prisma.roomMembership.deleteMany({ where: { roomId, userId } });
  }

  async findMembership(roomId: string, userId: string) {
    return prisma.roomMembership.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
  }

  async findMembers(roomId: string) {
    return prisma.roomMembership.findMany({
      where: { roomId },
      include: { user: { include: { profile: { select: { displayName: true, avatarUrl: true } } } } },
    });
  }
}
