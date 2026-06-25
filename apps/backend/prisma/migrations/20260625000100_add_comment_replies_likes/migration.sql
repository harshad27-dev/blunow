-- Add threaded replies and lightweight reactions for post comments.
ALTER TABLE "comments" ADD COLUMN "parentId" TEXT;

CREATE TABLE "comment_likes" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "comment_likes_commentId_userId_key" ON "comment_likes"("commentId", "userId");

ALTER TABLE "comments" ADD CONSTRAINT "comments_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_commentId_fkey"
    FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
