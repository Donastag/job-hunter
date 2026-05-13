import { webkit } from 'playwright'
import type { UpworkJob } from './upwork'

const QUERIES = [
  'n8n automation',
  'AI automation chatbot',
  'Python RAG LangChain',
  'Next.js SaaS API integration',
]

function parseCookieString(raw: string): { name: string; value: string; domain: string; path: string }[] {
  return raw.split(';').map(pair => {
    const [name, ...rest] = pair.trim().split('=')
    return { name: name.trim(), value: rest.join('=').trim(), domain: '.upwork.com', path: '/' }
  }).filter(c => c.name)
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return 'Unknown'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  return `${Math.floor(hrs / 24)} day ago`
}

export class UpworkBrowserIntegration {
  async fetchJobs(): Promise<UpworkJob[]> {
    const cookieStr = process.env.UPWORK_COOKIES
    if (!cookieStr) {
      console.warn('[Upwork] UPWORK_COOKIES not set — run: node scripts/extract-upwork-cookies.mjs')
      return []
    }

    const cookies = parseCookieString(cookieStr)
    const seen = new Set<string>()
    const all: UpworkJob[] = []

    const browser = await webkit.launch({
      headless: false, // must be visible — headless triggers Cloudflare challenge
      args: ['--window-position=3000,3000'], // off-screen
    })

    try {
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
        viewport: { width: 1440, height: 900 },
        locale: 'en-US',
        timezoneId: 'Africa/Nairobi',
        extraHTTPHeaders: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
        },
      })

      await context.addCookies(cookies)
      const page = await context.newPage()

      // Suppress console noise from Upwork's app
      page.on('console', () => {})

      for (const q of QUERIES) {
        try {
          const url = `https://www.upwork.com/nx/search/jobs/?q=${encodeURIComponent(q)}&sort=recency`
          console.log(`[Upwork] Scraping: ${q}`)

          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })

          // Check if Cloudflare challenge appeared
          const title = await page.title()
          if (title.toLowerCase().includes('challenge') || title.toLowerCase().includes('just a moment')) {
            console.warn('[Upwork] Cloudflare challenge — waiting for it to resolve...')
            await page.waitForTimeout(8000)
          }

          // Wait for job cards to appear
          const jobSelector = '[data-test="job-tile-list"] article, section[data-test="job-tile"], article[data-test^="job-tile"]'
          try {
            await page.waitForSelector(jobSelector, { timeout: 15000 })
          } catch {
            // Try __NEXT_DATA__ fallback
          }

          // Extract from DOM or __NEXT_DATA__
          const jobs = await page.evaluate(() => {
            // Strategy 1: Try __NEXT_DATA__
            try {
              const nextDataEl = document.getElementById('__NEXT_DATA__')
              if (nextDataEl) {
                const data = JSON.parse(nextDataEl.textContent || '{}')
                const results =
                  data?.props?.pageProps?.searchResults?.results ||
                  data?.props?.pageProps?.results ||
                  data?.props?.initialReduxState?.jobs?.jobSearchResult?.results ||
                  []

                if (Array.isArray(results) && results.length > 0) {
                  return results.map((r: Record<string, unknown>) => ({
                    _source: 'next_data',
                    id: r.uid || r.id || r.jobId || String(Math.random()),
                    title: r.title || '',
                    description: (r.description as string || r.snippet as string || '').replace(/<[^>]+>/g, '').trim(),
                    budget: (r.budget as Record<string, unknown>)?.displayValue || r.budgetRange || '',
                    jobType: (r.engagement as string || '').toLowerCase().includes('hourly') ? 'Hourly' : 'Fixed',
                    skills: ((r.attrs as { prefLabel?: string }[] | null) || []).map((a) => a.prefLabel).filter(Boolean),
                    country: (r.client as Record<string, unknown>)?.location || '',
                    clientRating: (r.client as Record<string, unknown>)?.totalFeedback || null,
                    clientSpent: (r.client as Record<string, unknown>)?.totalCharge || null,
                    clientHired: (r.client as Record<string, unknown>)?.totalHires || null,
                    proposals: r.proposalCount || 0,
                    postedAt: r.publishTime || r.createdOn || '',
                    url: 'https://www.upwork.com/jobs/' + (r.uid || r.id || ''),
                  }))
                }
              }
            } catch { /* fall through */ }

            // Strategy 2: Scrape DOM tiles
            const tiles = document.querySelectorAll('article[data-test^="job-tile"], [data-ev-label="job_listing"]')
            return Array.from(tiles).map(tile => {
              const text = (sel: string) => tile.querySelector(sel)?.textContent?.trim() || ''
              const href = tile.querySelector('a[href*="/jobs/"]')?.getAttribute('href') || ''
              return {
                _source: 'dom',
                id: href.split('/').pop()?.split('?')[0] || String(Math.random()),
                title: text('h2, h3, [data-test="job-tile-title"]'),
                description: text('[data-test="job-tile-description"], .description'),
                budget: text('[data-test="budget"], [data-test="job-type-label"]'),
                jobType: 'Fixed',
                skills: Array.from(tile.querySelectorAll('[data-test="token"], .skill-tag')).map(s => s.textContent?.trim() || '').filter(Boolean),
                country: '',
                clientRating: null,
                clientSpent: null,
                clientHired: null,
                proposals: 0,
                postedAt: text('time, [data-test="posted-on"]'),
                url: href.startsWith('http') ? href : 'https://www.upwork.com' + href,
              }
            })
          })

          for (const j of jobs as Record<string, unknown>[]) {
            const id = String(j.id || '')
            if (!id || !String(j.title || '') || seen.has(id)) continue
            seen.add(id)
            all.push({
              id: `upwork-${id}`,
              title: String(j.title || ''),
              description: String(j.description || ''),
              budget: String(j.budget || '') || undefined,
              type: String(j.jobType || 'Fixed'),
              skills: (j.skills as string[] | null) || [],
              location: String(j.country || 'Remote'),
              clientRating: j.clientRating ? Number(j.clientRating) : undefined,
              clientSpent: j.clientSpent ? String(j.clientSpent) : undefined,
              clientHired: j.clientHired ? Number(j.clientHired) : undefined,
              proposals: Number(j.proposals || 0),
              postedAt: j.postedAt ? new Date(String(j.postedAt)) : new Date(),
              url: String(j.url || ''),
            })
          }

          console.log(`[Upwork] "${q}" → ${jobs.length} jobs`)
          await page.waitForTimeout(2000) // polite delay between queries

        } catch (err) {
          console.error(`[Upwork] Failed query "${q}":`, (err as Error).message)
        }
      }
    } finally {
      await browser.close()
    }

    console.log(`[Upwork] Total: ${all.length} jobs`)
    return all
  }
}
