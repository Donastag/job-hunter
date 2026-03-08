export interface Job {
  id: string
  title: string
  company: string
  location: string
  status: 'applied' | 'interview' | 'offer' | 'rejected'
  date: string
  description: string
}

export interface User {
  id: string
  name: string
  email: string
  image?: string
}

export interface Notification {
  id: string
  type: 'job_update' | 'interview_reminder' | 'daily_summary' | 'question_response'
  title: string
  message: string
  timestamp: string
  read: boolean
}