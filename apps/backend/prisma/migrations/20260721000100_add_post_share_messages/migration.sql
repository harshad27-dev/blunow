ALTER TYPE "MessageType" ADD VALUE IF NOT EXISTS 'POST';

ALTER TABLE "messages" ADD COLUMN "postId" TEXT;
ALTER TABLE "messages" ADD COLUMN "postPreviewMediaUrl" TEXT;
ALTER TABLE "messages" ADD COLUMN "postPreviewCaption" TEXT;
ALTER TABLE "messages" ADD COLUMN "postAuthorName" TEXT;

CREATE INDEX "messages_postId_idx" ON "messages"("postId");