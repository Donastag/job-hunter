import { NextResponse } from 'next/server'
import { runPipeline } from '@/lib/pipeline'

export async function POST() {
  try {
    const result = await runPipeline()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const msg = (err as Error).message
    if (msg === 'Pipeline already running') {
      return NextResponse.json({ error: msg }, { status: 409 })
    }
    console.error('[/api/jobs/run]', err)
    return NextResponse.json({ error: 'Pipeline failed' }, { status: 500 })
  }
}
