import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateSession } from '@/lib/chat'

export async function POST(req: NextRequest) {
  try {
    const { sessionId, appName, visitorName, visitorEmail } = await req.json()
    const session = await getOrCreateSession(
      sessionId ?? null,
      appName || 'unknown',
      visitorName,
      visitorEmail,
    )
    return NextResponse.json({ sessionId: session.id, status: session.status })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
