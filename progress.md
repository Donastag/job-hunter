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
