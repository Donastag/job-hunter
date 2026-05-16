CREATE TABLE IF NOT EXISTS "chat_sessions" (
  "id"           TEXT NOT NULL PRIMARY KEY,
  "appName"      TEXT NOT NULL,
  "visitorName"  TEXT,
  "visitorEmail" TEXT,
  "status"       TEXT NOT NULL DEFAULT 'open',
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "sender"    TEXT NOT NULL,
  "message"   TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_messages_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "chat_sessions"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "chat_messages_sessionId_idx" ON "chat_messages"("sessionId");
CREATE INDEX IF NOT EXISTS "chat_sessions_status_idx"    ON "chat_sessions"("status");
