import { PlatformManager } from './platforms/manager'
import { generateProposal } from './proposals'

export interface PipelineResult {
  newJobs: number
  priorityCount: number
  durationMs: number
}

let running = false

export async function runPipeline(): Promise<PipelineResult> {
  if (running) throw new Error('Pipeline already running')

  running = true
  const started = Date.now()

  try {
    const manager = new PlatformManager()
    const { newJobs, priorityJobs } = await manager.syncToDatabase()

    if (priorityJobs.length > 0) {
      await notifyTelegram(newJobs, priorityJobs)
    }

    return { newJobs, priorityCount: priorityJobs.length, durationMs: Date.now() - started }
  } finally {
    running = false
  }
}

type PriorityJob = {
  title: string
  budget?: string
  url: string
  platform: string
  description: string
  skills?: string[]
  type?: string
}

async function notifyTelegram(newTotal: number, jobs: PriorityJob[]) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  for (const job of jobs.slice(0, 3)) {
    // Generate proposal for each priority job
    const proposal = await generateProposal({
      title: job.title,
      description: job.description,
      budget: job.budget,
      type: job.type,
      skills: job.skills || [],
      platform: job.platform,
    })

    const budgetLine = job.budget && job.budget !== '$0' ? `💰 *${job.budget}*` : '💰 Budget TBD'
    const proposalBlock = proposal
      ? `\n\n✍️ *Draft proposal:*\n${proposal}`
      : ''

    const text = [
      `🎯 *New ${job.platform} job*`,
      `*${job.title}*`,
      budgetLine,
      `[View job](${job.url})`,
      proposalBlock,
    ].filter(Boolean).join('\n')

    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(10000),
      })
    } catch (err) {
      console.error('[Pipeline] Telegram send failed:', (err as Error).message)
    }

    // Small delay between messages to avoid Telegram rate limiting
    await new Promise(r => setTimeout(r, 500))
  }

  // If more than 3 priority jobs, send a summary for the rest
  if (jobs.length > 3) {
    const remaining = jobs.slice(3)
    const lines = remaining.map(j => `• ${j.title.slice(0, 50)} — ${j.budget || 'TBD'} (${j.platform})`)
    const summaryText = `📋 *${remaining.length} more priority jobs:*\n${lines.join('\n')}`

    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: summaryText,
          parse_mode: 'Markdown',
        }),
        signal: AbortSignal.timeout(10000),
      })
    } catch { /* ignore */ }
  }

  console.log(`[Pipeline] Sent ${Math.min(jobs.length, 3)} Telegram alerts with proposals`)
}
