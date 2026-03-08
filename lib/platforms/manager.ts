import { UpworkIntegration, type UpworkJob } from './upwork'
import { LinkedInIntegration, type LinkedInJob } from './linkedin'
import { prisma } from '../db'
import { Job } from '@prisma/client'

interface PlatformJob {
  id: string
  title: string
  description: string
  budget?: string
  skills?: string[]
  clientName?: string
  clientRating?: number
  clientSpent?: string
  company?: string
  location?: string
  type?: string
  postedAt: Date
  url: string
  proposals?: number
  applicants?: number
  platform: 'upwork' | 'linkedin'
}

class PlatformManager {
  private upwork: UpworkIntegration
  private linkedin: LinkedInIntegration

  constructor() {
    this.upwork = new UpworkIntegration()
    this.linkedin = new LinkedInIntegration()
  }

  async fetchJobsFromAllPlatforms(searchTerms: string): Promise<PlatformJob[]> {
    const allJobs: PlatformJob[] = []
    
    try {
      // Fetch from Upwork
      if (process.env.UPWORK_RSS_URL) {
        const upworkJobs = await this.upwork.fetchJobs()
        const platformJobs = upworkJobs.map(job => ({
          ...job,
          platform: 'upwork' as const
        }))
        allJobs.push(...platformJobs)
      }
    } catch (error) {
      console.error('Error fetching Upwork jobs:', error)
    }

    try {
      // Fetch from LinkedIn
      if (process.env.LINKEDIN_API_KEY && process.env.LINKEDIN_API_SECRET) {
        const linkedinJobs = await this.linkedin.fetchJobs(searchTerms)
        const platformJobs = linkedinJobs.map(job => ({
          ...job,
          platform: 'linkedin' as const
        }))
        allJobs.push(...platformJobs)
      }
    } catch (error) {
      console.error('Error fetching LinkedIn jobs:', error)
    }

    return allJobs
  }

  async syncJobsToDatabase(searchTerms: string): Promise<number> {
    const jobs = await this.fetchJobsFromAllPlatforms(searchTerms)
    let syncedCount = 0

    for (const job of jobs) {
      try {
        // Check if job already exists
        const existingJob = await prisma.job.findFirst({
          where: {
            externalId: job.id,
            OR: [
              { platform: 'upwork' },
              { platform: 'linkedin' }
            ]
          }
        })

        if (!existingJob) {
          // Create new job
          await prisma.job.create({
            data: {
              platform: job.platform === 'upwork' ? 'upwork' : 'linkedin',
              externalId: job.id,
              title: job.title,
              description: job.description,
              budget: job.budget || undefined,
              type: job.type || undefined,
              skills: JSON.stringify(job.skills || []),
              clientName: job.clientName || undefined,
              clientRating: job.clientRating || undefined,
              clientSpent: job.clientSpent || undefined,
              proposals: job.proposals || 0,
              postedAt: job.postedAt,
              url: job.url
            }
          })
          syncedCount++
        }
      } catch (error) {
        console.error('Error syncing job to database:', error)
      }
    }

    return syncedCount
  }

  async getJobDetails(platform: string, jobId: string): Promise<PlatformJob | null> {
    try {
      if (platform === 'upwork') {
        const job = await this.upwork.getJobDetails(jobId)
        return job ? { ...job, platform: 'upwork' } : null
      } else if (platform === 'linkedin') {
        const job = await this.linkedin.getJobDetails(jobId)
        return job ? { ...job, platform: 'linkedin' } : null
      }
      return null
    } catch (error) {
      console.error('Error fetching job details:', error)
      return null
    }
  }

  async searchJobs(searchTerms: string, filters?: {
    platform?: string[]
    type?: string[]
    minBudget?: number
    maxBudget?: number
  }): Promise<PlatformJob[]> {
    const jobs = await this.fetchJobsFromAllPlatforms(searchTerms)
    
    return jobs.filter(job => {
      // Apply platform filter
      if (filters?.platform && !filters.platform.includes(job.platform)) {
        return false
      }

      // Apply type filter
      if (filters?.type && !filters.type.includes(job.type || '')) {
        return false
      }

      // Apply budget filters
      if (filters?.minBudget || filters?.maxBudget) {
        const budget = this.parseBudget(job.budget || '')
        if (filters.minBudget && budget < filters.minBudget) {
          return false
        }
        if (filters.maxBudget && budget > filters.maxBudget) {
          return false
        }
      }

      return true
    })
  }

  private parseBudget(budgetStr: string): number {
    const match = budgetStr.match(/\$?([\d,]+(?:\.\d{2})?)/)
    if (match) {
      return parseFloat(match[1].replace(',', ''))
    }
    return 0
  }

  async getPlatformStats(): Promise<{
    upwork: { totalJobs: number; lastSync: Date | null }
    linkedin: { totalJobs: number; lastSync: Date | null }
  }> {
    const upworkJobs = await prisma.job.count({
      where: { platform: 'upwork' }
    })
    
    const linkedinJobs = await prisma.job.count({
      where: { platform: 'linkedin' }
    })

    const upworkLastSync = await prisma.job.findFirst({
      where: { platform: 'upwork' },
      orderBy: { fetchedAt: 'desc' }
    })

    const linkedinLastSync = await prisma.job.findFirst({
      where: { platform: 'linkedin' },
      orderBy: { fetchedAt: 'desc' }
    })

    return {
      upwork: {
        totalJobs: upworkJobs,
        lastSync: upworkLastSync?.fetchedAt || null
      },
      linkedin: {
        totalJobs: linkedinJobs,
        lastSync: linkedinLastSync?.fetchedAt || null
      }
    }
  }
}

export { PlatformManager, type PlatformJob }