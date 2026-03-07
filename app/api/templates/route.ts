import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const templates = await prisma.template.findMany({
      orderBy: { wins: 'desc' },
    })
    
    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const template = await prisma.template.create({
      data: {
        name: body.name,
        category: body.category,
        content: body.content,
        variables: Array.isArray(body.variables) ? JSON.stringify(body.variables) : body.variables || '[]',
        wins: body.wins || 0,
        sent: body.sent || 0,
      },
    })
    
    return NextResponse.json(template)
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    
    const template = await prisma.template.update({
      where: { id },
      data: {
        ...data,
        variables: Array.isArray(data.variables) ? JSON.stringify(data.variables) : data.variables,
      },
    })
    
    return NextResponse.json(template)
  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}
