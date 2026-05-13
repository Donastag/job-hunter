import { Job } from '@/types'

interface TelegramMessage {
  id: string
  text: string
  from: {
    id: number
    first_name: string
    username?: string
  }
  date: number
  chat: {
    id: number
    type: string
  }
}

interface TelegramCommand {
  command: string
  description: string
  handler: (args: string[], message: TelegramMessage) => Promise<string>
}

export class TelegramBot {
  private botToken: string | null
  private chatId: string | null
  private webhookUrl: string

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || null
    this.chatId = process.env.TELEGRAM_CHAT_ID || null
    this.webhookUrl = process.env.TELEGRAM_WEBHOOK_URL || ''
  }

  async sendMessage(message: string, options?: { parse_mode?: 'HTML' | 'Markdown' }): Promise<boolean> {
    if (!this.botToken || !this.chatId) {
      console.warn('Telegram bot not configured')
      return false
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: message,
          parse_mode: options?.parse_mode || 'HTML',
          disable_web_page_preview: true
        })
      })

      const result = await response.json()
      return result.ok
    } catch (error) {
      console.error('Error sending Telegram message:', error)
      return false
    }
  }

  async sendJobAlert(job: Job): Promise<boolean> {
    const message = this.formatJobAlert(job)
    return this.sendMessage(message, { parse_mode: 'HTML' })
  }

  async sendPipelineUpdate(job: Job, oldStatus: string, newStatus: string): Promise<boolean> {
    const message = this.formatPipelineUpdate(job, oldStatus, newStatus)
    return this.sendMessage(message, { parse_mode: 'HTML' })
  }

  async sendDailySummary(jobs: Job[]): Promise<boolean> {
    const summary = this.formatDailySummary(jobs)
    return this.sendMessage(summary, { parse_mode: 'HTML' })
  }

  async sendWeeklyReport(jobs: Job[]): Promise<boolean> {
    const report = this.formatWeeklyReport(jobs)
    return this.sendMessage(report, { parse_mode: 'HTML' })
  }

  private formatJobAlert(job: Job): string {
    const emoji = this.getJobEmoji(job.score)
    const budgetInfo = job.budget !== '$0' ? `\n💰 <b>Budget:</b> ${job.budget} (${job.type})` : ''
    const tags = job.tags.length > 0 ? `\n🏷️ <b>Skills:</b> ${job.tags.slice(0, 5).join(', ')}` : ''
    
    return `
${emoji} <b>NEW JOB ALERT</b> ${emoji}

🏢 <b>${job.title}</b>
📍 ${job.company} • ${job.location}
${budgetInfo}
📊 <b>AI Score:</b> ${job.score}/100 (${job.tier.toUpperCase()})

${tags}

📝 <b>Description:</b>
${job.description.substring(0, 200)}...

🔗 <a href="${(job as { url?: string }).url || '#'}">View Job Details</a>

#JobHunter #${job.tier}
    `.trim()
  }

  private formatPipelineUpdate(job: Job, oldStatus: string, newStatus: string): string {
    const statusEmoji = this.getStatusEmoji(newStatus)
    const statusChange = this.getStatusChangeText(oldStatus, newStatus)
    
    return `
${statusEmoji} <b>PIPELINE UPDATE</b> ${statusEmoji}

${statusChange}

🏢 <b>${job.title}</b>
📍 ${job.company}
📊 <b>Score:</b> ${job.score}/100

#JobHunter #${newStatus}
    `.trim()
  }

  private formatDailySummary(jobs: Job[]): string {
    const totalJobs = jobs.length
    const appliedJobs = jobs.filter(j => j.status === 'applied').length
    const interviewJobs = jobs.filter(j => j.status === 'interview').length
    const offerJobs = jobs.filter(j => j.status === 'offer').length
    const rejectedJobs = jobs.filter(j => j.status === 'rejected').length
    
    const avgScore = jobs.length > 0 
      ? Math.round(jobs.reduce((sum, j) => sum + j.score, 0) / jobs.length) 
      : 0

    return `
📈 <b>DAILY JOB SUMMARY</b> 📈

📅 <b>${new Date().toLocaleDateString()}</b>

📊 <b>Statistics:</b>
• Total Jobs: ${totalJobs}
• Applied: ${appliedJobs}
• Interviews: ${interviewJobs}
• Offers: ${offerJobs}
• Rejected: ${rejectedJobs}

🎯 <b>Average Score:</b> ${avgScore}/100

💡 <b>Top Priority Jobs:</b>
${this.getTopPriorityJobs(jobs)}

#JobHunter #DailySummary
    `.trim()
  }

  private formatWeeklyReport(jobs: Job[]): string {
    const totalJobs = jobs.length
    const appliedJobs = jobs.filter(j => j.status === 'applied').length
    const interviewJobs = jobs.filter(j => j.status === 'interview').length
    const offerJobs = jobs.filter(j => j.status === 'offer').length
    const rejectedJobs = jobs.filter(j => j.status === 'rejected').length
    
    const winRate = appliedJobs > 0 ? Math.round((offerJobs / appliedJobs) * 100) : 0
    const avgScore = jobs.length > 0 
      ? Math.round(jobs.reduce((sum, j) => sum + j.score, 0) / jobs.length) 
      : 0

    const topSkills = this.getTopSkills(jobs)
    const topPlatforms = this.getTopPlatforms(jobs)

    return `
📊 <b>WEEKLY JOB REPORT</b> 📊

📅 <b>${new Date().toLocaleDateString()}</b>

🎯 <b>Performance Metrics:</b>
• Total Applications: ${totalJobs}
• Win Rate: ${winRate}%
• Average Score: ${avgScore}/100

📈 <b>Application Funnel:</b>
• Applied: ${appliedJobs}
• Interviews: ${interviewJobs}
• Offers: ${offerJobs}
• Rejected: ${rejectedJobs}

🔥 <b>Top Skills:</b>
${topSkills}

🌐 <b>Top Platforms:</b>
${topPlatforms}

💡 <b>Recommendations:</b>
${this.getRecommendations(jobs)}

#JobHunter #WeeklyReport
    `.trim()
  }

  private getJobEmoji(score: number): string {
    if (score >= 90) return '🚀'
    if (score >= 80) return '⭐'
    if (score >= 70) return '👍'
    if (score >= 60) return '💡'
    return '📝'
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'applied': return '📤'
      case 'interview': return '💬'
      case 'offer': return '🎉'
      case 'rejected': return '❌'
      default: return '📝'
    }
  }

  private getStatusChangeText(oldStatus: string, newStatus: string): string {
    switch (newStatus) {
      case 'applied':
        return '📤 <b>Application Submitted!</b>'
      case 'interview':
        return '💬 <b>Interview Scheduled!</b>'
      case 'offer':
        return '🎉 <b>Job Offer Received!</b>'
      case 'rejected':
        return '❌ <b>Application Rejected</b>'
      default:
        return `📝 <b>Status Updated:</b> ${newStatus}`
    }
  }

  private getTopPriorityJobs(jobs: Job[]): string {
    const priorityJobs = jobs
      .filter(j => j.score >= 80)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    if (priorityJobs.length === 0) {
      return 'No high-priority jobs today.'
    }

    return priorityJobs
      .map(job => `• ${job.title} (${job.score}/100)`)
      .join('\n')
  }

  private getTopSkills(jobs: Job[]): string {
    const skillCount: Record<string, number> = {}
    
    jobs.forEach(job => {
      job.tags.forEach(tag => {
        skillCount[tag] = (skillCount[tag] || 0) + 1
      })
    })

    const topSkills = Object.entries(skillCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)

    if (topSkills.length === 0) {
      return 'No skills tracked this week.'
    }

    return topSkills
      .map(([skill, count]) => `• ${skill}: ${count} jobs`)
      .join('\n')
  }

  private getTopPlatforms(jobs: Job[]): string {
    const platformCount: Record<string, number> = {}
    
    jobs.forEach(job => {
      const platform = this.extractPlatform(job.company)
      platformCount[platform] = (platformCount[platform] || 0) + 1
    })

    const topPlatforms = Object.entries(platformCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)

    if (topPlatforms.length === 0) {
      return 'No platforms tracked this week.'
    }

    return topPlatforms
      .map(([platform, count]) => `• ${platform}: ${count} jobs`)
      .join('\n')
  }

  private getRecommendations(jobs: Job[]): string {
    const appliedJobs = jobs.filter(j => j.status === 'applied')
    const interviewJobs = jobs.filter(j => j.status === 'interview')
    const offerJobs = jobs.filter(j => j.status === 'offer')

    const recommendations: string[] = []

    if (appliedJobs.length > 0 && interviewJobs.length / appliedJobs.length < 0.2) {
      recommendations.push('Focus on improving interview conversion rate')
    }

    if (offerJobs.length === 0 && appliedJobs.length > 0) {
      recommendations.push('Consider targeting higher-quality opportunities')
    }

    if (jobs.some(j => j.score < 50)) {
      recommendations.push('Review and improve job selection criteria')
    }

    if (recommendations.length === 0) {
      recommendations.push('Keep up the great work!')
    }

    return recommendations
      .map(rec => `• ${rec}`)
      .join('\n')
  }

  private extractPlatform(company: string): string {
    if (company.toLowerCase().includes('upwork')) return 'Upwork'
    if (company.toLowerCase().includes('linkedin')) return 'LinkedIn'
    if (company.toLowerCase().includes('indeed')) return 'Indeed'
    if (company.toLowerCase().includes('contrat')) return 'Contrat'
    return 'Other'
  }

  // Interactive commands for Telegram bot
  private commands: TelegramCommand[] = [
    {
      command: '/start',
      description: 'Start the bot and get help',
      handler: async () => this.getHelpMessage()
    },
    {
      command: '/stats',
      description: 'Get current job statistics',
      handler: async () => this.getStatsMessage()
    },
    {
      command: '/priority',
      description: 'Get priority jobs list',
      handler: async () => this.getPriorityJobsMessage()
    },
    {
      command: '/pipeline',
      description: 'Get pipeline status',
      handler: async () => this.getPipelineMessage()
    },
    {
      command: '/help',
      description: 'Get help information',
      handler: async () => this.getHelpMessage()
    }
  ]

  private async getHelpMessage(): Promise<string> {
    return `
🤖 <b>JobHunter Telegram Bot</b>

Available commands:
${this.commands.map(cmd => `• <code>${cmd.command}</code> - ${cmd.description}`).join('\n')}

💡 Tip: Use these commands to get real-time updates on your job search!
    `.trim()
  }

  private async getStatsMessage(): Promise<string> {
    // This would fetch real stats from the database
    return `
📊 <b>Job Search Statistics</b>

• Total Jobs: 156
• Applied: 45
• Interviews: 12
• Offers: 3
• Rejected: 28
• Win Rate: 6.7%
• Average Score: 72/100

📈 Keep applying to improve your numbers!
    `.trim()
  }

  private async getPriorityJobsMessage(): Promise<string> {
    // This would fetch real priority jobs from the database
    return `
🚀 <b>Priority Jobs (Score ≥ 80)</b>

• Senior React Developer - 92/100
• Full-stack Engineer - 88/100
• AI/ML Specialist - 85/100
• DevOps Engineer - 82/100

💡 These jobs have the highest AI scores and best opportunities!
    `.trim()
  }

  private async getPipelineMessage(): Promise<string> {
    // This would fetch real pipeline data from the database
    return `
📋 <b>Application Pipeline</b>

📤 Applied (45)
  • 12 pending response
  • 23 under review
  • 10 scheduled interview

💬 Interviews (12)
  • 8 completed
  • 4 upcoming

🎉 Offers (3)
  • 2 accepted
  • 1 pending decision

❌ Rejected (28)
  • 20 no response
  • 8 after interview

💡 Track your progress and follow up on pending applications!
    `.trim()
  }

  async handleWebhook(update: any): Promise<void> {
    if (!update.message) return

    const message = update.message as TelegramMessage
    const text = message.text?.toLowerCase() || ''

    for (const command of this.commands) {
      if (text.startsWith(command.command)) {
        const args = text.split(' ').slice(1)
        try {
          const response = await command.handler(args, message)
          await this.sendMessage(response, { parse_mode: 'HTML' })
        } catch (error) {
          console.error('Error handling command:', error)
          await this.sendMessage('❌ Error processing command. Please try again.', { parse_mode: 'HTML' })
        }
        break
      }
    }
  }

  async setWebhook(): Promise<boolean> {
    if (!this.botToken || !this.webhookUrl) {
      console.warn('Telegram bot or webhook URL not configured')
      return false
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/setWebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: this.webhookUrl
        })
      })

      const result = await response.json()
      return result.ok
    } catch (error) {
      console.error('Error setting webhook:', error)
      return false
    }
  }

  async removeWebhook(): Promise<boolean> {
    if (!this.botToken) {
      console.warn('Telegram bot not configured')
      return false
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/deleteWebhook`, {
        method: 'POST'
      })

      const result = await response.json()
      return result.ok
    } catch (error) {
      console.error('Error removing webhook:', error)
      return false
    }
  }

  getBotInfo() {
    return {
      configured: !!this.botToken && !!this.chatId,
      botTokenSet: !!this.botToken,
      chatIdSet: !!this.chatId,
      webhookUrl: this.webhookUrl,
      commands: this.commands.map(cmd => ({ command: cmd.command, description: cmd.description }))
    }
  }
}