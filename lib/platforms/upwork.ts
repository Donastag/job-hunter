import RSSParser from 'rss-parser'

export interface UpworkJob {
  id: string
  title: string
  description: string
  budget?: string
  type?: string
  skills?: string[]
  location?: string
  clientRating?: number
  clientSpent?: string
  clientHired?: number
  clientVerified?: boolean
  proposals?: number
  postedAt: Date
  url: string
}

type CustomItem = {
  budget?: string
  jobType?: string
  skills?: string
  country?: string
  clientRating?: string
  clientSpent?: string
  clientHired?: string
  clientVerified?: string
  proposals?: string
}

export class UpworkIntegration {
  private parser: RSSParser<Record<string, unknown>, CustomItem>

  constructor() {
    this.parser = new RSSParser<Record<string, unknown>, CustomItem>({
      customFields: {
        item: [
          ['upwork:budget', 'budget'],
          ['upwork:job_type', 'jobType'],
          ['upwork:skills', 'skills'],
          ['upwork:country', 'country'],
          ['upwork:client_rating', 'clientRating'],
          ['upwork:client_total_charge', 'clientSpent'],
          ['upwork:client_hires', 'clientHired'],
          ['upwork:client_payment_verification_status', 'clientVerified'],
          ['upwork:job_proposals', 'proposals'],
        ],
      },
      timeout: 20000,
      headers: { 'User-Agent': 'Mozilla/5.0 JobHunter/1.0' },
    })
  }

  // Run scripts/extract-upwork-rss.mjs once to populate UPWORK_RSS_URL + UPWORK_COOKIES in .env.local
  async fetchJobs(): Promise<UpworkJob[]> {
    const cookies = process.env.UPWORK_COOKIES
    const rssUrlsRaw = process.env.UPWORK_RSS_URLS || process.env.UPWORK_RSS_URL

    if (!cookies || !rssUrlsRaw) {
      console.warn('[Upwork] Not configured — run: node scripts/extract-upwork-rss.mjs')
      return []
    }

    const urls = rssUrlsRaw.split(',').map(u => u.trim()).filter(Boolean)
    const seen = new Set<string>()
    const all: UpworkJob[] = []

    for (const rssUrl of urls) {
      try {
        // Use fetch with session cookies, then parse the XML string
        const res = await fetch(rssUrl, {
          headers: {
            'Cookie': cookies,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          },
          signal: AbortSignal.timeout(20000),
        })

        if (!res.ok) {
          console.error(`[Upwork] RSS returned ${res.status} — cookies may have expired. Re-run extract-upwork-rss.mjs`)
          continue
        }

        const xml = await res.text()
        const feed = await this.parser.parseString(xml)

        for (const item of feed.items) {
          const id = (item.guid as string) || item.link || ''
          if (!id || seen.has(id)) continue
          seen.add(id)
          const job = this.mapItem(item as RSSParser.Item & CustomItem)
          if (job) all.push(job)
        }
      } catch (err) {
        console.error(`[Upwork] fetch failed for ${rssUrl}:`, (err as Error).message)
      }
    }

    return all
  }

  private mapItem(item: RSSParser.Item & CustomItem): UpworkJob | null {
    if (!item.title || !item.link) return null

    const desc = (item.content || item.contentSnippet || '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    const skills = (item.skills || '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean)

    const budget = item.budget || this.extractBudgetFromDesc(desc)

    return {
      id: (item.guid as string) || item.link!,
      title: item.title.trim(),
      description: desc,
      budget,
      type: item.jobType === 'Hourly' ? 'Hourly' : 'Fixed',
      skills,
      location: item.country || 'Remote',
      clientRating: item.clientRating ? parseFloat(item.clientRating) : undefined,
      clientSpent: item.clientSpent,
      clientHired: item.clientHired ? parseInt(item.clientHired, 10) : undefined,
      clientVerified: item.clientVerified?.toLowerCase() === 'verified',
      proposals: item.proposals ? parseInt(item.proposals, 10) : 0,
      postedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      url: item.link!,
    }
  }

  private extractBudgetFromDesc(desc: string): string {
    const m = desc.match(/\$[\d,]+(?:\s*[-–]\s*\$[\d,]+)?(?:\/hr)?/)
    return m ? m[0] : '$0'
  }

  async getJobDetails(_jobId: string) {
    return null
  }
}
