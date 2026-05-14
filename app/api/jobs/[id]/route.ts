import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logAnalyticsEvent } from '@/lib/analytics'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, amount } = body as { status: string; amount?: number }

    const job = await prisma.job.findUnique({ where: { id } })
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const updated = await prisma.job.update({ where: { id }, data: { status } })

    if (status === 'applied') {
      await logAnalyticsEvent('proposals')
    }

    if (status === 'replied') {
      await logAnalyticsEvent('responses')
      const existing = await prisma.lead.findFirst({
        where: { notes: { contains: job.id } },
      })
      if (!existing) {
        await prisma.lead.create({
          data: {
            name: job.clientName || job.title,
            source: job.platform,
            stage: 'engaged',
            notes: `Job ID: ${job.id} | ${job.title}`,
            value: 0,
          },
        })
      }
    }

    if (status === 'won') {
      const val = amount ? Number(amount) : 0
      await logAnalyticsEvent({ wins: 1, revenue: val })
      await prisma.invoice.create({
        data: {
          clientName: job.clientName || job.title,
          description: job.title,
          amount: val,
          status: 'draft',
        },
      })
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PATCH /api/jobs/[id]]', err)
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 })
  }
}
