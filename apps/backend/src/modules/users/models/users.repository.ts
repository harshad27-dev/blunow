import { Prisma } from "@prisma/client";
import { prisma } from "../../../prisma/prisma";

const profileFieldNames = new Set(
  Prisma.dmmf.datamodel.models
    .find((model) => model.name === "Profile")
    ?.fields.map((field) => field.name) ?? [],
);

const pickProfileFields = (data: Record<string, any>) =>
  Object.fromEntries(
    Object.entries(data).filter(([key]) => profileFieldNames.has(key)),
  );

export class UsersRepository {
  async findById(id: string, viewerId?: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        followers: viewerId
          ? { where: { followerId: viewerId }, select: { followerId: true } }
          : false,
        blockedByUsers: viewerId
          ? { where: { blockerId: viewerId }, select: { blockerId: true } }
          : false,
      },
    });
  }

  async recordProfileView(viewerId: string, viewedUserId: string) {
    if (viewerId === viewedUserId) return;

    await prisma.$transaction(async (tx) => {
      const existing = await tx.profileView.findUnique({
        where: { viewerId_viewedUserId: { viewerId, viewedUserId } },
        select: { id: true },
      });

      if (existing) {
        await tx.profileView.update({
          where: { id: existing.id },
          data: { updatedAt: new Date() },
        });
        return;
      }

      await tx.profileView.create({ data: { viewerId, viewedUserId } });
      await tx.userStat.upsert({
        where: { userId: viewedUserId },
        create: { userId: viewedUserId, profileViews: 1 },
        update: {
          profileViews: { increment: 1 },
          lastUpdated: new Date(),
        },
      });
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
      data: pickProfileFields(data),
    });
  }

  async updateProfileAndUser(
    userId: string,
    profileData: Record<string, any>,
    userData: Record<string, any> = {},
  ) {
    return prisma.$transaction(async (tx) => {
      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id: userId },
          data: userData,
        });
      }

      return tx.profile.update({
        where: { userId },
        data: pickProfileFields(profileData),
      });
    });
  }

  async deactivate(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }

  async delete(userId: string) {
    return prisma.user.delete({ where: { id: userId } });
  }
}
