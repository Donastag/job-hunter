export async function register() {
  // Only run in Node.js runtime (not Edge), and only in server context
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startCron } = await import('./lib/cron')
    const { startBotPolling } = await import('./lib/telegram-bot-commands')
    startCron()
    startBotPolling()
  }
}
