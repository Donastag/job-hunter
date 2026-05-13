/**
 * Reads Orion browser's native cookie file and extracts Upwork session cookies.
 * No login needed — uses the session you already have in Orion.
 *
 * Usage:
 *   node scripts/extract-upwork-cookies.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { homedir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ENV_PATH = join(__dirname, '..', '.env.local')

const COOKIE_FILE = join(
  homedir(),
  'Library/HTTPStorages/com.kagi.kagimacOS.binarycookies'
)

const RSS_QUERIES = [
  'n8n+automation',
  'AI+automation+chatbot',
  'Python+RAG+LangChain',
  'Next.js+SaaS+API',
]

// ── Binary cookies parser ────────────────────────────────────────────────────

function readNullTermString(buf, offset) {
  let end = offset
  while (end < buf.length && buf[end] !== 0) end++
  return buf.slice(offset, end).toString('utf8')
}

function parseBinaryCookies(filePath) {
  const buf = readFileSync(filePath)

  if (buf.slice(0, 4).toString('ascii') !== 'cook') {
    throw new Error('Not a valid .binarycookies file')
  }

  const numPages = buf.readUInt32BE(4)
  const pageSizes = []
  for (let i = 0; i < numPages; i++) {
    pageSizes.push(buf.readUInt32BE(8 + i * 4))
  }

  const cookies = []
  let pageStart = 8 + numPages * 4

  for (let p = 0; p < numPages; p++) {
    const page = buf.slice(pageStart, pageStart + pageSizes[p])
    pageStart += pageSizes[p]

    const numCookies = page.readUInt32LE(4)
    const offsets = []
    for (let i = 0; i < numCookies; i++) {
      offsets.push(page.readUInt32LE(8 + i * 4))
    }

    for (const offset of offsets) {
      try {
        const c = page.slice(offset)
        // const size     = c.readUInt32LE(0)
        const flags      = c.readUInt32LE(8)
        const domainOff  = c.readUInt32LE(16)
        const nameOff    = c.readUInt32LE(20)
        const pathOff    = c.readUInt32LE(24)
        const valueOff   = c.readUInt32LE(28)
        // Mac absolute time: seconds since 2001-01-01
        const expiry     = c.readDoubleLE(36)

        const domain = readNullTermString(c, domainOff)
        const name   = readNullTermString(c, nameOff)
        const path   = readNullTermString(c, pathOff)
        const value  = readNullTermString(c, valueOff)

        const secure   = !!(flags & 0x1)
        const httpOnly = !!(flags & 0x4)

        // Convert Mac absolute time to JS Date
        const expiryMs = (expiry + 978307200) * 1000 // add seconds from 1970→2001
        const expiryDate = new Date(expiryMs)

        cookies.push({ domain, name, path, value, secure, httpOnly, expiry: expiryDate })
      } catch {
        // skip malformed cookie
      }
    }
  }

  return cookies
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🍪 Reading Orion cookies...')

  if (!existsSync(COOKIE_FILE)) {
    console.error(`❌ Cookie file not found:\n   ${COOKIE_FILE}`)
    process.exit(1)
  }

  const all = parseBinaryCookies(COOKIE_FILE)
  console.log(`   Found ${all.length} total cookies`)

  const upworkCookies = all.filter(
    (c) =>
      (c.domain.includes('upwork.com') || c.domain === '.upwork.com') &&
      new Date(c.expiry) > new Date()
  )

  if (upworkCookies.length === 0) {
    console.error('\n❌ No valid Upwork cookies found in Orion.')
    console.error('   Make sure you are logged in to Upwork in Orion and try again.')
    process.exit(1)
  }

  console.log(`   Found ${upworkCookies.length} Upwork cookies:`)
  upworkCookies.forEach((c) =>
    console.log(`     ${c.name} (expires ${c.expiry.toLocaleDateString()})`)
  )

  const cookieString = upworkCookies.map((c) => `${c.name}=${c.value}`).join('; ')

  // ── Test the RSS feeds ────────────────────────────────────────────────────
  console.log('\n🔍 Testing RSS feeds with your cookies...')
  const working = []

  for (const q of RSS_QUERIES) {
    const url = `https://www.upwork.com/ab/feed/jobs/rss?q=${q}&sort=recency&paging=0%3B25`
    try {
      const res = await fetch(url, {
        headers: {
          Cookie: cookieString,
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
          Accept: 'application/rss+xml, application/xml, text/xml, */*',
        },
        signal: AbortSignal.timeout(15000),
      })
      const text = await res.text()
      const ok = res.ok && (text.includes('<rss') || text.includes('<?xml'))
      console.log(`  ${ok ? '✅' : '❌'} ${q} (HTTP ${res.status})`)
      if (ok) working.push(url)
    } catch (err) {
      console.log(`  ❌ ${q} — ${err.message}`)
    }
  }

  if (working.length === 0) {
    console.log('\n⚠️  RSS feeds still blocked — Upwork may require you to be actively logged in.')
    console.log('   Try logging in to upwork.com in Orion, then run this script again.')
    // Still save the cookies — maybe they work but the test URLs are blocked
    console.log('   Saving cookies anyway so the scraper can try...\n')
  } else {
    console.log(`\n✅ ${working.length} RSS feed(s) working!`)
  }

  // ── Update .env.local ─────────────────────────────────────────────────────
  let env = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf8') : ''

  const rssUrl = working[0] || RSS_QUERIES.map(
    (q) => `https://www.upwork.com/ab/feed/jobs/rss?q=${q}&sort=recency&paging=0%3B25`
  )[0]

  const rssUrls = (working.length > 0 ? working : [rssUrl]).join(',')

  const replaceLine = (key, val) => {
    const re = new RegExp(`^${key}=.*`, 'm')
    if (re.test(env)) {
      env = env.replace(re, `${key}="${val}"`)
    } else {
      env += `\n${key}="${val}"`
    }
  }

  replaceLine('UPWORK_RSS_URL', rssUrl)
  replaceLine('UPWORK_RSS_URLS', rssUrls)
  replaceLine('UPWORK_COOKIES', cookieString)

  writeFileSync(ENV_PATH, env)

  console.log('\n✅ Saved to .env.local:')
  console.log(`   UPWORK_COOKIES  — ${upworkCookies.length} cookies`)
  console.log(`   UPWORK_RSS_URL  — ${rssUrl}`)
  console.log('\n🚀 Now trigger the pipeline:')
  console.log('   curl -X POST http://localhost:3002/api/jobs/run\n')
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
