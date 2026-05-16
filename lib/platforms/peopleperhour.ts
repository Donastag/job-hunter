import RSSParser from 'rss-parser'

export interface PPHJob {
  id: string
  title: string
  description: string
  budget?: string
  skills?: string[]
  postedAt: Date
  url: string
}

const SEARCH_TERMS = [
  'python',
  'automation',
  'n8n',
  'nextjs',
  'api',
  'chatbot',
  'AI',
  'node',
  'typescript',
  'fastapi',
]

const BASE_URL = 'https://www.peopleperhour.com/feed/jobs'

type RSSItem = {
  title?: string
  link?: string
  guid?: string
  pubDate?: string
  content?: string
  contentSnippet?: string
}

export class PeoplePerHourIntegration {
  private parser = new RSSParser<Record<string, unknown>, RSSItem>({
    timeout: 20000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    },
  })

  async fetchJobs(): Promise<PPHJob[]> {
    const seen = new Set<string>()
    const all: PPHJob[] = []

    for (const term of SEARCH_TERMS) {
      try {
        const url = `${BASE_URL}?term=${encodeURIComponent(term)}`
        const feed = await this.parser.parseURL(url)

        for (const item of feed.items) {
          const id = `pph-${item.guid || item.link || ''}`
          if (!id || seen.has(id)) continue
          seen.add(id)
          const job = this.mapItem(item)
          if (job) all.push(job)
        }
      } catch (err) {
        console.error(`[PPH] fetch failed for "${term}":`, (err as Error).message)
      }
    }

    return all
  }

  private mapItem(item: RSSItem): PPHJob | null {
    if (!item.title || !item.link) return null

    const raw = item.content || item.contentSnippet || ''
    const desc = raw.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

    const budget = this.extractBudget(desc)
    const skills = this.extractSkills(item.title + ' ' + desc)

    return {
      id: `pph-${item.guid || item.link}`,
      title: item.title.trim(),
      description: desc,
      budget,
      skills,
      postedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      url: item.link,
    }
  }

  private extractBudget(desc: string): string | undefined {
    const m = desc.match(/£[\d,]+(?:\s*[-–]\s*£[\d,]+)?|\$[\d,]+(?:\s*[-–]\s*\$[\d,]+)?(?:\/hr)?/)
    return m ? m[0] : undefined
  }

  private extractSkills(text: string): string[] {
    const lower = text.toLowerCase()
    const known = [
      'python', 'javascript', 'typescript', 'node', 'react', 'next.js', 'nextjs',
      'vue', 'angular', 'fastapi', 'django', 'flask', 'api', 'rest', 'graphql',
      'automation', 'n8n', 'zapier', 'chatbot', 'ai', 'openai', 'langchain',
      'scraping', 'selenium', 'playwright', 'docker', 'aws', 'gcp', 'sql',
      'postgresql', 'mongodb', 'redis', 'wordpress', 'shopify', 'stripe',
    ]
    return known.filter(s => lower.includes(s))
  }
}
