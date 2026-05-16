import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logAnalyticsEvent } from '@/lib/analytics'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { status } = await request.json() as { status: string }

    const invoice = await prisma.invoice.findUnique({ where: { id } })
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

    const updated = await prisma.invoice.update({ where: { id }, data: { status } })

    if (status === 'paid') {
      await logAnalyticsEvent({ wins: 0, revenue: invoice.amount })

      // Auto-create portfolio item from the linked job
      const job = invoice.jobId
        ? await prisma.job.findUnique({ where: { id: invoice.jobId } })
        : null

      await prisma.portfolioItem.create({
        data: {
          title: job?.title || invoice.description || invoice.clientName,
          client: invoice.clientName,
          techStack: job?.skills || '',
          outcome: job?.projectNotes || '',
          revenue: invoice.amount,
          status: 'active',
          completedAt: new Date(),
        },
      })
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PATCH /api/invoices/[id]]', err)
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
  }
}
