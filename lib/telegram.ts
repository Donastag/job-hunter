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

  async sendJobNotification(job: Job, action: string): Promise<boolean> {
    const EMOJI: Record<string, string> = {
      applied: '📤', interview: '💬', offer: '🎉', rejected: '❌',
      new: '🆕', draft: '✏️', archived: '📦',
    }
    const STATUS_TEXT: Record<string, string> = {
      applied: 'Application Submitted!', interview: 'Interview Scheduled!',
      offer: 'Job Offer Received!', rejected: 'Application Rejected',
      new: 'New Job Found', draft: 'Draft Ready', archived: 'Archived',
    }
    const icon = EMOJI[action] || '📋'
    const statusText = STATUS_TEXT[action] || action

    const message: TelegramMessage = {
      text: `${icon} <b>PIPELINE UPDATE</b> ${icon}\n\n${statusText}\n\n🏢 <b>${job.title}</b>\n📍 ${job.company} • ${job.location}\n📊 <b>Score:</b> ${job.score}/100\n\n${job.description.substring(0, 150)}...\n\n#JobHunter #${action}`,
      parse_mode: 'HTML'
    }

    return this.sendMessage(message)
  }

  async sendJobAlert(job: Job): Promise<boolean> {
    const emoji = this.getJobEmoji(job.score)
    
    const message: TelegramMessage = {
      text: `${emoji} <b>NEW JOB ALERT</b> ${emoji}\n\n🏢 <b>${job.title}</b>\n📍 ${job.company} • ${job.location}\n💰 <b>Budget:</b> ${job.budget}\n📊 <b>AI Score:</b> ${job.score}/100 (${job.tier.toUpperCase()})\n\n📝 <b>Description:</b>\n${job.description.substring(0, 200)}...\n\n#JobHunter #${job.tier}`,
      parse_mode: 'HTML'
    }

    return this.sendMessage(message)
  }

  async sendDailySummary(jobs: Job[]): Promise<boolean> {
    const totalJobs = jobs.length
    const appliedJobs = jobs.filter(j => j.status === 'applied').length
    const interviewJobs = jobs.filter(j => j.status === 'interview').length
    const offerJobs = jobs.filter(j => j.status === 'offer').length
    const rejectedJobs = jobs.filter(j => j.status === 'rejected').length
    
    const avgScore = jobs.length > 0 
      ? Math.round(jobs.reduce((sum, j) => sum + j.score, 0) / jobs.length) 
      : 0

    const message: TelegramMessage = {
      text: `📈 <b>DAILY JOB SUMMARY</b> 📈\n\n📅 <b>${new Date().toLocaleDateString()}</b>\n\n📊 <b>Statistics:</b>\n• Total Jobs: ${totalJobs}\n• Applied: ${appliedJobs}\n• Interviews: ${interviewJobs}\n• Offers: ${offerJobs}\n• Rejected: ${rejectedJobs}\n\n🎯 <b>Average Score:</b> ${avgScore}/100\n\n💡 <b>Keep applying to improve your numbers!</b>`,
      parse_mode: 'HTML'
    }

    return this.sendMessage(message)
  }

  async sendWeeklyReport(jobs: Job[]): Promise<boolean> {
    const totalJobs = jobs.length
    const appliedJobs = jobs.filter(j => j.status === 'applied').length
    const interviewJobs = jobs.filter(j => j.status === 'interview').length
    const offerJobs = jobs.filter(j => j.status === 'offer').length
    const rejectedJobs = jobs.filter(j => j.status === 'rejected').length
    
    const winRate = appliedJobs > 0 ? Math.round((offerJobs / appliedJobs) * 100) : 0
    const avgScore = jobs.length > 0 
      ? Math.round(jobs.reduce((sum, j) => sum + j.score, 0) / jobs.length) 
      : 0

    const message: TelegramMessage = {
      text: `📊 <b>WEEKLY JOB REPORT</b> 📊\n\n📅 <b>${new Date().toLocaleDateString()}</b>\n\n🎯 <b>Performance Metrics:</b>\n• Total Applications: ${totalJobs}\n• Win Rate: ${winRate}%\n• Average Score: ${avgScore}/100\n\n📈 <b>Application Funnel:</b>\n• Applied: ${appliedJobs}\n• Interviews: ${interviewJobs}\n• Offers: ${offerJobs}\n• Rejected: ${rejectedJobs}\n\n💡 <b>Keep up the great work!</b>`,
      parse_mode: 'HTML'
    }

    return this.sendMessage(message)
  }

  async sendTemplateGenerated(templateType: string, jobTitle: string): Promise<boolean> {
    const message: TelegramMessage = {
      text: `📝 <b>TEMPLATE GENERATED</b> 📝\n\n✅ Successfully generated ${templateType} for:\n\n<b>${jobTitle}</b>\n\n💡 <b>Pro Tip:</b> Review and customize the template before sending!\n\n#JobHunter #Templates`,
      parse_mode: 'HTML'
    }

    return this.sendMessage(message)
  }

  async sendPipelineReminder(jobs: Job[]): Promise<boolean> {
    const pendingJobs = jobs.filter(j => j.status === 'applied' && j.date && new Date(j.date) < new Date(Date.now() - 3 * 24 * 60 * 60 * 1000))
    
    if (pendingJobs.length === 0) {
      return true
    }

    const message: TelegramMessage = {
      text: `⏰ <b>FOLLOW-UP REMINDER</b> ⏰\n\nYou have ${pendingJobs.length} job application(s) that may need follow-up:\n\n${pendingJobs.slice(0, 3).map(job => `• ${job.title} (${job.company})`).join('\n')}\n\n💡 <b>Tip:</b> Consider sending follow-up messages to show continued interest!\n\n#JobHunter #FollowUp`,
      parse_mode: 'HTML'
    }

    return this.sendMessage(message)
  }

  async sendHighPriorityAlert(job: Job): Promise<boolean> {
    const message: TelegramMessage = {
      text: `🚀 <b>HIGH PRIORITY ALERT</b> 🚀\n\nThis job has an exceptional AI score and high potential!\n\n🏢 <b>${job.title}</b>\n📍 ${job.company} • ${job.location}\n💰 <b>Budget:</b> ${job.budget}\n📊 <b>AI Score:</b> ${job.score}/100 ⭐\n\n📝 <b>Description:</b>\n${job.description.substring(0, 200)}...\n\n💡 <b>Recommendation:</b> Prioritize this application!\n\n#JobHunter #HighPriority`,
      parse_mode: 'HTML'
    }

    return this.sendMessage(message)
  }

  private getJobEmoji(score: number): string {
    if (score >= 90) return '🚀'
    if (score >= 80) return '⭐'
    if (score >= 70) return '👍'
    if (score >= 60) return '💡'
    return '📝'
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
