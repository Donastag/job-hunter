import { Job } from '../types'

interface TelegramMessage {
  chatId?: string
  text: string
  parse_mode?: 'HTML' | 'Markdown'
}

export class TelegramBot {
  private botToken: string
  private chatId: string

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || ''
    this.chatId = process.env.TELEGRAM_CHAT_ID || ''
  }

  private async sendMessage(message: TelegramMessage): Promise<boolean> {
    if (!this.botToken || !this.chatId) {
      console.warn('Telegram bot not configured')
      return false
    }

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: message.chatId || this.chatId,
            text: message.text,
            parse_mode: message.parse_mode || 'HTML',
          }),
        }
      )

      const result = await response.json()
      return result.ok
    } catch (error) {
      console.error('Error sending Telegram message:', error)
      return false
    }
  }

  async sendJobNotification(job: Job, action: 'applied' | 'interview' | 'offer' | 'rejected'): Promise<boolean> {
    const emoji = {
      applied: '📝',
      interview: '📅',
      offer: '🎉',
      rejected: '❌'
    }[action]

    const message: TelegramMessage = {
      text: `${emoji} <b>New Job Update</b>\n\n<b>${job.title}</b>\n${job.company} • ${job.location}\n\nStatus: ${action.toUpperCase()}\nDate: ${job.date}\n\n${job.description}`,
      parse_mode: 'HTML'
    }

    return this.sendMessage(message)
  }

  async sendDailySummary(jobs: Job[]): Promise<boolean> {
    const applied = jobs.filter(j => j.status === 'applied').length
    const interviews = jobs.filter(j => j.status === 'interview').length
    const offers = jobs.filter(j => j.status === 'offer').length
    const rejected = jobs.filter(j => j.status === 'rejected').length

    const message: TelegramMessage = {
      text: `📊 <b>Daily Job Summary</b>\n\n📝 Applied: ${applied}\n📅 Interviews: ${interviews}\n🎉 Offers: ${offers}\n❌ Rejected: ${rejected}\n\nTotal Jobs: ${jobs.length}\n\nKeep up the great work! 💪`,
      parse_mode: 'HTML'
    }

    return this.sendMessage(message)
  }

  async sendInterviewReminder(job: Job): Promise<boolean> {
    const message: TelegramMessage = {
      text: `⏰ <b>Interview Reminder</b>\n\nYou have an interview scheduled for:\n\n<b>${job.title}</b>\n${job.company}\n\nDate: ${job.date}\n\nGood luck! 🍀`,
      parse_mode: 'HTML'
    }

    return this.sendMessage(message)
  }

  async sendQuestionResponse(question: string, answer: string): Promise<boolean> {
    const message: TelegramMessage = {
      text: `❓ <b>Question Answered</b>\n\n<b>Q:</b> ${question}\n\n<b>A:</b> ${answer}\n\nNeed more help? Just ask! 💬`,
      parse_mode: 'HTML'
    }

    return this.sendMessage(message)
  }

  async sendJobStatusUpdate(job: Job, oldStatus: string, newStatus: string): Promise<boolean> {
    const message: TelegramMessage = {
      text: `🔄 <b>Job Status Updated</b>\n\n<b>${job.title}</b>\n${job.company} • ${job.location}\n\nStatus: ${oldStatus.toUpperCase()} → ${newStatus.toUpperCase()}\n\nGreat progress! Keep it up! 🎯`,
      parse_mode: 'HTML'
    }

    return this.sendMessage(message)
  }
}

export const telegramBot = new TelegramBot()
