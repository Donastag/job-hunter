import { NextRequest, NextResponse } from 'next/server'
import { addMessage, getMessages } from '@/lib/chat'
import { prisma } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params
    const afterParam = req.nextUrl.searchParams.get('after')
    const after = afterParam ? new Date(afterParam) : undefined
    const messages = await getMessages(sessionId, after)
    return NextResponse.json({ messages })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params
    const { message, sender, senderName } = await req.json()

    if (!message?.trim() || !sender) {
      return NextResponse.json({ error: 'message and sender required' }, { status: 400 })
    }

    const session = await prisma.chatSession.findUnique({ where: { id: sessionId } })
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const msg = await addMessage(sessionId, sender, message.trim())

    // Telegram notification for visitor messages only
    if (sender === 'visitor') {
      notifyTelegram(session.appName, senderName || session.visitorName || 'Visitor', message.trim(), sessionId).catch(() => {})
    }

    return NextResponse.json({ message: msg })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

async function notifyTelegram(appName: string, visitorName: string, message: string, sessionId: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  const preview = message.length > 200 ? message.slice(0, 200) + '…' : message
  const ccUrl = `http://100.119.35.90:4200/chat/${sessionId}`
  const text = `💬 *New chat on ${appName}*\nFrom: ${visitorName}\n\n_${preview}_\n\n[Reply in Command Centre](${ccUrl})`

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  })
}
