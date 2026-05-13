// Run: node scripts/test-telegram.mjs
// After updating TELEGRAM_BOT_TOKEN in .env.local

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '../.env.local')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => l.split('=').map(s => s.trim().replace(/^"|"$/g, '')))
)

const TOKEN = env.TELEGRAM_BOT_TOKEN
const CHAT_ID = env.TELEGRAM_CHAT_ID

console.log('\n  Telegram Config Check')
console.log('  ─────────────────────')
console.log('  Token :', TOKEN ? TOKEN.slice(0, 20) + '...' : '(missing)')
console.log('  ChatID:', CHAT_ID || '(missing)')

if (!TOKEN) {
  console.log('\n  ✗ No token set in .env.local\n')
  process.exit(1)
}

// 1. Validate token
const meRes = await fetch(`https://api.telegram.org/bot${TOKEN}/getMe`)
const me = await meRes.json()

if (!me.ok) {
  console.log('\n  ✗ Token invalid:', me.description)
  console.log('\n  → Get a new token:')
  console.log('    1. Message @BotFather on Telegram')
  console.log('    2. Send: /newbot')
  console.log('    3. Name: Nexara Job Hunter')
  console.log('    4. Username: nexara_jh_bot (or similar)')
  console.log('    5. Copy the token (format: 123456789:AAFxxx...)')
  console.log('    6. Update TELEGRAM_BOT_TOKEN in .env.local')
  console.log()
  process.exit(1)
}

console.log(`\n  ✓ Bot valid: @${me.result.username} (${me.result.first_name})`)

// 2. Check chat ID or get updates
if (!CHAT_ID) {
  console.log('\n  → No chat ID set. Message your bot then run:')
  console.log(`    curl "https://api.telegram.org/bot${TOKEN}/getUpdates"`)
  console.log('    Copy "chat.id" from the response and set TELEGRAM_CHAT_ID in .env.local')
} else {
  // 3. Send test message
  const msgRes = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: '✅ <b>Nexara Job Hunter</b> — Telegram connected!\n\nYou will receive alerts here.',
      parse_mode: 'HTML',
    }),
  })
  const msg = await msgRes.json()
  if (msg.ok) {
    console.log('  ✓ Test message sent — check Telegram!')
  } else {
    console.log('  ✗ Message failed:', msg.description)
    console.log('  → Your chat ID may be wrong. Forward any message to @userinfobot to get your correct ID.')
  }
}

console.log()
