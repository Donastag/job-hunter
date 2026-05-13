export interface Job {
  id: string
  title: string
  company: string
  location?: string
  status: string
  date?: string
  description: string
  score: number
  tier: string
  budget: string
  type: string
  posted: string
  proposals: number
  platform?: string
  url?: string | null
  client: {
    rating: number
    spent: string
    hired: number
    verified: boolean
  }
  tags: string[]
  loom: boolean
  brief: string | null
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