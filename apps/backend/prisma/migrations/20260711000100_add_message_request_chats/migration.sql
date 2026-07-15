CREATE TYPE "ChatStatus" AS ENUM ('REQUESTED', 'ACTIVE', 'REJECTED');

ALTER TABLE "chats" ADD COLUMN "requestId" TEXT;
ALTER TABLE "chats" ADD COLUMN "requestedById" TEXT;
ALTER TABLE "chats" ADD COLUMN "status" "ChatStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "chats" ALTER COLUMN "matchId" DROP NOT NULL;

CREATE UNIQUE INDEX "chats_requestId_key" ON "chats"("requestId");
CREATE INDEX "chats_status_requestedById_idx" ON "chats"("status", "requestedById");

ALTER TABLE "chats"
  ADD CONSTRAINT "chats_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "match_requests"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
