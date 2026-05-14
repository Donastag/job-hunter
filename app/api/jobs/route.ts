import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter')
    const platform = searchParams.get('platform')
    
    let where = {}
    
    // Apply filters
    if (filter === 'priority') {
      where = { ...where, score: { gte: 85 } }
    } else if (filter === 'alert') {
      where = { ...where, score: { gte: 75, lt: 85 } }
    } else if (filter === 'draft') {
      where = { ...where, status: 'draft' }
    } else if (filter === 'applied') {
      where = { ...where, status: 'applied' }
    }
    
    if (platform) {
      where = { ...where, platform }
    }
    
    const takeParam = searchParams.get('take')
    const take = takeParam ? Math.min(parseInt(takeParam), 500) : 50

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { score: 'desc' },
      take,
    })

    const now = Date.now()
    const withAge = jobs.map(j => ({
      ...j,
      timeAgo: j.fetchedAt
        ? (() => {
            const d = Math.floor((now - new Date(j.fetchedAt).getTime()) / 86400000)
            return d === 0 ? 'today' : d === 1 ? '1d ago' : `${d}d ago`
          })()
        : '—',
    }))

    return NextResponse.json(withAge)
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const job = await prisma.job.create({
      data: {
        platform: body.platform || 'manual',
        externalId: body.externalId,
        title: body.title,
        description: body.description,
        budget: body.budget,
        type: body.type,
        skills: Array.isArray(body.skills) ? JSON.stringify(body.skills) : body.skills || '[]',
        clientName: body.clientName,
        clientRating: body.clientRating,
        clientSpent: body.clientSpent,
        clientHired: body.clientHired,
        clientVerified: body.clientVerified || false,
        proposals: body.proposals || 0,
        score: body.score || 0,
        tier: body.tier || 'normal',
        status: body.status || 'new',
        postedAt: body.postedAt ? new Date(body.postedAt) : null,
        brief: body.brief,
        loom: body.loom || false,
      },
    })
    
    return NextResponse.json(job)
  } catch (error) {
    console.error('Error creating job:', error)
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }
}
