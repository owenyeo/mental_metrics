ALTER TABLE "Event" ADD COLUMN "userKey" TEXT;

UPDATE "Event"
SET "userKey" = COALESCE(
  (
    SELECT COALESCE("Identity"."externalUserId", "Identity"."anonymousId")
    FROM "Identity"
    WHERE "Identity"."id" = "Event"."identityId"
  ),
  'unknown_user'
);

ALTER TABLE "Event" ALTER COLUMN "userKey" SET NOT NULL;

CREATE INDEX "Event_projectId_userKey_occurredAt_idx"
ON "Event"("projectId", "userKey", "occurredAt");
