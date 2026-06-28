CREATE TABLE "notification_preferences" (
  "userId" TEXT NOT NULL,
  "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
  "matches" BOOLEAN NOT NULL DEFAULT true,
  "messages" BOOLEAN NOT NULL DEFAULT true,
  "likes" BOOLEAN NOT NULL DEFAULT true,
  "comments" BOOLEAN NOT NULL DEFAULT true,
  "storyViews" BOOLEAN NOT NULL DEFAULT true,
  "confessions" BOOLEAN NOT NULL DEFAULT true,
  "roomInvites" BOOLEAN NOT NULL DEFAULT true,
  "system" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "user_privacy_preferences" (
  "userId" TEXT NOT NULL,
  "discoverable" BOOLEAN NOT NULL DEFAULT true,
  "showOnlineStatus" BOOLEAN NOT NULL DEFAULT true,
  "readReceipts" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_privacy_preferences_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "user_blocks" (
  "blockerId" TEXT NOT NULL,
  "blockedId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("blockerId", "blockedId")
);

CREATE INDEX "user_blocks_blockedId_idx" ON "user_blocks"("blockedId");

ALTER TABLE "notification_preferences"
ADD CONSTRAINT "notification_preferences_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_privacy_preferences"
ADD CONSTRAINT "user_privacy_preferences_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_blocks"
ADD CONSTRAINT "user_blocks_blockerId_fkey"
FOREIGN KEY ("blockerId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_blocks"
ADD CONSTRAINT "user_blocks_blockedId_fkey"
FOREIGN KEY ("blockedId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
