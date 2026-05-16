# Job Hunter — Progress Log

## 2026-05-05 — Session 1 (Scraper Build)

### Done
- Replaced all mock scrapers with real implementations
- **RemoteOK** — open JSON API, filters by relevant tags (python, node, ai, automation...)
- **Remotive** — open JSON API, 3 categories (software-dev, devops, data)
- **WeWorkRemotely** — RSS feeds (programming + back-end + devops categories)
- **Upwork** — tried cookie-based auth, Playwright stealth, 6 different approaches — all blocked by Cloudflare + RSS 410 permanently. **DISABLED. Re-enable via Apify actor after VPS is up.**
- Rewrote `lib/platforms/manager.ts` — 3 platforms, `Promise.allSettled` so one failure doesn't kill the rest
- Created `POST /api/jobs/run` — triggers full pipeline: scrape → score → deduplicate → save → Telegram alert
- Deduplication working: second run returns 0 new jobs (externalId check)
- TypeScript: 0 errors
- DB: SQLite `dev.db` in sync with Prisma schema
- First run: **119 real jobs** saved (23 RemoteOK + 17 Remotive + 79 WeWorkRemotely)
- Scoring working — jobs tiered as priority/alert/normal

---

## 2026-05-05 — Session 2 (AI + Scheduling)

### Done
- **Agent 2 (Closer)** — `lib/proposals.ts` — generates targeted 150-200 word Upwork proposals
  - Uses OpenRouter (free tier). Model: `openai/gpt-oss-120b:free` (DeepSeek free tier removed by OpenRouter)
  - PERSONA: Donastag, AI automation engineer, Nairobi
  - Falls back to `gpt-3.5-turbo` if OPENAI_API_KEY is set instead
- **Proposal quality verified** — tested live: clean, specific, no fluff, proper CTA
- **Auto-scheduling** — `lib/cron.ts` + `instrumentation.ts` — node-cron fires `runPipeline()` every 30 mins on server boot
  - Confirmed: `[Cron] Pipeline scheduled every 30 minutes` in server logs
- **Pipeline wired end-to-end** — `lib/pipeline.ts` — scrape → score → save → generate proposals → Telegram alerts
  - Up to 3 priority jobs get individual messages with draft proposal included
  - Jobs 4+ get a summary message
- **Pipeline confirmed working**: fresh run → 117 new jobs, 8 priority, 6969ms

### Blocked
- **Telegram**: bot token `AAF-BfbaLsQ3e2M7mPpQqUNKZpEsPWrDWzo` is **invalid** — returns 404 from Telegram API
  - Action needed: message @BotFather → `/newbot` → get real token (format: `1234567890:ABCDefghijklmnopqrstuvwxyz`)
  - Then get chat ID: start bot, message @userinfobot → update `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `.env.local`

### Stack
- Next.js 16.1.6 + Prisma 5.22.0 (SQLite dev.db)
- NextAuth v4 (GitHub + Google OAuth)
- Scrapers: rss-parser + fetch (RemoteOK, Remotive, WeWorkRemotely)
- Scoring: weighted algorithm in `lib/scoring.ts`
- Proposals: OpenRouter `openai/gpt-oss-120b:free` via `lib/proposals.ts`
- Scheduling: node-cron via `instrumentation.ts` → `lib/cron.ts`
- Dev server: `http://localhost:3000`

### Key Files
- `lib/platforms/remoteok.ts` — RemoteOK JSON API
- `lib/platforms/remotive.ts` — Remotive JSON API
- `lib/platforms/weworkremotely.ts` — WeWorkRemotely RSS
- `lib/platforms/manager.ts` — orchestrates all platforms + deduplication + scoring
- `lib/pipeline.ts` — core pipeline: fetch → save → proposals → Telegram
- `lib/proposals.ts` — Agent 2 (Closer) — proposal generation
- `lib/cron.ts` — node-cron scheduler
- `instrumentation.ts` — Next.js server boot hook
- `app/api/jobs/run/route.ts` — manual pipeline trigger endpoint
- `lib/scoring.ts` — job scoring algorithm

### Next Steps (Priority Order)
1. **Fix Telegram bot** — @BotFather → /newbot → real token → update .env.local. Run `node scripts/test-telegram.mjs` to verify.
2. **VPS (Contabo)** — deploy. Coolify + Docker.
3. **Apify Upwork scraper** — add after VPS is running (paid tier or trial)
4. **Command Centre Phase 2** — Finance + Clients modules

---

## 2026-05-10 — Session 3 (Command Centre Dashboard)

### Done
- **Command Centre Dashboard — Phase 1** built at `command-centre/`
  - Stack: Express + EJS + Tailwind CDN + better-sqlite3 → port 4200
  - **Hunt module** (`/`) — real-time job feed from SQLite (118 jobs loaded)
    - Stats bar: total jobs, today's count, priority count, applied count
    - Filter tabs: all / priority / alert / applied / new (server-side)
    - Score badges (colour-coded: green ≥85, blue ≥75, slate ≥60)
    - Tier badges (PRIORITY, ALERT)
    - Expandable rows → AI brief + client info + job URL
    - RUN HUNT button → proxies POST to Next.js :3000 `/api/jobs/run`
    - APPLY / SKIP actions → write back to SQLite immediately
  - **Pipeline module** (`/pipeline`) — full Kanban board
    - 5 columns: Contacted → Engaged → Call Booked → Negotiating → Won
    - Real Lead data from SQLite, per-column value totals
    - Move lead between stages via select dropdown → PUT /api/leads/:id/stage
    - Add Lead modal form → POST /api/leads
  - API routes: `/api/run-hunt`, `/api/leads/:id/stage`, `/api/leads`, `/api/jobs/:id/apply`, `/api/jobs/:id/archive`
- **Telegram test script** at `scripts/test-telegram.mjs`
  - Validates token format, calls getMe, sends test message
  - Confirms current token `AAF-BfbaLsQ3e2M7mPpQqUNKZpEsPWrDWzo` is **invalid** (404)

### Start Command Centre
```bash
cd command-centre && npm start
# → http://localhost:4200
```

### Fix Telegram (action required)
```
1. Open Telegram → message @BotFather
2. Send: /newbot
3. Name: Nexara Job Hunter
4. Username: nexara_jh_bot (or any available)
5. Copy the token (format: 1234567890:ABCDefgh...)
6. Update .env.local: TELEGRAM_BOT_TOKEN="<new_token>"
7. Verify: node scripts/test-telegram.mjs
```

### Next Steps
1. **Fix Telegram** — see above
2. **VPS deploy** — Coolify + Docker, both apps (Next.js :3000 + Command Centre :4200)
3. **Command Centre Phase 2** — Finance + Clients modules
4. **Apify Upwork** — after VPS running

---

## 2026-05-13 — Session 4 (Telegram Fix + Command Centre Phase 2 + VPS Deploy)

### Done

#### Telegram Fixed
- New bot token: `8946685736:AAEXXtKcUGXAOTgTjJlZVX5bkUY0Zp4DK6E`
- Correct chat ID: `7636801682` (found via getUpdates after user messaged bot)
- `lib/telegram.ts` — full class with all notification methods committed

#### Telegram Bot Commands (two-way)
- Built `lib/telegram-bot-commands.ts` — long-polling bot
- Commands: `/help` `/stats` `/jobs` `/pipeline` `/finance` `/hunt`
- Wired via `instrumentation.ts` → starts on server boot alongside cron

#### Command Centre Phase 2
- **Finance module** (`/finance`) — invoice list, create, update status, totals by status
- **Clients module** (`/clients`) — client directory, add/edit, link to invoices
- Both modules use `invoices` and `clients` PostgreSQL tables (Prisma `@@map`)

#### Database Migrated: SQLite → PostgreSQL
- Prisma schema updated to PostgreSQL datasource
- Added `Invoice` model (`@@map("invoices")`) and `Client` model (`@@map("clients")`)
- Single migration: `prisma/migrations/20260513_init/migration.sql`
- Old SQLite migrations removed from repo

#### Docker + Traefik + VPS Deploy
- Multi-stage Dockerfile: builder → runner, Prisma 5.22.0 baked in
- docker-compose.yml: Traefik + PostgreSQL + Job Hunter + Command Centre
- Command Centre bound to Tailscale IP only (100.119.35.90:4200)
- Deployed to Contabo VPS 194.163.161.220

### All Containers Running ✅
```
nexara-traefik          Up   (reverse proxy :80/:443)
nexara-postgres         Up   (healthy, :5432 internal)
nexara-job-hunter       Up   (http://194.163.161.220)
nexara-command-centre   Up   (http://100.119.35.90:4200 — Tailscale)
```

### Deployment Gotchas
1. `DATABASE_URL` must be explicit — password `Nx2026!vps#secure` has `#` (→ `%23`)
   - Set in `/opt/nexara/.env.production`: `DATABASE_URL=postgresql://nexara:Nx2026!vps%23secure@postgres:5432/nexara`
   - docker-compose.yml uses `DATABASE_URL: ${DATABASE_URL}` (not inline construction)
2. Old SQLite migrations caused `P3009` on fresh PostgreSQL — deleted from repo
3. Prisma CLI installed via `npm install prisma@5.22.0` in Dockerfile runner (not npx)

### Verified ✅
- Job Hunter live at http://194.163.161.220 (50 jobs in dashboard)
- Pipeline/cron running — manual run confirmed, dedup working
- Telegram bot @Nexarahunterbot online — sendMessage confirmed
- OpenRouter API key loaded (AI proposals enabled)

### Next Steps
- [ ] Test Telegram bot commands from phone (/stats, /hunt, /jobs)
- [ ] Verify Command Centre at http://100.119.35.90:4200 (Tailscale)
- [ ] Add Google OAuth credentials (GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET)
- [ ] Get domain → Nginx/Caddy for HTTPS
- [ ] Apify Upwork scraper
- [ ] Command Centre Phase 3: Knowledge + Portfolio modules

---

## 2026-05-14 — Session 5 (Command Centre Phase 3 + Coolify)

### Done

#### Command Centre Phase 3
- **Knowledge module** (`/knowledge`) — categorised learnings (proposal/platform/tech/client/general)
  - Full CRUD: add, edit, delete entries
  - Filter tabs by category, tag support, source tracking
  - DB table: `knowledge_entries` (created directly via psql — not in Prisma image)
- **Portfolio module** (`/portfolio`) — completed projects showcase
  - Fields: title, client, tech stack, outcome, revenue, testimonial, URL, completed date
  - Status: active / archived
  - Stats bar: total projects, total revenue, avg deal value
  - DB table: `portfolio_items` (created directly via psql)
- Nav updated with KNOWLEDGE + PORTFOLIO links
- Migration file: `prisma/migrations/20260514_knowledge_portfolio/migration.sql`

> **Note on future rebuilds:** The `knowledge_entries` and `portfolio_items` tables were applied
> directly via psql (not through a Docker image rebuild). The migration SQL is in the repo —
> next time job-hunter image is rebuilt, `prisma migrate deploy` will try to apply it.
> Since we manually registered it in `_prisma_migrations`, it will be skipped cleanly.

#### Coolify Installed
- **URL:** `http://194.163.161.220:8000`
- **Version:** 4.0.0 (latest)
- **Installed at:** `/data/coolify/`
- **Config/env:** `/data/coolify/source/.env`
- No port conflict — job-hunter stays on :80, Coolify UI on :8000
- Coolify's Traefik proxy not yet activated (waiting for domain)

#### Deployment Strategy (for future reference)
- **Safe deploy flow:** push to `main` → SSH to VPS → `git pull && docker compose build && up -d`
- **Never edit files directly on VPS** — causes git drift (learned the hard way with docker-compose.yml)
- **Coolify auto-deploy (future):** connect GitHub repo → push to main → Coolify builds + deploys automatically
- **When domain arrives:**
  1. Point DNS A record to 194.163.161.220
  2. Enable Coolify's Traefik proxy (Settings → Proxy)
  3. Remove `ports: "80:3000"` from job-hunter docker-compose
  4. Add domain in Coolify → auto HTTPS via Let's Encrypt
  5. Command Centre gets a subdomain too (e.g. cc.yourdomain.com)

#### Upwork Scraping (for future reference)
- Direct scraping blocked by Cloudflare — all approaches fail
- **Best option: Apify** (cloud scraper platform)
  - Has maintained Upwork actor, handles Cloudflare automatically
  - REST API call — fits existing `lib/platforms/` pattern
  - Free tier: $5 credits/mo (good for testing)
  - Starter: $49/mo (~8–12 runs/day viable)
  - Run Upwork scrape every 2–3 hours (not 30 min) to keep costs low
  - Integration: add `APIFY_TOKEN` + `APIFY_UPWORK_ACTOR_ID` to .env, write `lib/platforms/upwork.ts`

#### n8n / OpenClaw / VPS upgrade notes
- **n8n:** Not needed — OpenClaw is code-based (cron + OpenRouter API). Skip it.
- **OpenClaw runs on Mac** — not VPS. VPS = always-on services only (scraping, cron, Telegram bot). Mac = Claude Code agent sessions for proposals, builds, delivery.
- **VPS upgrade:** Not needed yet. 7.8GB total, only ~1GB used. Plenty of headroom for Coolify + future services.

### Current Stack on VPS
```
coolify            Up  :8000  (management UI)
nexara-job-hunter  Up  :80    (http://194.163.161.220)
nexara-command-centre Up :4200 (Tailscale only)
nexara-postgres    Up  internal (healthy)
coolify-db         Up  internal (Coolify's own PostgreSQL)
coolify-redis      Up  internal
```

### Next Steps
- [x] Open http://194.163.161.220:8000 → create Coolify admin account
- [x] Connect GitHub repo in Coolify (Donastag/job-hunter)
- [x] Import nexara docker-compose stack into Coolify management
- [x] All production env vars added in Coolify (DATABASE_URL, NEXTAUTH_*, TELEGRAM_*, OPENROUTER_API_KEY, POSTGRES_PASSWORD, TAILSCALE_IP)
- [x] **Telegram bot commands verified working** (/stats, /hunt, /jobs confirmed from phone)
- [ ] Add Google OAuth credentials to VPS .env.production + Coolify env vars
- [ ] Get domain → enable Coolify Traefik → HTTPS for everything
- [ ] Apify Upwork scraper integration
- [x] Push-to-deploy webhook: GitHub hook ID 623113601 → Coolify /webhooks/source/github/events/manual

### Coolify Resource
- URL: http://194.163.161.220:8000
- Project: Nexara
- Resource: job-hunter:main-hj0yfuj73h9jrc3w5wftmzva
- Compose file: /docker-compose.yml (branch: main)
- Login: danstedstagy@gmail.com / Nx2026!coolify

---

## 2026-05-14 — Session 6 (Coolify Wired + Auto-Deploy Live)

### Done

#### Coolify Fully Configured
- Compose file location fixed: `/docker-compose.yml` (was defaulting to `.yaml`)
- Compose file loaded — Coolify parsed both services (`job-hunter`, `command-centre`)
- All production env vars saved in Coolify UI:
  - `POSTGRES_DB/USER/PASSWORD`, `DATABASE_URL` (with `%23` encoded `#`)
  - `NEXTAUTH_URL=http://194.163.161.220`, `NEXTAUTH_SECRET`
  - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
  - `OPENROUTER_API_KEY`, `PIPELINE_CRON=*/30 * * * *`
  - `TAILSCALE_IP=100.119.35.90`

#### Push-to-Deploy Webhook Live
- GitHub hook ID: `623113601`
- Trigger: push to `main` branch
- Coolify endpoint: `http://194.163.161.220:8000/webhooks/source/github/events/manual`
- Secret: `fqpOg4HN49hD0DcnxrBriyL2LxLPvsQy003OBBHX`
- **Flow:** push to `main` → GitHub fires webhook → Coolify builds + `docker compose up -d` on VPS

#### Verified Working
- **Telegram bot commands** confirmed from phone (`/stats`, `/hunt`, `/jobs`) ✅
- **Job Hunter** live at http://194.163.161.220 ✅
- **Coolify UI** at http://194.163.161.220:8000 ✅

### Deploy Flow Going Forward
```
1. Make changes locally → test
2. git push origin main
3. GitHub → Coolify webhook fires automatically
4. Coolify pulls repo, builds, docker compose up -d
5. Check http://194.163.161.220 to confirm
```
- DB data safe — lives in `postgres-data` Docker volume, survives rebuilds
- First Coolify-triggered deploy will replace manually-started containers (safe, same names)

### Remaining (non-blocking)
- [ ] Google OAuth — add `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` to VPS `.env.production` and Coolify env vars when ready
- [ ] Domain — point A record to 194.163.161.220 → enable Coolify Traefik → HTTPS auto via Let's Encrypt
- [ ] Apify Upwork scraper — `lib/platforms/upwork.ts`, add `APIFY_TOKEN` + `APIFY_UPWORK_ACTOR_ID` to env

---

## 2026-05-14 — Session 7 (Better Auth Migration)

### Done

#### Migrated: next-auth v4 → better-auth v1.6.11
- `lib/auth.ts` — rewrote with `betterAuth()` + `prismaAdapter` + Google OAuth `socialProviders`
- `lib/auth-client.ts` — new file, `createAuthClient()` for client-side `useSession` / `signIn.social` / `signOut`
- `app/api/auth/[...all]/route.ts` — new route using `toNextJsHandler(auth)` (replaces `[...nextauth]`)
- Deleted `app/api/auth/[...nextauth]/route.ts`
- All pages/components updated to import from `@/lib/auth-client`
- `prisma/schema.prisma` — auth models rewritten for Better Auth:
  - `User.emailVerified`: `DateTime?` → `Boolean`
  - `Session`: new fields `token`, `expiresAt`, `ipAddress`, `userAgent`
  - `Account`: completely restructured (`accountId`, `providerId`, `accessToken`, etc.)
  - `VerificationToken` → `Verification` (new fields)
- `prisma/migrations/20260514_better_auth/migration.sql` — SQL to drop old NextAuth tables and recreate with Better Auth schema
- `.env.local` — replaced `NEXTAUTH_*` with `BETTER_AUTH_URL` + `BETTER_AUTH_SECRET`, added `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`
- `.env.example` — updated auth section for Better Auth
- TypeScript: 0 errors ✅
- Prisma client regenerated ✅
- Committed: `ac03b6c`

#### Switched to Better Auth email/password (no Google OAuth)
- `lib/auth.ts` — removed `socialProviders`, enabled `emailAndPassword: { enabled: true }`
- `app/auth/signin/page.tsx` — rewritten: email + password form
- `app/auth/signup/page.tsx` — new registration page
- `app/page.tsx` — Sign In + Create Account buttons (no Google)
- Removed `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` from all env files
- Committed: `3f9d1e8`

#### Port changed: 80 → 3000
- Coolify activated its Traefik proxy (`coolify-proxy`) which claimed port 80
- `docker-compose.yml` — changed `"80:3000"` → `"3000:3000"`, swapped `NEXTAUTH_*` → `BETTER_AUTH_*`
- `BETTER_AUTH_URL` in Coolify updated to `http://194.163.161.220:3000`
- Committed: `455da7d`, pushed, redeployed via Coolify
- Old manually-started containers (`nexara-job-hunter`, `nexara-postgres`, `nexara-command-centre`) removed

### Current Stack on VPS
```
coolify-proxy        Up  :80/:443/:8080  (Traefik — for future domain/HTTPS)
coolify              Up  :8000           (management UI)
job-hunter           Up  :3000           → http://194.163.161.220:3000
command-centre       Up  :4200           (Tailscale only)
postgres             Up  internal        (healthy)
```

### Access URLs
- **Job Hunter:** http://194.163.161.220:3000
- **Coolify UI:** http://194.163.161.220:8000
- **Command Centre:** http://100.119.35.90:4200 (Tailscale only)

### Done This Session
- [x] Account created: danstedstagy@gmail.com / Nx2026!jobs
- [x] Auth middleware — unauthenticated users redirected to /auth/signin
- [x] Idle timeout — 30 min inactivity → auto sign-out + 60s amber warning banner
- [x] Input text colour fix — text-gray-900 bg-white on all auth form inputs
- [x] Security validator fixed — NEXTAUTH_* → BETTER_AUTH_*

### Non-blocking Remaining
- [ ] Domain — point A record to VPS → configure Traefik labels → HTTPS auto
- [ ] Apify Upwork scraper — `lib/platforms/upwork.ts`, add `APIFY_TOKEN` + `APIFY_UPWORK_ACTOR_ID`

---

---

## 2026-05-14 — Session 8 (Agent Pipeline Phase 1-3) ✅

### Done

#### Phase 1 — Proposal Flow ✅
- `lib/analytics.ts` — upsert helper for daily Analytics row
- `app/api/jobs/[id]/route.ts` — PATCH status with side effects (proposals++/responses++/won side effects)
- `components/proposal-modal.tsx` — dark-theme rewrite, inline editable textarea, **MARK APPLIED** button
- Dashboard optimistic update when job marked applied

#### Phase 2 — Reply & Lead Conversion ✅
- `/replied [job_id]` Telegram command — marks job replied, auto-creates Lead at "engaged"
- **Awaiting Reply** section in dashboard feed — shows applied jobs, one-click "REPLIED ✓" button
- Analytics.responses++ on reply

#### Phase 3 — Win → Invoice → Analytics ✅
- `/won [job_id] [amount]` — marks won, creates Invoice draft, logs wins/revenue to Analytics
- `/lost [job_id]` — marks lost
- `app/api/analytics/route.ts` — rolling 30-day real data
- Analytics tab wired to live DB data (proposals/responses/wins/revenue/rates)

#### Also built
- `/apply [job_id]` Telegram command — mark applied from phone
- `app/api/jobs/route.ts` — `?take=N` param, computed `timeAgo` field

### Full Loop — Closed ✅
```
Scrape → Score → OPEN PROPOSAL → edit → MARK APPLIED
                                              ↓
                                    REPLIED ✓ (UI) or /replied (Telegram)
                                          → Lead at Engaged
                                              ↓
                                    /won job_id 5000
                                          → Invoice draft
                                          → Analytics updated
```

---

## 2026-05-16 — Session 9 (Phase 4-6: Delivery, Ops, Intelligence)

### Done

#### Phase 4 — Delivery (Agent 3) ✅
- `lib/project-brief.ts` — AI project kickoff brief via OpenRouter on job win
- Jobs PATCH: on 'won' → brief generated async → saved to `projectNotes`, invoice linked via `jobId`
- Dashboard **Projects tab** — won jobs with AI brief, platform win rates, top skills
- Command Centre **/projects** — active projects, MARK DELIVERED, AI brief, invoice ops
- Schema: `Job.projectNotes`, `Job.templateUsed`

#### Phase 5 — Invoice Ops ✅
- `app/api/invoices/[id]` — PATCH; on 'paid' → auto-creates PortfolioItem
- Telegram: `/invoiced` (mark sent), `/paid` (paid + auto-portfolio), `/overdue` (7d+ unpaid list)
- Command Centre: SEND/PAID buttons, overdue alert panel
- Schema: `Invoice.jobId`

#### Phase 6 — Intelligence ✅
- `app/api/insights` — platform win rates, top skills, monthly revenue
- Telegram: `/insights` — win rate, revenue, avg deal, best platform, top skill
- Dashboard analytics tab: all real data, no hardcoded values

### Full Stack Now Live
```
Hunt → Score → Proposal → APPLIED → REPLIED → WON
  → AI brief generated → Invoice linked
  → Lead at Engaged
  → /invoiced → /paid → PortfolioItem auto-created
  → /insights tracks all of it
```

### ⏭ Next Steps
- [ ] Domain → Traefik labels → HTTPS auto via Let's Encrypt
- [ ] Apify Upwork scraper — `lib/platforms/upwork.ts`, `APIFY_TOKEN` + `APIFY_UPWORK_ACTOR_ID`
- [ ] Template performance — link templates to jobs, update wins/sent on close
