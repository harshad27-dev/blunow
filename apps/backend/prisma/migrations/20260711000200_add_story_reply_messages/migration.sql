ALTER TYPE "MessageType" ADD VALUE IF NOT EXISTS 'STORY_REPLY';

ALTER TABLE "messages" ADD COLUMN "storyId" TEXT;
ALTER TABLE "messages" ADD COLUMN "storyPreviewMediaUrl" TEXT;
ALTER TABLE "messages" ADD COLUMN "storyPreviewCaption" TEXT;
ALTER TABLE "messages" ADD COLUMN "storyAuthorId" TEXT;

CREATE INDEX "messages_storyId_idx" ON "messages"("storyId");
