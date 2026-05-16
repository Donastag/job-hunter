import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const [jobs, invoices, analytics] = await Promise.all([
      prisma.job.findMany({ select: { status: true, platform: true, skills: true, score: true, budget: true, templateUsed: true } }),
      prisma.invoice.findMany({ select: { status: true, amount: true, createdAt: true } }),
      prisma.analytics.findMany({ orderBy: { date: 'asc' } }),
    ])

    const won    = jobs.filter(j => j.status === 'won')
    const applied = jobs.filter(j => ['applied', 'replied', 'won', 'lost'].includes(j.status))
    const lost   = jobs.filter(j => j.status === 'lost')

    // Win rate
    const totalDecided = won.length + lost.length
    const winRate = totalDecided > 0 ? Math.round((won.length / totalDecided) * 100) : 0

    // Response rate
    const replied = jobs.filter(j => ['replied', 'won', 'lost'].includes(j.status))
    const responseRate = applied.length > 0 ? Math.round((replied.length / applied.length) * 100) : 0

    // Revenue
    const paidInvoices = invoices.filter(i => i.status === 'paid')
    const totalRevenue = paidInvoices.reduce((s, i) => s + i.amount, 0)
    const avgDeal = paidInvoices.length > 0 ? totalRevenue / paidInvoices.length : 0

    // Overdue invoices (sent > 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
    const overdueCount = invoices.filter(i => i.status === 'sent' && new Date(i.createdAt) < sevenDaysAgo).length

    // Active projects (won, not delivered)
    const activeProjects = won.length

    // Win rate by platform
    const platforms: Record<string, { won: number; applied: number }> = {}
    jobs.forEach(j => {
      if (!['applied', 'replied', 'won', 'lost'].includes(j.status)) return
      if (!platforms[j.platform]) platforms[j.platform] = { won: 0, applied: 0 }
      platforms[j.platform].applied++
      if (j.status === 'won') platforms[j.platform].won++
    })
    const byPlatform = Object.entries(platforms)
      .map(([p, d]) => ({ platform: p, won: d.won, applied: d.applied, rate: d.applied > 0 ? Math.round(d.won / d.applied * 100) : 0 }))
      .sort((a, b) => b.rate - a.rate)

    // Top skills from won jobs
    const skillCount: Record<string, number> = {}
    won.forEach(j => {
      try {
        const skills: string[] = JSON.parse(j.skills || '[]')
        skills.forEach(s => { skillCount[s] = (skillCount[s] || 0) + 1 })
      } catch { /* ignore */ }
    })
    const topSkills = Object.entries(skillCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([skill, count]) => ({ skill, count }))

    // Monthly revenue trend (last 3 months from analytics)
    const monthlyRevenue: Record<string, number> = {}
    analytics.forEach(r => {
      const key = new Date(r.date).toISOString().slice(0, 7)
      monthlyRevenue[key] = (monthlyRevenue[key] || 0) + r.revenue
    })

    return NextResponse.json({
      summary: {
        winRate,
        responseRate,
        totalWon: won.length,
        totalApplied: applied.length,
        totalRevenue,
        avgDeal,
        overdueCount,
        activeProjects,
      },
      byPlatform,
      topSkills,
      monthlyRevenue,
    })
  } catch (err) {
    console.error('[GET /api/insights]', err)
    return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 })
  }
}
