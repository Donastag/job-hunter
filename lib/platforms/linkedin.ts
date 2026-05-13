import { Job } from '@/types'

// Mock implementations to avoid external dependencies
interface MockAxiosResponse {
  data: string
  status: number
  statusText: string
}

interface MockAxiosConfig {
  headers?: Record<string, string>
  timeout?: number
}

const axios = {
  get: async (url: string, config?: MockAxiosConfig): Promise<MockAxiosResponse> => {
    // Mock HTTP client
    return { data: '', status: 200, statusText: 'OK' }
  }
}

export class LinkedInPlatform {
  private apiEndpoint: string
  private apiKey: string | null

  constructor() {
    this.apiEndpoint = 'https://api.linkedin.com/v2/jobs'
    this.apiKey = process.env.LINKEDIN_API_KEY || null
  }

  async fetchJobs(): Promise<Job[]> {
    if (!this.apiKey) {
      console.warn('LinkedIn API key not configured, returning mock jobs')
      return this.generateMockJobs()
    }

    try {
      const response = await axios.get(`${this.apiEndpoint}?q=jobs&start=0&count=25`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'User-Agent': 'JobHunter/1.0'
        },
        timeout: 10000
      })

      // Parse LinkedIn API response
      const data = JSON.parse(response.data)
      const jobs = data.elements || []
      
      return jobs.map((job: any) => this.parseLinkedInJob(job))
    } catch (error) {
      console.error('Error fetching LinkedIn jobs:', error)
      return this.generateMockJobs()
    }
  }

  private parseLinkedInJob(job: Record<string, any>): Job {
    // Extract job details from LinkedIn API response
    const title = job.title || 'Untitled Job'
    const company = job.companyDetails?.companyName || 'Unknown Company'
    const location = job.location || 'Remote'
    const description = job.description?.text || ''
    const postedAt = job.listedAt || Date.now()
    const jobUrl = job.jobPostingUrl || '#'
    
    // Extract salary information
    const salary = job.salaryDescription || '$0'
    const budget = this.parseSalary(salary)
    
    // Extract job type
    const jobType = job.employmentType || 'Full-time'
    
    // Extract skills/requirements
    const skills = job.skills || []
    const tags = skills.map((skill: Record<string, string>) => skill.name || skill).slice(0, 10)
    
    // Extract company details
    const companySize = job.companyDetails?.companySize || 'Unknown'
    const companyType = job.companyDetails?.companyType || 'Unknown'
    
    // Calculate posting time
    const posted = this.formatPostingTime(postedAt)
    
    // Generate unique ID
    const id = job.id || `linkedin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    return {
      id,
      title,
      company,
      location,
      status: 'new',
      date: new Date(postedAt).toISOString(),
      description: this.cleanDescription(description),
      score: 0, // Will be calculated later
      tier: 'normal',
      budget,
      type: jobType,
      posted,
      proposals: 0, // LinkedIn doesn't provide proposal count
      client: {
        rating: 0, // LinkedIn doesn't provide client ratings
        spent: '$0',
        hired: 0,
        verified: false
      },
      tags,
      loom: false,
      brief: this.generateBrief(title, description, tags, budget, jobType, company, companySize, companyType)
    }
  }

  private parseSalary(salary: string): string {
    if (!salary || salary === '$0') return '$0'
    
    // Extract numeric value from salary string
    const match = salary.match(/\$(\d+(?:,\d{3})*(?:\.\d+)?)/)
    if (match) {
      const amount = parseFloat(match[1].replace(',', ''))
      return `$${amount.toLocaleString()}`
    }
    
    return salary
  }

  private formatPostingTime(postedAt: number | string): string {
    try {
      const date = new Date(postedAt)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffMins < 60) {
        return `${diffMins} min ago`
      } else if (diffHours < 24) {
        return `${diffHours} hr ago`
      } else if (diffDays < 7) {
        return `${diffDays} day ago`
      } else {
        return `${Math.floor(diffDays / 7)} week ago`
      }
    } catch {
      return 'Unknown'
    }
  }

  private cleanDescription(description: string): string {
    if (!description) return ''
    
    // Remove HTML tags and clean up
    let clean = description.replace(/<[^>]*>/g, '')
    clean = clean.replace(/\s+/g, ' ')
    clean = clean.trim()
    return clean
  }

  private generateBrief(
    title: string, 
    description: string, 
    tags: string[], 
    budget: string, 
    type: string,
    company: string,
    companySize: string,
    companyType: string
  ): string {
    const brief = `
Job: ${title}
Company: ${company} (${companySize} - ${companyType})
Budget: ${budget} (${type})
Skills: ${tags.join(', ')}
Description: ${description.substring(0, 200)}...
    `.trim()

    return brief
  }

  private generateMockJobs(): Job[] {
    const mockJobs: Job[] = [
      {
        id: 'linkedin-mock-1',
        title: 'Senior Software Engineer',
        company: 'TechCorp Inc',
        location: 'San Francisco, CA',
        status: 'new',
        date: new Date().toISOString(),
        description: 'We are looking for a Senior Software Engineer to join our growing team. You will be responsible for developing and maintaining our web applications using modern technologies.',
        score: 0,
        tier: 'normal',
        budget: '$120,000/year',
        type: 'Full-time',
        posted: '2 hr ago',
        proposals: 0,
        client: {
          rating: 4.8,
          spent: '$0',
          hired: 0,
          verified: true
        },
        tags: ['JavaScript', 'React', 'Node.js', 'TypeScript'],
        loom: false,
        brief: 'Senior Software Engineer at TechCorp Inc - $120,000/year'
      },
      {
        id: 'linkedin-mock-2',
        title: 'Frontend Developer',
        company: 'StartupXYZ',
        location: 'New York, NY',
        status: 'new',
        date: new Date().toISOString(),
        description: 'Join our innovative team as a Frontend Developer. You will work on creating beautiful and functional user interfaces for our web applications.',
        score: 0,
        tier: 'normal',
        budget: '$85,000/year',
        type: 'Full-time',
        posted: '1 day ago',
        proposals: 0,
        client: {
          rating: 4.5,
          spent: '$0',
          hired: 0,
          verified: true
        },
        tags: ['React', 'Vue.js', 'CSS', 'HTML'],
        loom: false,
        brief: 'Frontend Developer at StartupXYZ - $85,000/year'
      }
    ]

    return mockJobs
  }

  async getJobDetails(jobId: string): Promise<any> {
    if (!this.apiKey) {
      return null
    }

    try {
      const response = await axios.get(`${this.apiEndpoint}/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'User-Agent': 'JobHunter/1.0'
        },
        timeout: 10000
      })

      return JSON.parse(response.data)
    } catch (error) {
      console.error('Error fetching LinkedIn job details:', error)
      return null
    }
  }

  async searchJobs(query: string, filters: Record<string, unknown> = {}): Promise<Job[]> {
    if (!this.apiKey) {
      return this.generateMockJobs()
    }

    try {
      const params = new URLSearchParams({
        q: 'jobs',
        keywords: query,
        start: '0',
        count: '25'
      })

      // Add filters
      if (filters.location) {
        params.append('location', filters.location as string)
      }
      if (filters.type) {
        params.append('employmentType', filters.type as string)
      }
      if (filters.experience) {
        params.append('experienceLevel', filters.experience as string)
      }

      const response = await axios.get(`${this.apiEndpoint}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'User-Agent': 'JobHunter/1.0'
        },
        timeout: 10000
      })

      const data = JSON.parse(response.data)
      const jobs = data.elements || []
      
      return jobs.map((job: any) => this.parseLinkedInJob(job))
    } catch (error) {
      console.error('Error searching LinkedIn jobs:', error)
      return this.generateMockJobs()
    }
  }

  getPlatformInfo() {
    return {
      name: 'LinkedIn',
      url: 'https://www.linkedin.com/jobs',
      type: 'Professional Network',
      lastUpdated: new Date().toISOString(),
      jobsIndexed: 0,
      apiKeyConfigured: !!this.apiKey
    }
  }
}