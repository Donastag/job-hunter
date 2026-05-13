// Upwork: disabled — RSS killed (410), scraping blocked by Cloudflare.
// Re-enable via Apify actor (upwork-scraper) once VPS is up.
import { RemoteOKIntegration, type RemoteOKJob } from './remoteok'
import { RemotiveIntegration, type RemotiveJob } from './remotive'
import { WeWorkRemotelyIntegration, type WWRJob } from './weworkremotely'
import { prisma } from '../db'
import { calculateScore } from '../scoring'

export type Platform = 'upwork' | 'remoteok' | 'remotive' | 'weworkremotely'

export interface PlatformJob {
  id: string
  title: string
  description: string
  budget?: string
  type?: string
  skills?: string[]
  clientName?: string
  clientRating?: number
  clientSpent?: string
  clientHired?: number
  clientVerified?: boolean
  company?: string
  location?: string
  postedAt: Date
  url: string
  proposals?: number
  platform: Platform
}

function fromRemoteOK(job: RemoteOKJob): PlatformJob {
  return { ...job, platform: 'remoteok' }
}

function fromRemotive(job: RemotiveJob): PlatformJob {
  return { ...job, platform: 'remotive' }
}

function fromWWR(job: WWRJob): PlatformJob {
  return { ...job, platform: 'weworkremotely' }
}

export class PlatformManager {
  private remoteok = new RemoteOKIntegration()
  private remotive = new RemotiveIntegration()
  private wwr = new WeWorkRemotelyIntegration()

  async fetchAll(): Promise<PlatformJob[]> {
    const [remoteokJobs, remotiveJobs, wwrJobs] = await Promise.allSettled([
      this.remoteok.fetchJobs(),
      this.remotive.fetchJobs(),
      this.wwr.fetchJobs(),
    ])

    const all: PlatformJob[] = []

    if (remoteokJobs.status === 'fulfilled') {
      all.push(...remoteokJobs.value.map(fromRemoteOK))
      console.log(`[Manager] RemoteOK: ${remoteokJobs.value.length} jobs`)
    } else {
      console.error('[Manager] RemoteOK failed:', remoteokJobs.reason)
    }

    if (remotiveJobs.status === 'fulfilled') {
      all.push(...remotiveJobs.value.map(fromRemotive))
      console.log(`[Manager] Remotive: ${remotiveJobs.value.length} jobs`)
    } else {
      console.error('[Manager] Remotive failed:', remotiveJobs.reason)
    }

    if (wwrJobs.status === 'fulfilled') {
      all.push(...wwrJobs.value.map(fromWWR))
      console.log(`[Manager] WeWorkRemotely: ${wwrJobs.value.length} jobs`)
    } else {
      console.error('[Manager] WeWorkRemotely failed:', wwrJobs.reason)
    }

    return all
  }

  async syncToDatabase(): Promise<{ newJobs: number; priorityJobs: PlatformJob[] }> {
    const jobs = await this.fetchAll()
    let newCount = 0
    const priorityJobs: PlatformJob[] = []

    for (const job of jobs) {
      try {
        const existing = await prisma.job.findFirst({
          where: { externalId: job.id },
        })
        if (existing) continue

        const { score, tier } = calculateScore({
          title: job.title,
          description: job.description,
          budget: job.budget || '$0',
          type: job.type,
          skills: job.skills || [],
          clientRating: job.clientRating,
          clientSpent: job.clientSpent,
          clientHired: job.clientHired,
          proposals: job.proposals,
          postedAt: job.postedAt,
        })

        await prisma.job.create({
          data: {
            platform: job.platform,
            externalId: job.id,
            title: job.title,
            description: job.description.slice(0, 5000),
            budget: job.budget,
            type: job.type,
            skills: JSON.stringify(job.skills || []),
            clientName: job.company,
            clientRating: job.clientRating,
            clientSpent: job.clientSpent,
            clientHired: job.clientHired,
            clientVerified: job.clientVerified || false,
            proposals: job.proposals || 0,
            score,
            tier,
            status: 'new',
            postedAt: job.postedAt,
            url: job.url,
          },
        })

        newCount++
        if (tier === 'priority' || tier === 'alert') {
          priorityJobs.push({ ...job })
        }
      } catch (err) {
        console.error(`[Manager] Failed to save job "${job.title}":`, (err as Error).message)
      }
    }

    console.log(`[Manager] Sync done — ${newCount} new jobs, ${priorityJobs.length} priority/alert`)
    return { newJobs: newCount, priorityJobs }
  }
}
