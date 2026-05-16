import { prisma } from './db'

export async function getOrCreateSession(
  sessionId: string | null,
  appName: string,
  visitorName?: string,
  visitorEmail?: string,
) {
  if (sessionId) {
    const existing = await prisma.chatSession.findUnique({ where: { id: sessionId } })
    if (existing) return existing
  }

  return prisma.chatSession.create({
    data: { appName, visitorName, visitorEmail },
  })
}

export async function addMessage(sessionId: string, sender: string, message: string) {
  const [msg] = await Promise.all([
    prisma.chatMessage.create({
      data: { sessionId, sender, message },
    }),
    prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    }),
  ])
  return msg
}

export async function getMessages(sessionId: string, after?: Date) {
  return prisma.chatMessage.findMany({
    where: {
      sessionId,
      ...(after ? { createdAt: { gt: after } } : {}),
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getOpenSessions() {
  return prisma.chatSession.findMany({
    where: { status: 'open' },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function closeSession(sessionId: string) {
  return prisma.chatSession.update({
    where: { id: sessionId },
    data: { status: 'closed' },
  })
}
