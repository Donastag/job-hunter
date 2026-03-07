import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateSampleJobs } from '@/lib/platforms/upwork'
import { calculateScore, generateBrief } from '@/lib/scoring'

export async function POST() {
  try {
    // Generate sample jobs (in production, this would fetch from real APIs)
    const sampleJobs = generateSampleJobs()
    
    let newJobsCount = 0
    let updatedJobsCount = 0
    
    for (const job of sampleJobs) {
      // Check if job already exists
      const existing = await prisma.job.findFirst({
        where: {
          platform: job.platform,
          externalId: job.externalId,
        },
      })
      
      if (!existing) {
        // Create new job
        await prisma.job.create({
          data: {
            platform: job.platform,
            externalId: job.externalId,
            title: job.title,
            description: job.description,
            budget: job.budget,
            type: job.type,
            skills: JSON.stringify(job.skills),
            clientName: job.clientName,
            clientRating: job.clientRating,
            clientSpent: job.clientSpent,
            clientHired: job.clientHired,
            clientVerified: job.clientVerified,
            proposals: job.proposals,
            score: job.score,
            tier: job.tier,
            status: 'new',
            postedAt: job.postedAt,
            brief: job.brief,
            loom: job.loom,
          },
        })
        newJobsCount++
      } else {
        // Update existing job
        await prisma.job.update({
          where: { id: existing.id },
          data: {
            score: job.score,
            tier: job.tier,
            proposals: job.proposals,
          },
        })
        updatedJobsCount++
      }
    }
    
    // Log polling result
    console.log(`Polling complete: ${newJobsCount} new jobs, ${updatedJobsCount} updated`)
    
    return NextResponse.json({
      success: true,
      newJobs: newJobsCount,
      updatedJobs: updatedJobsCount,
      totalJobs: await prisma.job.count(),
    })
  } catch (error) {
    console.error('Error during polling:', error)
    return NextResponse.json({ error: 'Polling failed' }, { status: 500 })
  }
}

// GET endpoint to trigger polling manually
export async function GET() {
  return POST()
}
