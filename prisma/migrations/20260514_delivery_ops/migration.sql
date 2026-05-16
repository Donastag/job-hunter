-- Phase 4-6: Delivery, Ops, Intelligence
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "projectNotes" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "templateUsed" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "jobId" TEXT;
