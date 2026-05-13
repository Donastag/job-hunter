CREATE TABLE "knowledge_entries" (
    "id"        TEXT NOT NULL,
    "title"     TEXT NOT NULL,
    "category"  TEXT NOT NULL DEFAULT 'general',
    "tags"      TEXT NOT NULL DEFAULT '',
    "content"   TEXT NOT NULL,
    "source"    TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "knowledge_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "portfolio_items" (
    "id"          TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "client"      TEXT,
    "techStack"   TEXT NOT NULL DEFAULT '',
    "outcome"     TEXT,
    "revenue"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "testimonial" TEXT,
    "url"         TEXT,
    "status"      TEXT NOT NULL DEFAULT 'active',
    "completedAt" TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "portfolio_items_pkey" PRIMARY KEY ("id")
);
