import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const templates = await prisma.template.findMany({
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(
    templates.map(t => ({
      ...t,
      variables: JSON.parse(t.variables || '[]'),
      rate: t.sent > 0 ? `${Math.round((t.wins / t.sent) * 100)}%` : '0%',
    }))
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, category, content, variables } = body as {
      name: string
      category: string
      content: string
      variables: string[]
    }
    const template = await prisma.template.create({
      data: {
        name,
        category,
        content,
        variables: JSON.stringify(variables ?? []),
      },
    })
    return NextResponse.json(template)
  } catch (err) {
    console.error('[POST /api/templates]', err)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}
