import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const since = new Date()
    since.setDate(since.getDate() - 30)
    since.setHours(0, 0, 0, 0)

    const rows = await prisma.analytics.findMany({
      where: { date: { gte: since } },
      orderBy: { date: 'asc' },
    })

    const totals = rows.reduce(
      (acc, r) => ({
        proposals: acc.proposals + r.proposals,
        responses: acc.responses + r.responses,
        wins: acc.wins + r.wins,
        revenue: acc.revenue + r.revenue,
        jobsSeen: acc.jobsSeen + r.jobsSeen,
      }),
      { proposals: 0, responses: 0, wins: 0, revenue: 0, jobsSeen: 0 }
    )

    const winRate = totals.proposals > 0
      ? Math.round((totals.wins / totals.proposals) * 100)
      : 0

    const responseRate = totals.proposals > 0
      ? Math.round((totals.responses / totals.proposals) * 100)
      : 0

    return NextResponse.json({ ...totals, winRate, responseRate, rows })
  } catch (err) {
    console.error('[GET /api/analytics]', err)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
