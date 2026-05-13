
import { Job } from '@/types'
import { telegramBot } from './telegram'

interface NotificationService {
  sendJobAlert(job: Job): Promise<boolean>
  sendPipelineUpdate(job: Job, oldStatus: string, newStatus: string): Promise<boolean>
  sendDailySummary(jobs: Job[]): Promise<boolean>
  sendWeeklyReport(jobs: Job[]): Promise<boolean>
  sendTemplateGenerated(templateType: string, jobTitle: string): Promise<boolean>
  sendHighPriorityAlert(job: Job): Promise<boolean>
  sendFollowUpReminder(jobs: Job[]): Promise<boolean>
}

export class NotificationManager implements NotificationService {
  private telegram: typeof telegramBot

  constructor() {
    this.telegram = telegramBot
  }

  async sendJobAlert(job: Job): Promise<boolean> {
    console.log('🔔 Sending job alert notification...')
    return this.telegram.sendJobAlert(job)
  }

  async sendPipelineUpdate(job: Job, oldStatus: string, newStatus: string): Promise<boolean> {
    console.log(`🔄 Sending pipeline update: ${oldStatus} → ${newStatus}`)
    const validStatus = newStatus as 'applied' | 'interview' | 'offer' | 'rejected'
    return this.telegram.sendJobNotification(job, validStatus)
  }

  async sendDailySummary(jobs: Job[]): Promise<boolean> {
    console.log('📈 Sending daily summary notification...')
    return this.telegram.sendDailySummary(jobs)
  }

  async sendWeeklyReport(jobs: Job[]): Promise<boolean> {
    console.log('📊 Sending weekly report notification...')
    return this.telegram.sendWeeklyReport(jobs)
  }

  async sendTemplateGenerated(templateType: string, jobTitle: string): Promise<boolean> {
    console.log(`📝 Sending template generated notification for ${templateType}...`)
    return this.telegram.sendTemplateGenerated(templateType, jobTitle)
  }

  async sendHighPriorityAlert(job: Job): Promise<boolean> {
    console.log('🚀 Sending high priority alert...')
    return this.telegram.sendHighPriorityAlert(job)
  }

  async sendFollowUpReminder(jobs: Job[]): Promise<boolean> {
    console.log('⏰ Sending follow-up reminder...')
    return this.telegram.sendPipelineReminder(jobs)
  }

  async sendInterviewReminder(job: Job): Promise<boolean> {
    console.log('⏰ Sending interview reminder...')
    return this.telegram.sendInterviewReminder(job)
  }
}

// Singleton instance
export const notificationManager = new NotificationManager()

// Convenience functions for easy importing
export const sendJobAlert = (job: Job) => notificationManager.sendJobAlert(job)
export const sendPipelineUpdate = (job: Job, oldStatus: string, newStatus: string) => 
  notificationManager.sendPipelineUpdate(job, oldStatus, newStatus)
export const sendDailySummary = (jobs: Job[]) => notificationManager.sendDailySummary(jobs)
export const sendWeeklyReport = (jobs: Job[]) => notificationManager.sendWeeklyReport(jobs)
export const sendTemplateGenerated = (templateType: string, jobTitle: string) => 
  notificationManager.sendTemplateGenerated(templateType, jobTitle)
export const sendHighPriorityAlert = (job: Job) => notificationManager.sendHighPriorityAlert(job)
export const sendFollowUpReminder = (jobs: Job[]) => notificationManager.sendFollowUpReminder(jobs)

// Smart notification triggers
export class SmartNotifications {
  private manager: NotificationManager

  constructor() {
    this.manager = notificationManager
  }

  async handleJobAdded(job: Job): Promise<void> {
    // Send immediate alert for high-priority jobs
    if (job.score >= 80) {
      await this.manager.sendHighPriorityAlert(job)
    } else {
      await this.manager.sendJobAlert(job)
    }
  }

  async handleStatusChange(job: Job, oldStatus: string, newStatus: string): Promise<void> {
    await this.manager.sendPipelineUpdate(job, oldStatus, newStatus)
    
    // Send special notifications for key milestones
    if (newStatus === 'interview') {
      // Schedule interview reminder
      setTimeout(() => {
        this.manager.sendInterviewReminder(job)
      }, 24 * 60 * 60 * 1000) // 24 hours before
    }
    
    if (newStatus === 'offer') {
      // Send celebration message
      await this.manager.sendHighPriorityAlert({
        ...job,
        description: '🎉 Congratulations! You received a job offer! 🎉\n\nReview the offer details and negotiate if needed. This is a great achievement!'
      })
    }
  }

  async handleTemplateGeneration(templateType: string, jobTitle: string): Promise<void> {
    await this.manager.sendTemplateGenerated(templateType, jobTitle)
  }

  async sendScheduledNotifications(jobs: Job[]): Promise<void> {
    // Send daily summary at 6 PM
    const now = new Date()
    if (now.getHours() === 18) {
      await this.manager.sendDailySummary(jobs)
    }

    // Send weekly report on Friday at 5 PM
    if (now.getDay() === 5 && now.getHours() === 17) {
      await this.manager.sendWeeklyReport(jobs)
    }

    // Send follow-up reminders for pending applications
    await this.manager.sendFollowUpReminder(jobs)
  }
}

export const smartNotifications = new SmartNotifications()