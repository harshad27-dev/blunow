import { prisma } from "../../../prisma/prisma";
import { AppError } from "../../../common/middleware/error.middleware";

export type PrivacySettings = {
  isPrivate?: boolean;
  discoverable?: boolean;
  showOnlineStatus?: boolean;
  readReceipts?: boolean;
};

export class UserSettingsService {
  async getPrivacy(userId: string) {
    const [profile, preference] = await Promise.all([
      prisma.profile.findUnique({
        where: { userId },
        select: { isPrivate: true },
      }),
      prisma.userPrivacyPreference.upsert({
        where: { userId },
        create: { userId },
        update: {},
      }),
    ]);

    return {
      isPrivate: Boolean(profile?.isPrivate),
      discoverable: preference.discoverable,
      showOnlineStatus: preference.showOnlineStatus,
      readReceipts: preference.readReceipts,
    };
  }

  async updatePrivacy(userId: string, data: PrivacySettings) {
    const {
      isPrivate,
      discoverable,
      showOnlineStatus,
      readReceipts,
    } = data;

    await prisma.$transaction([
      ...(typeof isPrivate === "boolean"
        ? [
            prisma.profile.update({
              where: { userId },
              data: { isPrivate },
            }),
          ]
        : []),
      prisma.userPrivacyPreference.upsert({
        where: { userId },
        create: {
          userId,
          ...(typeof discoverable === "boolean" ? { discoverable } : {}),
          ...(typeof showOnlineStatus === "boolean"
            ? { showOnlineStatus }
            : {}),
          ...(typeof readReceipts === "boolean" ? { readReceipts } : {}),
        },
        update: {
          ...(typeof discoverable === "boolean" ? { discoverable } : {}),
          ...(typeof showOnlineStatus === "boolean"
            ? { showOnlineStatus }
            : {}),
          ...(typeof readReceipts === "boolean" ? { readReceipts } : {}),
        },
      }),
    ]);

    return this.getPrivacy(userId);
  }

  async getBlockedUsers(userId: string) {
    const blocks = await prisma.userBlock.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: {
            id: true,
            profile: {
              select: { username: true, avatarUrl: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return blocks.map(({ blocked, createdAt }) => ({
      id: blocked.id,
      username: blocked.profile?.username || "Datebl user",
      avatarUrl: blocked.profile?.avatarUrl,
      blockedAt: createdAt,
    }));
  }

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new AppError("You cannot block yourself", 400);
    }

    const target = await prisma.user.findUnique({
      where: { id: blockedId },
      select: { id: true },
    });
    if (!target) throw new AppError("User not found", 404);

    await prisma.$transaction([
      prisma.userBlock.upsert({
        where: { blockerId_blockedId: { blockerId, blockedId } },
        create: { blockerId, blockedId },
        update: {},
      }),
      prisma.userFollow.deleteMany({
        where: {
          OR: [
            { followerId: blockerId, followingId: blockedId },
            { followerId: blockedId, followingId: blockerId },
          ],
        },
      }),
      prisma.matchRequest.deleteMany({
        where: {
          OR: [
            { senderId: blockerId, receiverId: blockedId },
            { senderId: blockedId, receiverId: blockerId },
          ],
        },
      }),
      prisma.match.deleteMany({
        where: {
          OR: [
            { user1Id: blockerId, user2Id: blockedId },
            { user1Id: blockedId, user2Id: blockerId },
          ],
        },
      }),
    ]);
  }

  async unblockUser(blockerId: string, blockedId: string) {
    await prisma.userBlock.deleteMany({ where: { blockerId, blockedId } });
  }
}
