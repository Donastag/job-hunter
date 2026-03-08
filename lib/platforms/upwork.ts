import RSSParser from 'rss-parser'

interface UpworkJob {
  id: string
  title: string
  description: string
  budget: string
  skills: string[]
  clientName: string
  clientRating: number
  clientSpent: string
  proposals: number
  postedAt: Date
  url: string
}

class UpworkIntegration {
  private parser: RSSParser
  private rssUrl: string

  constructor() {
    this.parser = new RSSParser()
    this.rssUrl = process.env.UPWORK_RSS_URL || ''
  }

  async fetchJobs(): Promise<UpworkJob[]> {
    if (!this.rssUrl) {
      throw new Error('UPWORK_RSS_URL not configured')
    }

    try {
      const feed = await this.parser.parseURL(this.rssUrl)
      const jobs: UpworkJob[] = []

      for (const item of feed.items) {
        if (!item.link || !item.title) continue

        const job = this.parseJobItem(item)
        if (job) {
          jobs.push(job)
        }
      }

      return jobs
    } catch (error) {
      console.error('Error fetching Upwork jobs:', error)
      throw new Error('Failed to fetch Upwork jobs')
    }
  }

  private parseJobItem(item: any): UpworkJob | null {
    try {
      // Extract budget from description or title
      const budgetMatch = item.description?.match(/\$[\d,]+(?:\.\d{2})?/)
      const budget = budgetMatch ? budgetMatch[0] : 'Not specified'

      // Extract skills from description
      const skillsMatch = item.description?.match(/Skills:\s*([^\n]+)/i)
      const skills = skillsMatch 
        ? skillsMatch[1].split(',').map((s: string) => s.trim())
        : []

      // Extract client info
      const clientMatch = item.description?.match(/Client:\s*([^\n]+)/i)
      const clientName = clientMatch ? clientMatch[1].trim() : 'Not specified'

      // Extract proposals
      const proposalsMatch = item.description?.match(/(\d+)\s+proposals?/i)
      const proposals = proposalsMatch ? parseInt(proposalsMatch[1]) : 0

      return {
        id: item.guid || item.link,
        title: item.title,
        description: item.description || '',
        budget,
        skills,
        clientName,
        clientRating: 0, // Upwork RSS doesn't include rating
        clientSpent: 'Not specified',
        proposals,
        postedAt: new Date(item.pubDate || Date.now()),
        url: item.link
      }
    } catch (error) {
      console.error('Error parsing Upwork job item:', error)
      return null
    }
  }

  async getJobDetails(jobId: string): Promise<UpworkJob | null> {
    // For RSS-based integration, we return the job from the feed
    // In a full API integration, this would fetch detailed job info
    const jobs = await this.fetchJobs()
    return jobs.find(job => job.id === jobId) || null
  }

  static getSearchUrl(searchTerms: string): string {
    const encodedTerms = encodeURIComponent(searchTerms)
    return `https://www.upwork.com/ab/feed/jobs/rss?q=${encodedTerms}`
  }
}

export { UpworkIntegration, type UpworkJob }