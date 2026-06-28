ALTER TABLE "user_stats"
ADD COLUMN "profileViews" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "profile_views" (
  "id" TEXT NOT NULL,
  "viewerId" TEXT NOT NULL,
  "viewedUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "profile_views_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "profile_views_viewerId_viewedUserId_key"
ON "profile_views"("viewerId", "viewedUserId");

CREATE INDEX "profile_views_viewedUserId_createdAt_idx"
ON "profile_views"("viewedUserId", "createdAt");

ALTER TABLE "profile_views"
ADD CONSTRAINT "profile_views_viewerId_fkey"
FOREIGN KEY ("viewerId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "profile_views"
ADD CONSTRAINT "profile_views_viewedUserId_fkey"
FOREIGN KEY ("viewedUserId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
