import { Prisma } from "@prisma/client";
import { prisma } from "../../../prisma/prisma";

const postFieldNames = new Set(
  Prisma.dmmf.datamodel.models
    .find((model) => model.name === "Post")
    ?.fields.map((field) => field.name) ?? [],
);

const supportsAnonymousPosts = postFieldNames.has("isAnonymous");
const pickPostFields = (data: Record<string, any>) =>
  Object.fromEntries(
    Object.entries(data).filter(([key]) => postFieldNames.has(key)),
  );

export class PostsRepository {
  async create(data: {
    authorId: string;
    caption?: string;
    mediaUrls: string[];
    mediaTypes: any[];
    isPublic: boolean;
    isAnonymous: boolean;
  }) {
    const isAnonymous = Boolean(data.isAnonymous);
    const post = await prisma.post.create({
      data: pickPostFields(data) as any,
      include: {
        author: {
          include: { profile: { select: { username: true, avatarUrl: true } } },
        },
        _count: { select: { likes: true, comments: true } },
      },
    });

    if (isAnonymous && !supportsAnonymousPosts) {
      await prisma.$executeRaw`UPDATE "posts" SET "isAnonymous" = true WHERE "id" = ${post.id}`;
    }

    return { ...post, isAnonymous };
  }

  async findById(id: string) {
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          include: { profile: { select: { username: true, avatarUrl: true } } },
        },
        _count: { select: { likes: true, comments: true } },
      },
    });

    return post ? hydrateAnonymousFlag(post) : null;
  }

  async update(
    id: string,
    data: { caption?: string; isPublic?: boolean; isAnonymous?: boolean },
  ) {
    const isAnonymous = data.isAnonymous;
    const post = await prisma.post.update({
      where: { id },
      data: pickPostFields(data) as any,
    });

    if (typeof isAnonymous === "boolean" && !supportsAnonymousPosts) {
      await prisma.$executeRaw`UPDATE "posts" SET "isAnonymous" = ${isAnonymous} WHERE "id" = ${id}`;
    }

    return {
      ...post,
      ...(typeof isAnonymous === "boolean" ? { isAnonymous } : {}),
    };
  }

  async delete(id: string) {
    return prisma.post.delete({ where: { id } });
  }

  async addLike(postId: string, userId: string) {
    return prisma.postLike.upsert({
      where: { postId_userId: { postId, userId } },
      create: { postId, userId },
      update: {},
    });
  }

  async removeLike(postId: string, userId: string) {
    return prisma.postLike.deleteMany({ where: { postId, userId } });
  }

  async savePost(postId: string, userId: string, collectionId?: string) {
    // Note: Schema currently has PostSave model where userId and postId are unique
    return prisma.postSave.upsert({
      where: { userId_postId: { userId, postId } },
      create: { postId, userId },
      update: {},
    });
  }

  async unsavePost(postId: string, userId: string) {
    return prisma.postSave.deleteMany({ where: { postId, userId } });
  }

  async findByAuthorId(authorId: string, includeAnonymous = false) {
    const posts = await prisma.post.findMany({
      where: {
        authorId,
        isDeleted: false,
        ...(includeAnonymous || !supportsAnonymousPosts
          ? {}
          : { isAnonymous: false }),
      },
      include: {
        author: {
          include: { profile: { select: { username: true, avatarUrl: true } } },
        },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const hydratedPosts = await hydrateAnonymousFlags(posts);
    return includeAnonymous
      ? hydratedPosts
      : hydratedPosts.filter((post) => !post.isAnonymous);
  }

  async findSavedByUserId(userId: string) {
    const savedPosts = await prisma.postSave.findMany({
      where: { userId, post: { isDeleted: false } },
      include: {
        post: {
          include: {
            author: {
              include: {
                profile: { select: { username: true, avatarUrl: true } },
              },
            },
            _count: { select: { likes: true, comments: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return hydrateAnonymousFlags(savedPosts.map((savedPost) => savedPost.post));
  }
}

const hydrateAnonymousFlag = async <T extends { id: string }>(
  post: T,
): Promise<T & { isAnonymous: boolean }> => {
  if (supportsAnonymousPosts && "isAnonymous" in post) {
    return post as T & { isAnonymous: boolean };
  }

  const rows = await prisma.$queryRaw<{ id: string; isAnonymous: boolean }[]>`
    SELECT "id", "isAnonymous" FROM "posts" WHERE "id" = ${post.id}
  `;

  return { ...post, isAnonymous: Boolean(rows[0]?.isAnonymous) };
};

const hydrateAnonymousFlags = async <T extends { id: string }[]>(
  posts: T,
): Promise<Array<T[number] & { isAnonymous: boolean }>> => {
  if (posts.length === 0) return [];
  if (supportsAnonymousPosts && posts.every((post) => "isAnonymous" in post)) {
    return posts as Array<T[number] & { isAnonymous: boolean }>;
  }

  const ids = posts.map((post) => post.id);
  const rows = await prisma.$queryRaw<
    { id: string; isAnonymous: boolean }[]
  >`SELECT "id", "isAnonymous" FROM "posts" WHERE "id" IN (${Prisma.join(ids)})`;
  const byId = new Map(rows.map((row) => [row.id, row.isAnonymous]));

  return posts.map((post) => ({
    ...post,
    isAnonymous: Boolean(byId.get(post.id)),
  }));
};
