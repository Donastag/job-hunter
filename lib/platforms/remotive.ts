export interface RemotiveJob {
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

interface RemotiveItem {
  id: number
  title: string
  company_name: string
  description: string
  tags: string[]
  salary?: string
  job_type: string
  url: string
  publication_date: string
  candidate_required_location?: string
}

interface RemotiveResponse {
  jobs: RemotiveItem[]
}

const CATEGORIES = ['software-dev', 'devops-sysadmin', 'data']
const TARGET_KEYWORDS = [
  'python', 'node', 'react', 'typescript', 'api', 'automation', 'ai',
  'n8n', 'saas', 'backend', 'fullstack', 'fastapi', 'langchain', 'rag',
]

export class RemotiveIntegration {
  async fetchJobs(): Promise<RemotiveJob[]> {
    const seen = new Set<number>()
    const all: RemotiveJob[] = []

    for (const category of CATEGORIES) {
      try {
        const url = `https://remotive.com/api/remote-jobs?category=${category}&limit=50`
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 JobHunter/1.0' },
          signal: AbortSignal.timeout(20000),
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data: RemotiveResponse = await res.json()

        for (const item of data.jobs) {
          if (seen.has(item.id)) continue
          if (!this.isRelevant(item)) continue
          seen.add(item.id)
          const job = this.mapItem(item)
          if (job) all.push(job)
        }
      } catch (err) {
        console.error(`[Remotive] category "${category}" failed:`, (err as Error).message)
      }
    }

    return all
  }

  private isRelevant(item: RemotiveItem): boolean {
    const text = `${item.title} ${item.tags.join(' ')}`.toLowerCase()
    return TARGET_KEYWORDS.some((kw) => text.includes(kw))
  }

  private mapItem(item: RemotiveItem): RemotiveJob | null {
    if (!item.title || !item.url) return null

    const desc = item.description
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    const typeMap: Record<string, string> = {
      full_time: 'Full-time',
      contract: 'Contract',
      part_time: 'Part-time',
      freelance: 'Fixed',
    }

    return {
      id: `remotive-${item.id}`,
      title: item.title,
      description: desc,
      company: item.company_name,
      budget: item.salary || undefined,
      type: typeMap[item.job_type] || item.job_type,
      skills: item.tags,
      location: item.candidate_required_location || 'Remote',
      postedAt: new Date(item.publication_date),
      url: item.url,
    }
  }
}
