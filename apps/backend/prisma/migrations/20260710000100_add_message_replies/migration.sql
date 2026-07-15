ALTER TABLE "messages" ADD COLUMN "replyToMessageId" TEXT;

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_replyToMessageId_fkey"
  FOREIGN KEY ("replyToMessageId") REFERENCES "messages"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "messages_replyToMessageId_idx" ON "messages"("replyToMessageId");
