import { prisma } from '../../../prisma/prisma';

export class UsersRepository {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
  }

  async findMany(filters: { isActive?: boolean; role?: any } = {}) {
    return prisma.user.findMany({
      where: filters,
      include: { profile: true },
    });
  }

  async updateProfile(userId: string, data: Record<string, any>) {
    return prisma.profile.update({
      where: { userId },
      data,
    });
  }

  async deactivate(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }
}
