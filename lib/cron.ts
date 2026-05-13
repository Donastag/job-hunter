import cron from 'node-cron'
import { runPipeline } from './pipeline'

let started = false

export function startCron() {
  if (started) return
  started = true

  const interval = process.env.PIPELINE_CRON || '*/30 * * * *' // default: every 30 mins

  cron.schedule(interval, async () => {
    console.log(`[Cron] ${new Date().toISOString()} — running pipeline...`)
    try {
      const result = await runPipeline()
      console.log(`[Cron] Done — ${result.newJobs} new jobs, ${result.priorityCount} priority (${result.durationMs}ms)`)
    } catch (err) {
      console.error('[Cron] Pipeline error:', (err as Error).message)
    }
  })

  // Log next run time
  const parts = interval.split(' ')
  const mins = parts[0].replace('*/', '')
  console.log(`[Cron] Pipeline scheduled every ${mins} minutes (${interval})`)
}
