import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logAnalyticsEvent } from '@/lib/analytics'
import { generateProjectBrief } from '@/lib/project-brief'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, amount, projectNotes, templateUsed } = body as {
      status?: string
      amount?: number
      projectNotes?: string
      templateUsed?: string
    }

    const job = await prisma.job.findUnique({ where: { id } })
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const updateData: Record<string, unknown> = {}
    if (status !== undefined) updateData.status = status
    if (projectNotes !== undefined) updateData.projectNotes = projectNotes
    if (templateUsed !== undefined) updateData.templateUsed = templateUsed

    const updated = await prisma.job.update({ where: { id }, data: updateData })

    if (status === 'applied') {
      await logAnalyticsEvent('proposals')
      const tplName = templateUsed ?? job.templateUsed
      if (tplName) {
        await prisma.template.updateMany({ where: { name: tplName }, data: { sent: { increment: 1 } } })
      }
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
      const tplName = templateUsed ?? job.templateUsed
      if (tplName) {
        await prisma.template.updateMany({ where: { name: tplName }, data: { wins: { increment: 1 } } })
      }

      // Generate AI project brief (non-blocking)
      generateProjectBrief(job).then(brief => {
        if (brief) {
          prisma.job.update({ where: { id }, data: { projectNotes: brief } }).catch(() => {})
        }
      }).catch(() => {})

      // Create invoice linked to this job
      await prisma.invoice.create({
        data: {
          clientName: job.clientName || job.title,
          description: job.title,
          amount: val,
          status: 'draft',
          jobId: job.id,
        },
      })
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PATCH /api/jobs/[id]]', err)
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 })
  }
}
