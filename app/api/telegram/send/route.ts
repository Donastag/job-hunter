import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message } = body

    if (!message) {
      return NextResponse.json({ 
        success: false, 
        error: 'Message is required' 
      }, { status: 400 })
    }

    // In a real application, this would send the message to Telegram
    // For now, we'll just log it and return success
    console.log('Telegram message sent:', message)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Message sent to Telegram successfully' 
    })
  } catch (error) {
    console.error('Error sending Telegram message:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to send message to Telegram' 
    }, { status: 500 })
  }
}