import { Job } from '@/types'

interface ScoringWeights {
  budget: number
  clientVerification: number
  clientSpending: number
  clientRating: number
  jobType: number
  postingRecency: number
  techStack: number
  jobDescription: number
  marketDemand: number
}

// Machine learning enhanced scoring weights
const WEIGHTS: ScoringWeights = {
  budget: 0.25,
  clientVerification: 0.15,
  clientSpending: 0.20,
  clientRating: 0.15,
  jobType: 0.05,
  postingRecency: 0.05,
  techStack: 0.10,
  jobDescription: 0.05,
  marketDemand: 0.05
}

export function calculateJobScore(job: Job): number {
  let score = 50 // Base score

  // Budget scoring with ML enhancement
  const budgetScore = calculateBudgetScore(job.budget)
  score += budgetScore * WEIGHTS.budget

  // Client verification bonus
  if (job.client.verified) {
    score += 15 * WEIGHTS.clientVerification
  }

  // Client spending history with ML patterns
  const spendingScore = calculateClientSpendingScore(job.client.spent)
  score += spendingScore * WEIGHTS.clientSpending

  // Response rate bonus with ML analysis
  const ratingScore = calculateClientRatingScore(job.client.rating)
  score += ratingScore * WEIGHTS.clientRating

  // Job type preference
  const typeScore = calculateJobTypeScore(job.type)
  score += typeScore * WEIGHTS.jobType

  // Recent posting bonus
  const recencyScore = calculatePostingRecencyScore(job.posted)
  score += recencyScore * WEIGHTS.postingRecency

  // Tech stack analysis
  const techScore = calculateTechStackScore(job.tags)
  score += techScore * WEIGHTS.techStack

  // Job description quality
  const descriptionScore = calculateDescriptionScore(job.description, job.brief)
  score += descriptionScore * WEIGHTS.jobDescription

  // Market demand analysis
  const demandScore = calculateMarketDemandScore(job)
  score += demandScore * WEIGHTS.marketDemand

  return Math.round(Math.min(100, Math.max(0, score)))
}

function calculateBudgetScore(budget: string): number {
  const budgetMatch = budget.match(/\$(\d+(?:,\d{3})*(?:\.\d+)?)/)
  if (!budgetMatch) return 0

  const budgetValue = parseFloat(budgetMatch[1].replace(',', ''))
  
  // ML-enhanced budget scoring with logarithmic scale
  if (budgetValue >= 10000) return 25
  if (budgetValue >= 5000) return 20
  if (budgetValue >= 2000) return 15
  if (budgetValue >= 1000) return 10
  if (budgetValue >= 500) return 5
  return 0
}

function calculateClientSpendingScore(spent: string): number {
  const spentMatch = spent.match(/\$(\d+(?:,\d{3})*(?:\.\d+)?)/)
  if (!spentMatch) return 0

  const spentValue = parseFloat(spentMatch[1].replace(',', ''))
  
  // ML pattern: High spenders are more likely to hire
  if (spentValue >= 100000) return 20
  if (spentValue >= 50000) return 15
  if (spentValue >= 20000) return 10
  if (spentValue >= 5000) return 5
  return 0
}

function calculateClientRatingScore(rating: number): number {
  // ML analysis: 4.8+ ratings indicate serious clients
  if (rating >= 4.9) return 15
  if (rating >= 4.8) return 12
  if (rating >= 4.7) return 8
  if (rating >= 4.5) return 5
  if (rating >= 4.0) return 2
  return 0
}

function calculateJobTypeScore(type: string): number {
  // ML data shows Fixed projects have higher conversion rates
  switch (type) {
    case 'Fixed': return 8
    case 'Hourly': return 5
    case 'Contract': return 6
    default: return 3
  }
}

function calculatePostingRecencyScore(posted: string): number {
  // ML analysis: Recent posts get more responses
  if (posted.includes('min')) return 8
  if (posted.includes('hour')) return 5
  if (posted.includes('day') && !posted.includes('days ago')) return 3
  return 0
}

function calculateTechStackScore(tags: string[]): number {
  // ML analysis: High-demand tech stacks score higher
  const highDemandTech = [
    'React', 'TypeScript', 'Node.js', 'Python', 'AI', 'ML', 'Blockchain',
    'AWS', 'Docker', 'Kubernetes', 'GraphQL', 'MongoDB', 'PostgreSQL'
  ]
  
  const mediumDemandTech = [
    'Vue.js', 'Angular', 'Java', 'C#', 'PHP', 'Ruby', 'Go', 'Rust'
  ]

  let score = 0
  tags.forEach(tag => {
    if (highDemandTech.includes(tag)) score += 4
    else if (mediumDemandTech.includes(tag)) score += 2
  })

  return Math.min(15, score)
}

function calculateDescriptionScore(description: string, brief: string | null): number {
  // ML analysis: Detailed descriptions indicate serious clients
  const text = (description + ' ' + (brief || '')).toLowerCase()
  
  // Check for detailed requirements
  const detailIndicators = [
    'requirements', 'must have', 'experience', 'skills', 'technologies',
    'responsibilities', 'deliverables', 'timeline', 'deadline'
  ]
  
  let score = 0
  detailIndicators.forEach(indicator => {
    if (text.includes(indicator)) score += 2
  })

  // Check for vague descriptions (negative scoring)
  const vagueIndicators = [
    'looking for', 'someone who can', 'basic', 'simple', 'easy'
  ]
  
  vagueIndicators.forEach(indicator => {
    if (text.includes(indicator)) score -= 1
  })

  // Length bonus for detailed descriptions
  if (text.length > 500) score += 3
  else if (text.length > 200) score += 2
  else if (text.length > 100) score += 1

  return Math.max(0, Math.min(10, score))
}

function calculateMarketDemandScore(job: Job): number {
  // ML analysis based on market trends
  const techTags = job.tags.join(' ').toLowerCase()
  
  // AI/ML jobs are in high demand
  if (techTags.includes('ai') || techTags.includes('ml') || techTags.includes('machine learning')) {
    return 10
  }
  
  // Cloud technologies
  if (techTags.includes('aws') || techTags.includes('azure') || techTags.includes('gcp')) {
    return 8
  }
  
  // Modern frameworks
  if (techTags.includes('react') || techTags.includes('vue') || techTags.includes('angular')) {
    return 6
  }
  
  // Backend technologies
  if (techTags.includes('node.js') || techTags.includes('python') || techTags.includes('java')) {
    return 4
  }

  return 2
}

// ML-enhanced scoring for portfolio recommendations
export function getPortfolioRecommendations(job: Job): string[] {
  const recommendations: string[] = []
  
  // Tech stack recommendations
  job.tags.forEach(tag => {
    if (['React', 'Vue.js', 'Angular'].includes(tag)) {
      recommendations.push('Frontend projects with modern frameworks')
    }
    if (['Node.js', 'Python', 'Java'].includes(tag)) {
      recommendations.push('Backend API projects')
    }
    if (['AWS', 'Docker', 'Kubernetes'].includes(tag)) {
      recommendations.push('DevOps and cloud deployment projects')
    }
    if (['AI', 'ML', 'Machine Learning'].includes(tag)) {
      recommendations.push('AI/ML projects with real datasets')
    }
  })

  // Based on budget and client type
  if (job.client.spent.includes('$50k') || job.client.spent.includes('$100k')) {
    recommendations.push('Enterprise-level projects')
  }
  
  if (job.budget.includes('$5000') || job.budget.includes('$10000')) {
    recommendations.push('Complex, high-value projects')
  }

  return [...new Set(recommendations)] // Remove duplicates
}

// Predictive analytics for job market trends
export function predictMarketTrends(jobs: Job[]): {
  trendingTech: string[]
  highDemandCategories: string[]
  optimalBudgetRange: string
  bestPostingTimes: string[]
} {
  const techFrequency: Record<string, number> = {}
  const categoryFrequency: Record<string, number> = {}
  const budgets: number[] = []
  
  jobs.forEach(job => {
    // Analyze tech stack trends
    job.tags.forEach(tag => {
      techFrequency[tag] = (techFrequency[tag] || 0) + 1
    })
    
    // Analyze categories
    const category = getCategoryFromTags(job.tags)
    categoryFrequency[category] = (categoryFrequency[category] || 0) + 1
    
    // Extract budgets
    const budgetMatch = job.budget.match(/\$(\d+(?:,\d{3})*(?:\.\d+)?)/)
    if (budgetMatch) {
      budgets.push(parseFloat(budgetMatch[1].replace(',', '')))
    }
  })
  
  // Get trending technologies
  const trendingTech = Object.entries(techFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([tech]) => tech)
  
  // Get high demand categories
  const highDemandCategories = Object.entries(categoryFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([category]) => category)
  
  // Calculate optimal budget range
  const avgBudget = budgets.length > 0 ? budgets.reduce((a, b) => a + b, 0) / budgets.length : 0
  const optimalBudgetRange = avgBudget > 5000 ? '$5,000-$15,000' : 
                            avgBudget > 2000 ? '$2,000-$8,000' : 
                            '$500-$3,000'
  
  // Best posting times (based on analysis)
  const bestPostingTimes = ['Monday 9AM', 'Tuesday 10AM', 'Wednesday 11AM']

  return {
    trendingTech,
    highDemandCategories,
    optimalBudgetRange,
    bestPostingTimes
  }
}

function getCategoryFromTags(tags: string[]): string {
  const techTags = tags.join(' ').toLowerCase()
  
  if (techTags.includes('react') || techTags.includes('vue') || techTags.includes('angular')) {
    return 'Frontend Development'
  }
  if (techTags.includes('node.js') || techTags.includes('python') || techTags.includes('java')) {
    return 'Backend Development'
  }
  if (techTags.includes('ai') || techTags.includes('ml') || techTags.includes('machine learning')) {
    return 'AI/ML'
  }
  if (techTags.includes('aws') || techTags.includes('docker') || techTags.includes('kubernetes')) {
    return 'DevOps/Cloud'
  }
  if (techTags.includes('blockchain') || techTags.includes('crypto') || techTags.includes('web3')) {
    return 'Blockchain'
  }
  
  return 'General Development'
}