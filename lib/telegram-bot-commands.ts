import { prisma } from './db'
import { runPipeline } from './pipeline'
import { logAnalyticsEvent } from './analytics'

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
    'Discovery:',
    '/hunt — Run a job hunt now',
    '/stats — Live job stats',
    '/jobs — Top 5 priority jobs',
    '',
    'Proposal flow:',
    '/apply [job_id] — Mark job as applied',
    '/replied [job_id] — Client replied → creates lead',
    '/won [job_id] [amount] — Won → creates invoice + AI brief',
    '/lost [job_id] — Mark as lost',
    '',
    'Invoice ops:',
    '/invoiced [inv_id] — Mark invoice sent',
    '/paid [inv_id] — Mark paid → auto-portfolio',
    '/overdue — List overdue invoices',
    '',
    'Intelligence:',
    '/insights — Win rates, revenue, top skills',
    '',
    'CRM:',
    '/pipeline — Pipeline summary',
    '/finance — Finance summary',
    '/help — Show this menu',
  ].join('\n'))
}

async function cmdInvoiced(chatId: number, prefix: string) {
  if (!prefix) {
    await send(chatId, '⚠️ Usage: /invoiced [invoice_id]\nGet IDs from /finance')
    return
  }
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { OR: [{ id: prefix }, { id: { startsWith: prefix } }] },
    })
    if (!invoice) {
      await send(chatId, `❌ Invoice not found: <code>${prefix}</code>`)
      return
    }
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'sent' } })
    await send(chatId, [
      '📤 <b>Invoice Sent</b>',
      '',
      `👤 ${invoice.clientName}`,
      `💰 ${fmtKES(invoice.amount)}`,
      `📋 ${invoice.description || '—'}`,
      '',
      'Use <b>/paid ' + invoice.id.slice(0, 8) + '</b> when they pay.',
    ].join('\n'))
  } catch (err) {
    await send(chatId, `❌ Error: ${err instanceof Error ? err.message : 'unknown'}`)
  }
}

async function cmdPaid(chatId: number, prefix: string) {
  if (!prefix) {
    await send(chatId, '⚠️ Usage: /paid [invoice_id]')
    return
  }
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { OR: [{ id: prefix }, { id: { startsWith: prefix } }] },
    })
    if (!invoice) {
      await send(chatId, `❌ Invoice not found: <code>${prefix}</code>`)
      return
    }
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'paid' } })
    await logAnalyticsEvent({ wins: 0, revenue: invoice.amount })

    // Auto-create portfolio item
    const job = invoice.jobId
      ? await prisma.job.findUnique({ where: { id: invoice.jobId } })
      : null
    await prisma.portfolioItem.create({
      data: {
        title: job?.title || invoice.description || invoice.clientName,
        client: invoice.clientName,
        techStack: job?.skills || '',
        outcome: job?.projectNotes || '',
        revenue: invoice.amount,
        status: 'active',
        completedAt: new Date(),
      },
    })

    await send(chatId, [
      '💚 <b>Payment Received!</b>',
      '',
      `👤 ${invoice.clientName}`,
      `💰 <b>${fmtKES(invoice.amount)}</b>`,
      '',
      '📁 Portfolio item created automatically.',
      '🎯 Keep going — next win awaits.',
    ].join('\n'))
  } catch (err) {
    await send(chatId, `❌ Error: ${err instanceof Error ? err.message : 'unknown'}`)
  }
}

async function cmdOverdue(chatId: number) {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
    const invoices = await prisma.invoice.findMany({
      where: { status: 'sent', createdAt: { lt: sevenDaysAgo } },
      orderBy: { createdAt: 'asc' },
    })
    if (invoices.length === 0) {
      await send(chatId, '✅ No overdue invoices. All clear!')
      return
    }
    const daysOld = (inv: { createdAt: Date }) =>
      Math.floor((Date.now() - new Date(inv.createdAt).getTime()) / 86400000)

    const lines = ['🔴 <b>Overdue Invoices</b>', '']
    invoices.forEach(inv => {
      lines.push(`📄 <b>${inv.clientName}</b>`)
      lines.push(`   💰 ${fmtKES(inv.amount)} · ${daysOld(inv)}d overdue`)
      lines.push(`   ID: <code>${inv.id.slice(0, 8)}</code>`)
      lines.push('')
    })
    lines.push(`Use /paid [id] to mark as paid.`)
    await send(chatId, lines.join('\n'))
  } catch (err) {
    await send(chatId, `❌ Error: ${err instanceof Error ? err.message : 'unknown'}`)
  }
}

async function cmdInsights(chatId: number) {
  try {
    const jobs = await prisma.job.findMany({
      select: { status: true, platform: true, skills: true },
    })
    const invoices = await prisma.invoice.findMany({
      select: { status: true, amount: true },
    })

    const won    = jobs.filter(j => j.status === 'won')
    const lost   = jobs.filter(j => j.status === 'lost')
    const applied = jobs.filter(j => ['applied', 'replied', 'won', 'lost'].includes(j.status))

    const totalDecided = won.length + lost.length
    const winRate = totalDecided > 0 ? Math.round((won.length / totalDecided) * 100) : 0
    const responseRate = applied.length > 0
      ? Math.round((jobs.filter(j => ['replied', 'won', 'lost'].includes(j.status)).length / applied.length) * 100)
      : 0

    const paidInvoices = invoices.filter(i => i.status === 'paid')
    const totalRevenue = paidInvoices.reduce((s, i) => s + i.amount, 0)
    const avgDeal = paidInvoices.length > 0 ? Math.round(totalRevenue / paidInvoices.length) : 0
    const pending = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.amount, 0)

    // Best platform
    const platforms: Record<string, { won: number; applied: number }> = {}
    applied.forEach(j => {
      if (!platforms[j.platform]) platforms[j.platform] = { won: 0, applied: 0 }
      platforms[j.platform].applied++
      if (j.status === 'won') platforms[j.platform].won++
    })
    const bestPlatform = Object.entries(platforms)
      .map(([p, d]) => ({ p, rate: d.applied > 0 ? d.won / d.applied : 0 }))
      .sort((a, b) => b.rate - a.rate)[0]

    // Top skill
    const skillCount: Record<string, number> = {}
    won.forEach(j => {
      try { (JSON.parse(j.skills || '[]') as string[]).forEach(s => { skillCount[s] = (skillCount[s] || 0) + 1 }) }
      catch { /* ignore */ }
    })
    const topSkill = Object.entries(skillCount).sort((a, b) => b[1] - a[1])[0]

    await send(chatId, [
      '📊 <b>Nexara Intelligence</b>',
      '',
      `🎯 Win rate: <b>${winRate}%</b> (${won.length}W / ${totalDecided} decided)`,
      `💬 Response rate: <b>${responseRate}%</b> (${applied.length} applied)`,
      `💰 Total earned: <b>${fmtKES(totalRevenue)}</b>`,
      `📈 Avg deal: <b>${fmtKES(avgDeal)}</b>`,
      `⏳ Pending: <b>${fmtKES(pending)}</b>`,
      '',
      bestPlatform ? `🏆 Best platform: <b>${bestPlatform.p}</b> (${Math.round(bestPlatform.rate * 100)}% win rate)` : '',
      topSkill ? `🔑 Top skill: <b>${topSkill[0]}</b> (${topSkill[1]} wins)` : '',
    ].filter(Boolean).join('\n'))
  } catch (err) {
    await send(chatId, `❌ Error: ${err instanceof Error ? err.message : 'unknown'}`)
  }
}

async function cmdApply(chatId: number, jobId: string) {
  if (!jobId) {
    await send(chatId, '⚠️ Usage: /apply [job_id]\nGet IDs from /jobs')
    return
  }
  try {
    const job = await prisma.job.findFirst({
      where: {
        OR: [
          { id: jobId },
          { id: { startsWith: jobId } },
        ],
      },
    })
    if (!job) {
      await send(chatId, `❌ Job not found: <code>${jobId}</code>`)
      return
    }
    await prisma.job.update({ where: { id: job.id }, data: { status: 'applied' } })
    await logAnalyticsEvent('proposals')
    if (job.templateUsed) {
      await prisma.template.updateMany({ where: { name: job.templateUsed }, data: { sent: { increment: 1 } } })
    }
    await send(chatId, [
      '✅ <b>Marked as Applied</b>',
      '',
      `📌 <b>${job.title}</b>`,
      `💰 ${job.budget || '—'}`,
      `🏢 ${job.platform}`,
      '',
      'Use <b>/replied ' + job.id.slice(0, 8) + '</b> when they respond.',
    ].join('\n'))
  } catch (err) {
    await send(chatId, `❌ Error: ${err instanceof Error ? err.message : 'unknown'}`)
  }
}

async function cmdReplied(chatId: number, jobId: string) {
  if (!jobId) {
    await send(chatId, '⚠️ Usage: /replied [job_id]')
    return
  }
  try {
    const job = await prisma.job.findFirst({
      where: {
        OR: [
          { id: jobId },
          { id: { startsWith: jobId } },
        ],
      },
    })
    if (!job) {
      await send(chatId, `❌ Job not found: <code>${jobId}</code>`)
      return
    }
    await prisma.job.update({ where: { id: job.id }, data: { status: 'replied' } })
    await logAnalyticsEvent('responses')

    const existing = await prisma.lead.findFirst({
      where: { notes: { contains: job.id } },
    })
    let leadMsg = ''
    if (!existing) {
      const lead = await prisma.lead.create({
        data: {
          name: job.clientName || job.title,
          source: job.platform,
          stage: 'engaged',
          notes: `Job ID: ${job.id} | ${job.title}`,
          value: 0,
        },
      })
      leadMsg = `\n📋 Lead created: <b>${lead.name}</b> → Engaged`
    } else {
      leadMsg = `\n📋 Lead already exists: <b>${existing.name}</b>`
    }

    await send(chatId, [
      '✅ <b>Reply Logged</b>',
      '',
      `📌 <b>${job.title}</b>` + leadMsg,
      '',
      'Use <b>/won ' + job.id.slice(0, 8) + ' [amount]</b> when you close it.',
    ].join('\n'))
  } catch (err) {
    await send(chatId, `❌ Error: ${err instanceof Error ? err.message : 'unknown'}`)
  }
}

async function cmdWon(chatId: number, jobId: string, amountStr: string) {
  if (!jobId) {
    await send(chatId, '⚠️ Usage: /won [job_id] [amount]\nExample: /won abc123 5000')
    return
  }
  try {
    const job = await prisma.job.findFirst({
      where: {
        OR: [
          { id: jobId },
          { id: { startsWith: jobId } },
        ],
      },
    })
    if (!job) {
      await send(chatId, `❌ Job not found: <code>${jobId}</code>`)
      return
    }
    const amount = amountStr ? parseFloat(amountStr) : 0
    await prisma.job.update({ where: { id: job.id }, data: { status: 'won' } })
    await logAnalyticsEvent({ wins: 1, revenue: amount })
    if (job.templateUsed) {
      await prisma.template.updateMany({ where: { name: job.templateUsed }, data: { wins: { increment: 1 } } })
    }
    const invoice = await prisma.invoice.create({
      data: {
        clientName: job.clientName || job.title,
        description: job.title,
        amount,
        status: 'draft',
      },
    })
    await send(chatId, [
      '🏆 <b>Job Won!</b>',
      '',
      `📌 <b>${job.title}</b>`,
      `💰 Contract value: <b>${fmtKES(amount)}</b>`,
      `📄 Invoice <b>${invoice.id.slice(0, 8)}</b> created (draft)`,
      '',
      'View invoice in Command Centre → Finance.',
    ].join('\n'))
  } catch (err) {
    await send(chatId, `❌ Error: ${err instanceof Error ? err.message : 'unknown'}`)
  }
}

async function cmdLost(chatId: number, jobId: string) {
  if (!jobId) {
    await send(chatId, '⚠️ Usage: /lost [job_id]')
    return
  }
  try {
    const job = await prisma.job.findFirst({
      where: {
        OR: [
          { id: jobId },
          { id: { startsWith: jobId } },
        ],
      },
    })
    if (!job) {
      await send(chatId, `❌ Job not found: <code>${jobId}</code>`)
      return
    }
    await prisma.job.update({ where: { id: job.id }, data: { status: 'lost' } })
    await send(chatId, [
      '📁 <b>Marked as Lost</b>',
      '',
      `📌 ${job.title}`,
      'Job archived. On to the next one. 💪',
    ].join('\n'))
  } catch (err) {
    await send(chatId, `❌ Error: ${err instanceof Error ? err.message : 'unknown'}`)
  }
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

  const parts = msg.text.trim().split(/\s+/)
  const cmd = parts[0].toLowerCase().replace('@nexarahunterbot', '')
  const arg1 = parts[1] || ''
  const arg2 = parts[2] || ''

  switch (cmd) {
    case '/start':
    case '/help':    return cmdHelp(msg.chat.id)
    case '/stats':   return cmdStats(msg.chat.id)
    case '/jobs':    return cmdJobs(msg.chat.id)
    case '/pipeline':return cmdPipeline(msg.chat.id)
    case '/finance': return cmdFinance(msg.chat.id)
    case '/hunt':    return cmdHunt(msg.chat.id)
    case '/apply':    return cmdApply(msg.chat.id, arg1)
    case '/replied':  return cmdReplied(msg.chat.id, arg1)
    case '/won':      return cmdWon(msg.chat.id, arg1, arg2)
    case '/lost':     return cmdLost(msg.chat.id, arg1)
    case '/invoiced': return cmdInvoiced(msg.chat.id, arg1)
    case '/paid':     return cmdPaid(msg.chat.id, arg1)
    case '/overdue':  return cmdOverdue(msg.chat.id)
    case '/insights': return cmdInsights(msg.chat.id)
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
