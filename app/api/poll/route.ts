import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { UpworkIntegration } from '@/lib/platforms/upwork'

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

// Helper function to generate sample jobs for testing
function generateSampleJobs() {
  const now = new Date()
  return [
    {
      platform: 'upwork',
      externalId: 'job-001',
      title: 'React Developer Needed for E-commerce Site',
      description: 'Looking for a React developer to build a modern e-commerce website with product catalog, shopping cart, and checkout flow.',
      budget: '$5000',
      type: 'fixed',
      skills: ['React', 'JavaScript', 'CSS', 'REST API'],
      clientName: 'Tech Startup Inc',
      clientRating: 4.8,
      clientSpent: '$15,000',
      clientHired: 12,
      clientVerified: true,
      proposals: 25,
      score: 85,
      tier: 'priority',
      status: 'new',
      postedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      brief: 'Build a responsive React e-commerce site',
      loom: false,
    },
    {
      platform: 'upwork',
      externalId: 'job-002',
      title: 'Node.js Backend Developer for API Development',
      description: 'Need experienced Node.js developer to create RESTful APIs for mobile application backend.',
      budget: '$3000',
      type: 'fixed',
      skills: ['Node.js', 'Express', 'MongoDB', 'REST API'],
      clientName: 'Mobile App Company',
      clientRating: 4.5,
      clientSpent: '$8,000',
      clientHired: 8,
      clientVerified: true,
      proposals: 18,
      score: 75,
      tier: 'normal',
      status: 'new',
      postedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
      brief: 'Develop scalable Node.js APIs',
      loom: true,
    },
    {
      platform: 'upwork',
      externalId: 'job-003',
      title: 'Full Stack Developer for SaaS Platform',
      description: 'Seeking full stack developer to help build a SaaS platform using modern technologies.',
      budget: '$8000',
      type: 'fixed',
      skills: ['React', 'Node.js', 'PostgreSQL', 'AWS'],
      clientName: 'SaaS Startup',
      clientRating: 4.9,
      clientSpent: '$25,000',
      clientHired: 15,
      clientVerified: true,
      proposals: 32,
      score: 92,
      tier: 'alert',
      status: 'new',
      postedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
      brief: 'Build complete SaaS platform',
      loom: false,
    }
  ]
}

// GET endpoint to trigger polling manually
export async function GET() {
  return POST()
}
