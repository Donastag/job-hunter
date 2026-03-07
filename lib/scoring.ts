// Job Scoring Algorithm
// Scores jobs based on multiple factors to determine priority

interface JobData {
  title: string
  description: string
  budget: string
  type?: string | null
  skills: string[]
  clientRating?: number | null
  clientSpent?: string | null
  clientHired?: number | null
  proposals?: number
  postedAt?: Date | null
}

// Weight configuration
const WEIGHTS = {
  budget: 0.30,      // 30% - Higher budget = higher score
  skills: 0.25,      // 25% - Match with your profile
  clientQuality: 0.20, // 20% - Rating, spend, hire count
  urgency: 0.15,     // 15% - Fresh posts score higher
  competition: 0.10, // 10% - Fewer proposals = higher score
}

// Your target skills (can be configured per user)
const TARGET_SKILLS = [
  'n8n', 'OpenAI', 'Python', 'TypeScript', 'Next.js', 'React',
  'Node.js', 'API', 'AWS', 'AI', 'automation', 'SaaS',
  'Stripe', 'LangChain', 'RAG', 'chatbot'
]

export function calculateScore(job: JobData): { score: number; tier: string } {
  let totalScore = 0

  // 1. Budget Score (0-100)
  const budgetScore = calculateBudgetScore(job.budget, job.type)
  totalScore += budgetScore * WEIGHTS.budget

  // 2. Skills Match Score (0-100)
  const skillsScore = calculateSkillsScore(job.skills, job.title + ' ' + (job.description || ''))
  totalScore += skillsScore * WEIGHTS.skills

  // 3. Client Quality Score (0-100)
  const clientScore = calculateClientScore(
    job.clientRating,
    job.clientSpent,
    job.clientHired
  )
  totalScore += clientScore * WEIGHTS.clientQuality

  // 4. Urgency Score (0-100)
  const urgencyScore = calculateUrgencyScore(job.postedAt)
  totalScore += urgencyScore * WEIGHTS.urgency

  // 5. Competition Score (0-100)
  const competitionScore = calculateCompetitionScore(job.proposals || 0)
  totalScore += competitionScore * WEIGHTS.competition

  // Round to integer
  const finalScore = Math.round(Math.min(100, Math.max(0, totalScore)))

  // Determine tier
  let tier = 'normal'
  if (finalScore >= 85) tier = 'priority'
  else if (finalScore >= 75) tier = 'alert'

  return { score: finalScore, tier }
}

function calculateBudgetScore(budget: string, type?: string | null): number {
  if (!budget) return 50 // Default mid score

  // Extract numeric value from budget string like "$4,500" or "$85/hr"
  const numericMatch = budget.replace(/[^0-9.]/g, '')
  const value = parseFloat(numericMatch)

  if (isNaN(value)) return 50

  // Fixed price jobs
  if (type === 'Fixed' || budget.includes('$') && !budget.includes('/hr')) {
    if (value >= 5000) return 100
    if (value >= 3000) return 85
    if (value >= 2000) return 70
    if (value >= 1000) return 55
    if (value >= 500) return 40
    return 25
  }

  // Hourly jobs
  if (type === 'Hourly' || budget.includes('/hr')) {
    if (value >= 150) return 100
    if (value >= 100) return 80
    if (value >= 75) return 60
    if (value >= 50) return 40
    return 20
  }

  return 50
}

function calculateSkillsScore(skills: string[], text: string): number {
  if (!skills || skills.length === 0) {
    // Try to extract skills from text
    const textLower = text.toLowerCase()
    const matchedSkills = TARGET_SKILLS.filter(skill =>
      textLower.includes(skill.toLowerCase())
    )
    if (matchedSkills.length === 0) return 30
    return Math.min(100, matchedSkills.length * 20)
  }

  const skillsLower = skills.map(s => s.toLowerCase())
  const textLower = text.toLowerCase()

  // Count matching skills
  let matchCount = 0
  for (const skill of TARGET_SKILLS) {
    if (skillsLower.includes(skill.toLowerCase()) || textLower.includes(skill.toLowerCase())) {
      matchCount++
    }
  }

  // Score based on matches
  if (matchCount >= 4) return 100
  if (matchCount >= 3) return 80
  if (matchCount >= 2) return 60
  if (matchCount >= 1) return 40
  return 20
}

function calculateClientScore(
  rating?: number | null,
  spent?: string | null,
  hired?: number | null
): number {
  let score = 50 // Base score

  // Rating factor (0-30 points)
  if (rating) {
    if (rating >= 4.9) score += 30
    else if (rating >= 4.7) score += 25
    else if (rating >= 4.5) score += 20
    else if (rating >= 4.0) score += 10
    else if (rating >= 3.0) score -= 10
  }

  // Spent factor (0-40 points)
  if (spent) {
    const spentValue = parseSpentValue(spent)
    if (spentValue >= 100000) score += 40
    else if (spentValue >= 50000) score += 35
    else if (spentValue >= 25000) score += 25
    else if (spentValue >= 10000) score += 15
    else if (spentValue >= 5000) score += 5
  }

  // Hired factor (0-30 points)
  if (hired) {
    if (hired >= 50) score += 30
    else if (hired >= 25) score += 25
    else if (hired >= 10) score += 15
    else if (hired >= 5) score += 5
  }

  return Math.min(100, Math.max(0, score))
}

function parseSpentValue(spent: string): number {
  // Parse strings like "$87k", "$12k", "$1.2M"
  const cleaned = spent.replace(/[^0-9.kKmM]/g, '').toLowerCase()
  
  if (cleaned.includes('m')) {
    return parseFloat(cleaned) * 1000000
  }
  if (cleaned.includes('k')) {
    return parseFloat(cleaned) * 1000
  }
  return parseFloat(cleaned) || 0
}

function calculateUrgencyScore(postedAt?: Date | null): number {
  if (!postedAt) return 50 // Default if unknown

  const now = new Date()
  const diffMs = now.getTime() - postedAt.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  // Fresh posts get higher scores
  if (diffMinutes <= 30) return 100
  if (diffMinutes <= 60) return 90
  if (diffMinutes <= 120) return 75
  if (diffMinutes <= 240) return 60
  if (diffMinutes <= 480) return 45
  if (diffMinutes <= 1440) return 30 // 24 hours
  if (diffMinutes <= 2880) return 15 // 48 hours
  return 5 // Older than 48 hours
}

function calculateCompetitionScore(proposals: number): number {
  // Fewer proposals = higher score
  if (proposals === 0) return 100
  if (proposals <= 2) return 90
  if (proposals <= 5) return 70
  if (proposals <= 10) return 50
  if (proposals <= 20) return 30
  if (proposals <= 30) return 15
  return 5
}

// Generate AI brief for a job
export function generateBrief(job: JobData): string {
  const { score, tier } = calculateScore(job)
  
  let brief = `AI Score: ${score}/100 (${tier.toUpperCase()})\n\n`
  
  // Budget analysis
  if (job.budget) {
    brief += `💰 Budget: ${job.budget} (${job.type || 'Fixed'})\n`
  }
  
  // Skills analysis
  if (job.skills && job.skills.length > 0) {
    const matchedSkills = job.skills.filter(s => 
      TARGET_SKILLS.some(ts => ts.toLowerCase() === s.toLowerCase())
    )
    if (matchedSkills.length > 0) {
      brief += `✅ Matched skills: ${matchedSkills.join(', ')}\n`
    }
  }
  
  // Client analysis
  if (job.clientRating) {
    brief += `⭐ Client rating: ${job.clientRating}`
    if (job.clientSpent) brief += ` · Spent: ${job.clientSpent}`
    if (job.clientHired) brief += ` · Hired: ${job.clientHired} freelancers`
    brief += '\n'
  }
  
  // Competition
  if (job.proposals !== undefined) {
    brief += `📊 Competition: ${job.proposals} proposals`
    if (job.proposals <= 5) brief += ' (LOW - good opportunity!)'
    else if (job.proposals >= 20) brief += ' (HIGH - competitive)'
    brief += '\n'
  }
  
  return brief
}
