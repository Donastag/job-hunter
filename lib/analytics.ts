import { prisma } from './db'

type SimpleField = 'proposals' | 'responses' | 'jobsSeen'

function todayMidnight() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export async function logAnalyticsEvent(event: SimpleField | { wins: number; revenue: number }) {
  const date = todayMidnight()

  if (typeof event === 'string') {
    await prisma.analytics.upsert({
      where: { date },
      update: { [event]: { increment: 1 } },
      create: { date, [event]: 1 },
    })
  } else {
    await prisma.analytics.upsert({
      where: { date },
      update: {
        wins: { increment: event.wins },
        revenue: { increment: event.revenue },
      },
      create: { date, wins: event.wins, revenue: event.revenue },
    })
  }
}
