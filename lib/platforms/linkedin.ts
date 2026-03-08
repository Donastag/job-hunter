interface LinkedInJob {
  id: string
  title: string
  description: string
  company: string
  location: string
  type: string // Full-time, Part-time, Contract, etc.
  postedAt: Date
  url: string
  applicants: number
}

interface LinkedInJobElement {
  id: string
  title: string
  description?: string
  listedAt?: string
  externalApplyUrl?: string
  companyDetails?: {
    companyName: string
  }
  locationDescription?: string
  employmentType?: string
  numCandidates?: number
  applyMethod?: {
    url?: string
  }
}

class LinkedInIntegration {
  private apiKey: string
  private apiSecret: string

  constructor() {
    this.apiKey = process.env.LINKEDIN_API_KEY || ''
    this.apiSecret = process.env.LINKEDIN_API_SECRET || ''
  }

  async fetchJobs(searchTerms: string, location?: string): Promise<LinkedInJob[]> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('LinkedIn API credentials not configured')
    }

    try {
      // LinkedIn API v2 doesn't have a public job search API
      // This would require LinkedIn Talent Solutions API access
      // For now, we'll simulate the structure
      
      const response = await fetch(
        `https://api.linkedin.com/v2/jobs?q=keywords&keywords=${encodeURIComponent(searchTerms)}${
          location ? `&location=${encodeURIComponent(location)}` : ''
        }`,
        {
          headers: {
            'Authorization': `Bearer ${await this.getAccessToken()}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch LinkedIn jobs')
      }

      const data = await response.json()
      return this.parseJobs(data.elements || [])
    } catch (error) {
      console.error('Error fetching LinkedIn jobs:', error)
      throw new Error('Failed to fetch LinkedIn jobs')
    }
  }

  private async getAccessToken(): Promise<string> {
    // This would implement OAuth 2.0 flow for LinkedIn
    // For now, return a placeholder
    return process.env.LINKEDIN_ACCESS_TOKEN || ''
  }

  private parseJobs(elements: LinkedInJobElement[]): LinkedInJob[] {
    return elements.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description || '',
      company: item.companyDetails?.companyName || 'Unknown',
      location: item.locationDescription || 'Remote',
      type: item.employmentType || 'Full-time',
      postedAt: new Date(item.listedAt || Date.now()),
      url: item.externalApplyUrl || item.applyMethod?.url || '',
      applicants: item.numCandidates || 0
    }))
  }

  async getJobDetails(jobId: string): Promise<LinkedInJob | null> {
    try {
      const response = await fetch(
        `https://api.linkedin.com/v2/jobs/${jobId}`,
        {
          headers: {
            'Authorization': `Bearer ${await this.getAccessToken()}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      )

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      const jobs = this.parseJobs([data])
      return jobs[0] || null
    } catch (error) {
      console.error('Error fetching LinkedIn job details:', error)
      return null
    }
  }
}

export { LinkedInIntegration, type LinkedInJob }