import { prisma } from './db'
import { runPipeline } from './pipeline'

const TOKEN = () => process.env.TELEGRAM_BOT_TOKEN || ''
const CHAT_ID = () => process.env.TELEGRAM_CHAT_ID || ''

// ── Helpers ──────────────────────────────────────────────────────────────────

async function tgCall(method: string, body: Record<string, unknown>) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return r.json()
}

async function send(chatId: number | string, text: string, extra: Record<string, unknown> = {}) {
  return tgCall('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra })
}

function fmtKES(n: number) {
  return 'KES ' + n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// SQLite direct access for Invoice/Client tables (not in Prisma schema)
// ── Command Handlers ─────────────────────────────────────────────────────────

async function cmdHelp(chatId: number) {
  await send(chatId, [
    '🤖 <b>Nexara Hunt Bot</b>',
    '',
    'Commands:',
    '/hunt — Run a job hunt now',
    '/stats — Live job stats',
    '/jobs — Top 5 priority jobs',
    '/pipeline — Pipeline Kanban summary',
    '/finance — Invoice &amp; earnings summary',
    '/help — Show this menu',
  ].join('\n'))
}

async function cmdStats(chatId: number) {
  const total = await prisma.job.count()
  const today = await prisma.job.count({
    where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
  })
  const priority = await prisma.job.count({ where: { tier: 'priority' } })
  const applied = await prisma.job.count({ where: { status: 'applied' } })
  const skipped = await prisma.job.count({ where: { status: 'archived' } })

  await send(chatId, [
    '📊 <b>Job Hunt Stats</b>',
    '',
    `📦 Total jobs: <b>${total}</b>`,
    `📅 Fetched today: <b>${today}</b>`,
    `🎯 Priority (≥85): <b>${priority}</b>`,
    `📤 Applied: <b>${applied}</b>`,
    `📁 Skipped: <b>${skipped}</b>`,
  ].join('\n'))
}

async function cmdJobs(chatId: number) {
  const jobs = await prisma.job.findMany({
    where: { tier: 'priority', status: { notIn: ['archived'] } },
    orderBy: { score: 'desc' },
    take: 5,
  })

  if (jobs.length === 0) {
    await send(chatId, '🔍 No priority jobs at the moment. Run /hunt to fetch new ones.')
    return
  }

  const lines = ['🎯 <b>Top Priority Jobs</b>', '']
  jobs.forEach((j, i) => {
    lines.push(`${i + 1}. <b>${j.title}</b>`)
    lines.push(`   🏢 ${j.platform} · 📊 ${j.score}/100`)
    if (j.budget && j.budget !== '$0') lines.push(`   💰 ${j.budget}`)
    if (j.url) lines.push(`   🔗 <a href="${j.url}">${j.platform}</a>`)
    lines.push('')
  })

  await send(chatId, lines.join('\n'), { disable_web_page_preview: true })
}

async function cmdPipeline(chatId: number) {
  const leads = await prisma.lead.findMany()
  const stages = ['contacted', 'engaged', 'call_booked', 'negotiating', 'won']
  const labels: Record<string, string> = {
    contacted: 'Contacted', engaged: 'Engaged',
    call_booked: 'Call Booked', negotiating: 'Negotiating', won: '🏆 Won',
  }

  const totalValue = leads.reduce((s, l) => s + (l.value || 0), 0)
  const wonValue = leads.filter(l => l.stage === 'won').reduce((s, l) => s + (l.value || 0), 0)

  const lines = ['📋 <b>Pipeline Summary</b>', '']
  stages.forEach(s => {
    const group = leads.filter(l => l.stage === s)
    const val = group.reduce((sum, l) => sum + (l.value || 0), 0)
    lines.push(`${labels[s]}: <b>${group.length}</b> leads${val > 0 ? ` · ${fmtKES(val)}` : ''}`)
  })
  lines.push('')
  lines.push(`💼 Total: <b>${leads.length}</b> leads · ${fmtKES(totalValue)}`)
  lines.push(`🏆 Won: ${fmtKES(wonValue)}`)

  await send(chatId, lines.join('\n'))
}

async function cmdFinance(chatId: number) {
  try {
    const invoices = await prisma.invoice.findMany()

    const earned  = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
    const pending = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.amount, 0)
    const overdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0)

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const thisMonth = invoices
      .filter(i => i.status === 'paid' && i.updatedAt >= monthStart)
      .reduce((s, i) => s + i.amount, 0)

    await send(chatId, [
      '💰 <b>Finance Summary</b>',
      '',
      `✅ Total earned: <b>${fmtKES(earned)}</b>`,
      `📅 This month: <b>${fmtKES(thisMonth)}</b>`,
      `⏳ Pending: <b>${fmtKES(pending)}</b>`,
      `🔴 Overdue: <b>${fmtKES(overdue)}</b>`,
      `📄 Total invoices: <b>${invoices.length}</b>`,
    ].join('\n'))
  } catch {
    await send(chatId, '⚠️ Finance data not available.')
  }
}

async function cmdHunt(chatId: number) {
  await send(chatId, '🔍 Starting job hunt... this may take 30–60s.')
  try {
    const result = await runPipeline()
    await send(chatId, [
      '✅ <b>Hunt complete!</b>',
      '',
      `📦 New jobs: <b>${result.newJobs}</b>`,
      `🎯 Priority: <b>${result.priorityCount}</b>`,
      `⏱ Time: ${result.durationMs}ms`,
      '',
      result.priorityCount > 0 ? 'Use /jobs to see top picks.' : 'No priority jobs this run.',
    ].join('\n'))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg.includes('already running')) {
      await send(chatId, '⚠️ Hunt already in progress. Try again in a minute.')
    } else {
      await send(chatId, `❌ Hunt failed: ${msg}`)
    }
  }
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

async function handleUpdate(update: {
  update_id: number
  message?: { chat: { id: number }; text?: string }
}) {
  const msg = update.message
  if (!msg?.text) return

  // Only respond to the configured owner
  const ownerId = parseInt(CHAT_ID())
  if (msg.chat.id !== ownerId) {
    await send(msg.chat.id, '⛔ Unauthorised.')
    return
  }

  const cmd = msg.text.split(' ')[0].toLowerCase().replace('@nexarahunterbot', '')

  switch (cmd) {
    case '/start':
    case '/help': return cmdHelp(msg.chat.id)
    case '/stats': return cmdStats(msg.chat.id)
    case '/jobs': return cmdJobs(msg.chat.id)
    case '/pipeline': return cmdPipeline(msg.chat.id)
    case '/finance': return cmdFinance(msg.chat.id)
    case '/hunt': return cmdHunt(msg.chat.id)
    default:
      await send(msg.chat.id, `Unknown command. Send /help to see what I can do.`)
  }
}

// ── Long-polling loop ─────────────────────────────────────────────────────────

let polling = false

export function startBotPolling() {
  if (polling) return
  if (!TOKEN() || !CHAT_ID()) {
    console.log('[Bot] Telegram not configured — polling skipped')
    return
  }
  polling = true
  console.log('[Bot] Telegram command bot started (long-polling)')
  poll(0).catch(err => console.error('[Bot] Fatal polling error:', err))
}

async function poll(offset: number): Promise<void> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TOKEN()}/getUpdates?offset=${offset}&timeout=30&allowed_updates=["message"]`,
      { signal: AbortSignal.timeout(40_000) }
    )
    if (!res.ok) throw new Error(`Telegram HTTP ${res.status}`)

    const data = await res.json() as { ok: boolean; result: Array<{ update_id: number; message?: unknown }> }
    if (!data.ok) throw new Error('Telegram returned ok=false')

    let nextOffset = offset
    for (const update of data.result) {
      nextOffset = update.update_id + 1
      handleUpdate(update as Parameters<typeof handleUpdate>[0]).catch(err =>
        console.error('[Bot] Handler error:', err)
      )
    }

    return poll(nextOffset)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (!msg.includes('aborted')) console.warn('[Bot] Poll error, retrying in 5s:', msg)
    await new Promise(r => setTimeout(r, 5000))
    return poll(offset)
  }
}
