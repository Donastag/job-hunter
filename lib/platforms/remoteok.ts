export interface RemoteOKJob {
  id: string
  title: string
  description: string
  company: string
  budget?: string
  type?: string
  skills?: string[]
  location?: string
  postedAt: Date
  url: string
}

interface RemoteOKItem {
  id?: string | number
  slug?: string
  position?: string
  company?: string
  description?: string
  tags?: string[]
  salary_min?: number
  salary_max?: number
  url?: string
  date?: string
  legal?: string
}

const TARGET_TAGS = [
  'python', 'node', 'react', 'typescript', 'javascript', 'api', 'ai',
  'automation', 'backend', 'fullstack', 'saas', 'nextjs', 'fastapi',
]

export class RemoteOKIntegration {
  async fetchJobs(): Promise<RemoteOKJob[]> {
    try {
      const res = await fetch('https://remoteok.com/api', {
        headers: {
          'User-Agent': 'Mozilla/5.0 JobHunter/1.0',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(20000),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data: RemoteOKItem[] = await res.json()
      // First element is always a legal notice object
      const items = data.filter((item) => !item.legal)

      return items
        .filter((item) => this.isRelevant(item))
        .map((item) => this.mapItem(item))
        .filter((j): j is RemoteOKJob => j !== null)
    } catch (err) {
      console.error('[RemoteOK] fetch failed:', (err as Error).message)
      return []
    }
  }

  private isRelevant(item: RemoteOKItem): boolean {
    const tags = (item.tags || []).map((t) => t.toLowerCase())
    return TARGET_TAGS.some((t) => tags.includes(t))
  }

  private mapItem(item: RemoteOKItem): RemoteOKJob | null {
    if (!item.position || !item.url) return null

    const desc = (item.description || '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    let budget: string | undefined
    if (item.salary_min && item.salary_max) {
      budget = `$${item.salary_min.toLocaleString()}–$${item.salary_max.toLocaleString()}/yr`
    } else if (item.salary_min) {
      budget = `$${item.salary_min.toLocaleString()}/yr`
    }

    return {
      id: `remoteok-${item.slug || item.id}`,
      title: item.position,
      description: desc,
      company: item.company || 'Unknown',
      budget,
      type: 'Contract',
      skills: item.tags || [],
      location: 'Remote',
      postedAt: item.date ? new Date(item.date) : new Date(),
      url: item.url,
    }
  }
}
