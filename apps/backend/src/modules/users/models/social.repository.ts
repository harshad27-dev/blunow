import { prisma } from '../../../prisma/prisma';

export class SocialRepository {
  async getStats(userId: string) {
    const [
      followerCount,
      followingCount,
      postsCount,
      matchCount,
      storiesCount,
      likesReceived,
      conversationsCount,
      savedPostsCount,
    ] = await prisma.$transaction([
      prisma.userFollow.count({ where: { followingId: userId } }),
      prisma.userFollow.count({ where: { followerId: userId } }),
      prisma.post.count({ where: { authorId: userId, isDeleted: false } }),
      prisma.match.count({
        where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      }),
      prisma.story.count({
        where: {
          authorId: userId,
          isDeleted: false,
          expiresAt: { gt: new Date() },
        },
      }),
      prisma.postLike.count({
        where: { post: { authorId: userId, isDeleted: false } },
      }),
      prisma.chat.count({
        where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      }),
      prisma.postSave.count({ where: { userId } }),
    ]);

    const stats = await prisma.userStat.upsert({
      where: { userId },
      create: {
        userId,
        followerCount,
        followingCount,
        postsCount,
        matchCount,
        storiesCount,
        lastUpdated: new Date(),
      },
      update: {
        followerCount,
        followingCount,
        postsCount,
        matchCount,
        storiesCount,
        lastUpdated: new Date(),
      },
    });

    return {
      ...stats,
      likesReceived,
      conversationsCount,
      savedPostsCount,
      profileViews: stats.profileViews,
    };
  }

  async verifyProfile(userId: string, idPhotoUrl: string, faceVideoUrl: string) {
    return prisma.userVerification.upsert({
      where: { userId },
      create: {
        userId,
        idDocumentUrl: idPhotoUrl,
        selfieUrl: faceVideoUrl,
        status: 'PENDING'
      },
      update: {
        idDocumentUrl: idPhotoUrl,
        selfieUrl: faceVideoUrl,
        status: 'PENDING',
        submittedAt: new Date(),
        verifiedAt: null,
        rejectionReason: null,
      },
    });
  }

  async getVerification(userId: string) {
    return prisma.userVerification.findUnique({ where: { userId } });
  }

  async followUser(followerId: string, followingId: string) {
    try {
      const follow = await prisma.userFollow.create({
        data: { followerId, followingId }
      });
      // Increment stats conceptually
      await prisma.userStat.updateMany({
        where: { userId: followingId },
        data: { followerCount: { increment: 1 } }
      });
      await prisma.userStat.updateMany({
        where: { userId: followerId },
        data: { followingCount: { increment: 1 } }
      });
      return follow;
    } catch (e: any) {
      if (e.code === 'P2002') throw new Error('Already following');
      throw e;
    }
  }

  async unfollowUser(followerId: string, followingId: string) {
    const res = await prisma.userFollow.deleteMany({
      where: { followerId, followingId }
    });
    if (res.count > 0) {
      await prisma.userStat.updateMany({
        where: { userId: followingId },
        data: { followerCount: { decrement: 1 } }
      });
      await prisma.userStat.updateMany({
        where: { userId: followerId },
        data: { followingCount: { decrement: 1 } }
      });
    }
    return res;
  }

  async getFollowers(userId: string, limit: number, offset: number) {
    const follows = await prisma.userFollow.findMany({
      where: { followingId: userId },
      include: { follower: { include: { profile: { select: { username: true, avatarUrl: true } } } } },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    });
    const total = await prisma.userFollow.count({ where: { followingId: userId } });
    return { followers: follows.map(f => ({ userId: f.followerId, username: f.follower.profile?.username, avatarUrl: f.follower.profile?.avatarUrl, followedAt: f.createdAt })), total };
  }

  async getFollowing(userId: string, limit: number, offset: number) {
    const follows = await prisma.userFollow.findMany({
      where: { followerId: userId },
      include: { following: { include: { profile: { select: { username: true, avatarUrl: true } } } } },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    });
    const total = await prisma.userFollow.count({ where: { followerId: userId } });
    return { following: follows.map(f => ({ userId: f.followingId, username: f.following.profile?.username, avatarUrl: f.following.profile?.avatarUrl, followedAt: f.createdAt })), total };
  }
}
