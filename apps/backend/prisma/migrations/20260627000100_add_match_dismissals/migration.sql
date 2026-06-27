CREATE TABLE "match_dismissals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dismissedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_dismissals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "match_dismissals_userId_dismissedUserId_key" ON "match_dismissals"("userId", "dismissedUserId");
CREATE INDEX "match_dismissals_userId_createdAt_idx" ON "match_dismissals"("userId", "createdAt");

ALTER TABLE "match_dismissals" ADD CONSTRAINT "match_dismissals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "match_dismissals" ADD CONSTRAINT "match_dismissals_dismissedUserId_fkey" FOREIGN KEY ("dismissedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
