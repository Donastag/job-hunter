import RSSParser from 'rss-parser'

export interface WWRJob {
  id: string
  title: string
  description: string
  company: string
  type?: string
  skills?: string[]
  location?: string
  postedAt: Date
  url: string
}

const RSS_FEEDS = [
  'https://weworkremotely.com/categories/remote-programming-jobs.rss',
  'https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss',
  'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss',
]

const TARGET_KEYWORDS = [
  'python', 'node', 'react', 'typescript', 'api', 'automation', 'ai',
  'backend', 'fullstack', 'saas', 'next.js', 'fastapi',
]

const parser = new RSSParser({ timeout: 20000 })

export class WeWorkRemotelyIntegration {
  async fetchJobs(): Promise<WWRJob[]> {
    const seen = new Set<string>()
    const all: WWRJob[] = []

    for (const feedUrl of RSS_FEEDS) {
      try {
        const feed = await parser.parseURL(feedUrl)

        for (const item of feed.items) {
          const id = item.guid || item.link || ''
          if (!id || seen.has(id)) continue
          if (!this.isRelevant(item)) continue
          seen.add(id)
          const job = this.mapItem(item)
          if (job) all.push(job)
        }
      } catch (err) {
        console.error(`[WWR] feed "${feedUrl}" failed:`, (err as Error).message)
      }
    }

    return all
  }

  private isRelevant(item: RSSParser.Item): boolean {
    const text = `${item.title || ''} ${item.contentSnippet || ''}`.toLowerCase()
    return TARGET_KEYWORDS.some((kw) => text.includes(kw))
  }

  private mapItem(item: RSSParser.Item): WWRJob | null {
    if (!item.title || !item.link) return null

    // WWR titles are formatted as "Company: Job Title"
    const [rawCompany, ...titleParts] = item.title.split(':')
    const title = titleParts.join(':').trim() || item.title
    const company = rawCompany.trim()

    const desc = (item.contentSnippet || item.content || '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    return {
      id: `wwr-${item.guid || item.link}`,
      title,
      description: desc,
      company,
      type: 'Full-time',
      skills: this.extractSkills(desc),
      location: 'Remote',
      postedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      url: item.link,
    }
  }

  private extractSkills(text: string): string[] {
    const keywords = [
      'Python', 'TypeScript', 'JavaScript', 'React', 'Next.js', 'Node.js',
      'FastAPI', 'Django', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes',
      'GraphQL', 'REST', 'API', 'AI', 'ML', 'LLM',
    ]
    const lower = text.toLowerCase()
    return keywords.filter((k) => lower.includes(k.toLowerCase()))
  }
}
