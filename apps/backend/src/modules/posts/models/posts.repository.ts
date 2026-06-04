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
let anonymousColumnName: string | null | undefined;

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
      await updateAnonymousFlag(post.id, true);
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
      await updateAnonymousFlag(id, isAnonymous);
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

  const columnName = await getAnonymousColumnName();
  if (!columnName) return { ...post, isAnonymous: false };

  const rows = await prisma.$queryRawUnsafe<
    { id: string; isAnonymous: boolean }[]
  >(
    `SELECT "id", "${columnName}" AS "isAnonymous" FROM "posts" WHERE "id" = $1`,
    post.id,
  );

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
  const columnName = await getAnonymousColumnName();
  if (!columnName) {
    return posts.map((post) => ({ ...post, isAnonymous: false }));
  }

  const rows = await prisma.$queryRawUnsafe<
    { id: string; isAnonymous: boolean }[]
  >(
    `SELECT "id", "${columnName}" AS "isAnonymous" FROM "posts" WHERE "id" IN (${ids
      .map((_, index) => `$${index + 1}`)
      .join(", ")})`,
    ...ids,
  );
  const byId = new Map(rows.map((row) => [row.id, row.isAnonymous]));

  return posts.map((post) => ({
    ...post,
    isAnonymous: Boolean(byId.get(post.id)),
  }));
};

const getAnonymousColumnName = async () => {
  if (anonymousColumnName !== undefined) return anonymousColumnName;

  const rows = await prisma.$queryRaw<
    { column_name: string }[]
  >`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'posts'
      AND column_name IN ('isAnonymous', 'is_anonymous')
    LIMIT 1
  `;

  anonymousColumnName = rows[0]?.column_name ?? null;
  return anonymousColumnName;
};

const updateAnonymousFlag = async (postId: string, isAnonymous: boolean) => {
  const columnName = await getAnonymousColumnName();
  if (!columnName) return;

  await prisma.$executeRawUnsafe(
    `UPDATE "posts" SET "${columnName}" = $1 WHERE "id" = $2`,
    isAnonymous,
    postId,
  );
};
