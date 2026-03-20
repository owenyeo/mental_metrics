CREATE TABLE "ProviderProject" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "projectKey" TEXT NOT NULL,
  "environment" TEXT NOT NULL DEFAULT 'demo',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Identity" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "externalUserId" TEXT,
  "anonymousId" TEXT NOT NULL,
  "traits" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Identity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "sessionKey" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Event" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "sessionId" TEXT,
  "messageId" TEXT,
  "eventName" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "tier" TEXT,
  "interventionType" TEXT,
  "distressScore" INTEGER,
  "referralDestination" TEXT,
  "properties" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProviderProject_projectKey_key" ON "ProviderProject"("projectKey");
CREATE UNIQUE INDEX "Identity_projectId_anonymousId_key" ON "Identity"("projectId", "anonymousId");
CREATE INDEX "Identity_projectId_externalUserId_idx" ON "Identity"("projectId", "externalUserId");
CREATE UNIQUE INDEX "Session_projectId_sessionKey_key" ON "Session"("projectId", "sessionKey");
CREATE UNIQUE INDEX "Event_projectId_messageId_key" ON "Event"("projectId", "messageId");
CREATE INDEX "Event_projectId_occurredAt_idx" ON "Event"("projectId", "occurredAt");
CREATE INDEX "Event_projectId_eventName_occurredAt_idx" ON "Event"("projectId", "eventName", "occurredAt");
CREATE INDEX "Event_projectId_tier_occurredAt_idx" ON "Event"("projectId", "tier", "occurredAt");

ALTER TABLE "Identity" ADD CONSTRAINT "Identity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProviderProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProviderProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProviderProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;
