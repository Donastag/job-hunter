import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
    })
    
    // Group by stage
    const stages = {
      contacted: leads.filter(l => l.stage === 'contacted'),
      engaged: leads.filter(l => l.stage === 'engaged'),
      call_booked: leads.filter(l => l.stage === 'call_booked'),
      negotiating: leads.filter(l => l.stage === 'negotiating'),
      won: leads.filter(l => l.stage === 'won'),
    }
    
    return NextResponse.json(stages)
  } catch (error) {
    console.error('Error fetching pipeline:', error)
    return NextResponse.json({ error: 'Failed to fetch pipeline' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const lead = await prisma.lead.create({
      data: {
        name: body.name,
        email: body.email,
        company: body.company,
        source: body.source || 'manual',
        value: body.value || 0,
        stage: body.stage || 'contacted',
        notes: body.notes,
      },
    })
    
    return NextResponse.json(lead)
  } catch (error) {
    console.error('Error creating lead:', error)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, stage, ...data } = body
    
    const lead = await prisma.lead.update({
      where: { id },
      data: {
        ...data,
        stage,
        age: 0, // Reset age when moving stages
      },
    })
    
    return NextResponse.json(lead)
  } catch (error) {
    console.error('Error updating lead:', error)
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }
}
