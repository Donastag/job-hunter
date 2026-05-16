import { Session } from 'impers'
import type { UpworkJob } from './upwork'

const SEARCH_QUERIES = [
  'python automation',
  'n8n workflow automation',
  'next.js react developer',
  'api development node',
  'ai chatbot langchain',
  'web scraping python',
  'fastapi backend',
  'typescript developer',
]

const GQL_ENDPOINT = 'https://www.upwork.com/api/graphql/v1'

const JOB_SEARCH_QUERY = `
  query GetJobFeed($variables: JobSearchInput) {
    jobSearch: searchJobs(variables: $variables) {
      results {
        job {
          title
          ciphertext
          description
          duration
          engagementType
          type
          budget { type min max amount }
          skills { prettyName }
          client {
            totalFeedback totalSpent totalJobsPosted
            totalHires paymentVerificationStatus
            location { country }
          }
          proposalsTier totalApplicants publishedOn
        }
      }
    }
  }
`

interface GQLJob {
  title?: string
  ciphertext?: string
  description?: string
  duration?: string
  engagementType?: string
  type?: string
  budget?: { type?: string; min?: number; max?: number; amount?: number }
  skills?: { prettyName: string }[]
  client?: {
    totalFeedback?: number
    totalSpent?: number
    totalHires?: number
    paymentVerificationStatus?: string
    location?: { country?: string }
  }
  proposalsTier?: string
  totalApplicants?: number
  publishedOn?: string
}

export class UpworkGraphQLIntegration {
  private token: string | null = null
  private tokenFetchedAt = 0
  private readonly TOKEN_TTL_MS = 50 * 60 * 1000 // 50 minutes

  private async getToken(): Promise<string | null> {
    const now = Date.now()
    if (this.token && now - this.tokenFetchedAt < this.TOKEN_TTL_MS) {
      return this.token
    }

    const session = new Session({ impersonate: 'chrome131' })
    try {
      await session.get('https://www.upwork.com/', {
        timeout: 30,
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      })

      const rawCookies = session.cookies
      // impers Cookies object — iterate or use .get()
      const token = (rawCookies as unknown as { get(name: string): { value: string } | undefined }).get?.('visitor_gql_token')?.value
        ?? String(rawCookies).split('visitor_gql_token=')[1]?.split(';')[0]?.trim()

      if (!token) {
        console.warn('[Upwork GQL] visitor_gql_token not found in cookies — Cloudflare may have blocked the visit')
        return null
      }

      this.token = token
      this.tokenFetchedAt = now
      console.log('[Upwork GQL] Got visitor_gql_token ✓')
      return token
    } catch (err) {
      console.error('[Upwork GQL] Token fetch failed:', (err as Error).message)
      return null
    } finally {
      await session.close()
    }
  }

  async fetchJobs(): Promise<UpworkJob[]> {
    const envToken = process.env.UPWORK_VISITOR_GQL_TOKEN
    const token = envToken || await this.getToken()

    if (!token) {
      console.warn('[Upwork GQL] Skipping — no token available')
      return []
    }

    const seen = new Set<string>()
    const all: UpworkJob[] = []

    for (const q of SEARCH_QUERIES) {
      try {
        const body = {
          operationName: 'GetJobFeed',
          variables: {
            variables: {
              q,
              sort: 'recency',
              paging: { offset: 0, count: 50 },
            },
          },
          query: JOB_SEARCH_QUERY,
        }

        const res = await fetch(GQL_ENDPOINT, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Upwork-API-TenantId': '',
            'Accept': 'application/json',
            'Origin': 'https://www.upwork.com',
            'Referer': 'https://www.upwork.com/nx/find-work/',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(20000),
        })

        if (res.status === 401 || res.status === 403) {
          console.warn('[Upwork GQL] Auth rejected — token expired. Will refresh next cycle.')
          this.token = null
          break
        }

        if (!res.ok) {
          console.error(`[Upwork GQL] HTTP ${res.status} for query "${q}"`)
          continue
        }

        const data = await res.json() as {
          data?: { jobSearch?: { results?: { job: GQLJob }[] } }
          errors?: { message: string }[]
        }

        if (data.errors?.length) {
          console.error('[Upwork GQL] API errors:', data.errors.map(e => e.message).join(', '))
          continue
        }

        const results = data.data?.jobSearch?.results || []

        for (const { job } of results) {
          if (!job.ciphertext) continue
          const id = `upwork-gql-${job.ciphertext}`
          if (seen.has(id)) continue
          seen.add(id)
          const mapped = this.mapJob(id, job)
          if (mapped) all.push(mapped)
        }
      } catch (err) {
        console.error(`[Upwork GQL] Request failed for "${q}":`, (err as Error).message)
      }
    }

    return all
  }

  private mapJob(id: string, job: GQLJob): UpworkJob | null {
    if (!job.title) return null

    const desc = (job.description || '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    let budget: string | undefined
    if (job.budget?.type === 'FIXED' && job.budget.amount) {
      budget = `$${job.budget.amount.toLocaleString()}`
    } else if (job.budget?.type === 'HOURLY' && job.budget.min) {
      budget = `$${job.budget.min}–$${job.budget.max}/hr`
    }

    const proposalMap: Record<string, number> = {
      'LESS_THAN_5': 3, '5_TO_10': 7, '10_TO_15': 12,
      '15_TO_20': 17, '20_TO_50': 35, 'MORE_THAN_50': 55,
    }

    return {
      id,
      title: job.title.trim(),
      description: desc,
      budget,
      type: job.type === 'HOURLY' ? 'Hourly' : 'Fixed',
      skills: (job.skills || []).map(s => s.prettyName),
      location: job.client?.location?.country || 'Remote',
      clientRating: job.client?.totalFeedback,
      clientSpent: job.client?.totalSpent ? `$${(job.client.totalSpent / 100).toFixed(0)}` : undefined,
      clientHired: job.client?.totalHires,
      clientVerified: job.client?.paymentVerificationStatus === 'VERIFIED',
      proposals: job.proposalsTier ? proposalMap[job.proposalsTier] : 0,
      postedAt: job.publishedOn ? new Date(job.publishedOn) : new Date(),
      url: `https://www.upwork.com/jobs/${job.ciphertext}`,
    }
  }
}
