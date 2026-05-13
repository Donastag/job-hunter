import { Job } from '@/types'

interface Template {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  performance: {
    usageCount: number
    successRate: number
    avgScore: number
  }
  createdAt: Date
  updatedAt: Date
}

interface AITemplateRequest {
  job: Job
  templateType: 'proposal' | 'cover_letter' | 'follow_up'
  tone: 'professional' | 'casual' | 'enthusiastic' | 'formal'
  length: 'short' | 'medium' | 'long'
  customInstructions?: string
}

interface AITemplateResponse {
  content: string
  confidence: number
  suggestions: string[]
  estimatedTime: number
}

export class AITemplateGenerator {
  private openAIApiKey: string | null
  private templates: Template[] = []

  constructor() {
    this.openAIApiKey = process.env.OPENAI_API_KEY || null
  }

  async generateTemplate(request: AITemplateRequest): Promise<AITemplateResponse> {
    if (!this.openAIApiKey) {
      return this.generateMockTemplate(request)
    }

    try {
      const prompt = this.buildPrompt(request)
      const response = await this.callOpenAI(prompt, request.length)
      
      return {
        content: response,
        confidence: this.calculateConfidence(request.job, response),
        suggestions: this.generateSuggestions(request.job, response),
        estimatedTime: this.estimateTime(request.length)
      }
    } catch (error) {
      console.error('Error generating AI template:', error)
      return this.generateMockTemplate(request)
    }
  }

  async createTemplate(title: string, content: string, category: string, tags: string[]): Promise<Template> {
    const template: Template = {
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      content,
      category,
      tags,
      performance: {
        usageCount: 0,
        successRate: 0,
        avgScore: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.templates.push(template)
    return template
  }

  async getTemplates(category?: string, tags?: string[]): Promise<Template[]> {
    let templates = [...this.templates]

    if (category) {
      templates = templates.filter(t => t.category.toLowerCase() === category.toLowerCase())
    }

    if (tags && tags.length > 0) {
      templates = templates.filter(t => 
        tags.some(tag => t.tags.some(tTag => tTag.toLowerCase().includes(tag.toLowerCase())))
      )
    }

    return templates.sort((a, b) => b.performance.usageCount - a.performance.usageCount)
  }

  async updateTemplatePerformance(templateId: string, success: boolean, score: number): Promise<void> {
    const template = this.templates.find(t => t.id === templateId)
    if (!template) return

    template.performance.usageCount += 1
    template.performance.avgScore = this.calculateAverageScore(template.performance.avgScore, score, template.performance.usageCount)
    
    if (success) {
      template.performance.successRate = this.calculateSuccessRate(template.performance.successRate, true, template.performance.usageCount)
    }
  }

  private buildPrompt(request: AITemplateRequest): string {
    const { job, templateType, tone, length, customInstructions } = request
    
    const basePrompt = `
Generate a ${templateType} for the following job opportunity:

Job Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Budget: ${job.budget}
Job Type: ${job.type}
AI Score: ${job.score}/100
Tags: ${job.tags.join(', ')}

Job Description:
${job.description}

${job.brief ? `Additional Context:
${job.brief}` : ''}

Requirements:
${this.extractRequirements(job.description)}

Please generate a ${templateType} with the following specifications:
- Tone: ${tone}
- Length: ${length}
- Focus on highlighting relevant skills and experience
- Address the job requirements specifically
- Include a strong opening and closing
- Make it personalized and engaging

${customInstructions ? `Additional Instructions: ${customInstructions}` : ''}

The response should be well-structured and professional.`
    
    return basePrompt
  }

  private async callOpenAI(prompt: string, length: string): Promise<string> {
    // Mock implementation for now
    return this.generateMockResponse(prompt, length)
  }

  private generateMockTemplate(request: AITemplateRequest): AITemplateResponse {
    const { job, templateType, tone, length } = request
    
    let content = ''
    
    switch (templateType) {
      case 'proposal':
        content = this.generateMockProposal(job, tone, length)
        break
      case 'cover_letter':
        content = this.generateMockCoverLetter(job, tone, length)
        break
      case 'follow_up':
        content = this.generateMockFollowUp(job, tone, length)
        break
    }

    return {
      content,
      confidence: 0.85,
      suggestions: this.generateMockSuggestions(job),
      estimatedTime: this.estimateTime(length)
    }
  }

  private generateMockProposal(job: Job, tone: string, length: string): string {
    const skills = job.tags.slice(0, 3).join(', ')
    const budget = job.budget !== '$0' ? ` for ${job.budget}` : ''
    
    const openings: Record<string, string> = {
      professional: `Dear Hiring Manager, I'm excited to submit my proposal for the ${job.title} position${budget}. With ${skills} expertise, I'm confident in delivering exceptional results.`,
      casual: `Hi there! I'd love to help with the ${job.title} role. My experience with ${skills} makes me a great fit for this opportunity.`,
      enthusiastic: `Hello! I'm thrilled about the ${job.title} position! My passion for ${skills} and proven track record make me excited to contribute to your team.`,
      formal: `To Whom It May Concern, I am writing to express my interest in the ${job.title} position as advertised. Please find my qualifications detailed below.`
    }

    const body: Record<string, string> = {
      short: `I have 5+ years of experience in ${skills}. I've successfully completed similar projects with high client satisfaction. I'm available to start immediately and can deliver quality work within your timeline.`,
      medium: `With over 5 years of professional experience in ${skills}, I've developed a comprehensive skill set that aligns perfectly with your requirements. My portfolio includes successful projects for clients in various industries, consistently receiving positive feedback and repeat business. I'm particularly drawn to this opportunity because of [specific aspect of job]. I'm confident I can deliver exceptional results and exceed your expectations.`,
      long: `Throughout my 5+ year career in ${skills}, I've cultivated a deep understanding of industry best practices and emerging trends. My approach combines technical expertise with creative problem-solving, resulting in innovative solutions that drive measurable results. 

For example, in a recent project similar to yours, I [specific achievement with metrics]. This experience has equipped me with the skills necessary to tackle the challenges outlined in your job description.

What sets me apart is my commitment to [unique value proposition] and my ability to [specific strength]. I'm passionate about delivering work that not only meets but exceeds client expectations.

I'm excited about the opportunity to bring my expertise to your team and contribute to your continued success. I'm available for a detailed discussion at your earliest convenience.`
    }

    const closings: Record<string, string> = {
      professional: `Thank you for considering my application. I look forward to discussing how I can contribute to your team's success.`,
      casual: `Thanks for your time! I'd love to chat more about this opportunity and how I can help.`,
      enthusiastic: `Thank you for this exciting opportunity! I'm eager to bring my skills to your team and make a meaningful impact.`,
      formal: `Thank you for your time and consideration. I look forward to the possibility of discussing this position with you further.`
    }

    return `${openings[tone]}

${body[length]}

${closings[tone]}

Best regards,
[Your Name]`
  }

  private generateMockCoverLetter(job: Job, tone: string, length: string): string {
    return `Dear Hiring Team,

I am writing to express my strong interest in the ${job.title} position at ${job.company}. With my extensive experience in ${job.tags.slice(0, 3).join(', ')}, I am confident in my ability to make immediate contributions to your team.

[Additional content based on tone and length...]

Sincerely,
[Your Name]`
  }

  private generateMockFollowUp(job: Job, tone: string, length: string): string {
    return `Dear ${job.company} Team,

I hope this message finds you well. I wanted to follow up on my application for the ${job.title} position that I submitted on [date]. I remain very enthusiastic about this opportunity and the possibility of contributing to your team.

[Additional content based on tone and length...]

Thank you for your time and consideration.

Best regards,
[Your Name]`
  }

  private generateMockResponse(prompt: string, length: string): string {
    // Mock response generation
    return `Generated ${length} template based on your requirements. This is a mock response for demonstration purposes.`
  }

  private generateMockSuggestions(job: Job): string[] {
    return [
      `Highlight your experience with ${job.tags[0]} more prominently`,
      `Include specific metrics or achievements related to ${job.tags[1]}`,
      `Mention your familiarity with ${job.tags[2]} tools and methodologies`,
      `Add a personalized introduction referencing the company's mission`,
      `Include a call-to-action for scheduling an interview`
    ]
  }

  private extractRequirements(description: string): string {
    // Simple extraction of requirements from job description
    const requirements = [
      'Strong communication skills',
      'Problem-solving abilities', 
      'Team collaboration',
      'Technical proficiency',
      'Time management'
    ]
    
    return requirements.join('\n- ')
  }

  private calculateConfidence(job: Job, content: string): number {
    // Calculate confidence based on job score and content quality
    const baseConfidence = job.score / 100
    const contentScore = content.length > 500 ? 0.9 : content.length > 200 ? 0.7 : 0.5
    
    return Math.min(1, (baseConfidence + contentScore) / 2)
  }

  private generateSuggestions(job: Job, content: string): string[] {
    const suggestions: string[] = []
    
    // Check for skill mentions
    job.tags.forEach(tag => {
      if (!content.toLowerCase().includes(tag.toLowerCase())) {
        suggestions.push(`Consider mentioning your experience with ${tag}`)
      }
    })

    // Check for company-specific content
    if (!content.toLowerCase().includes(job.company.toLowerCase())) {
      suggestions.push('Personalize the content by mentioning the company name')
    }

    // Check for call-to-action
    if (!content.toLowerCase().includes('interview') && !content.toLowerCase().includes('meeting')) {
      suggestions.push('Include a call-to-action for scheduling a discussion')
    }

    return suggestions.slice(0, 5)
  }

  private calculateAverageScore(currentAvg: number, newScore: number, count: number): number {
    return ((currentAvg * (count - 1)) + newScore) / count
  }

  private calculateSuccessRate(currentRate: number, success: boolean, count: number): number {
    const successValue = success ? 1 : 0
    return ((currentRate * (count - 1)) + successValue) / count
  }

  private estimateTime(length: string): number {
    switch (length) {
      case 'short': return 30
      case 'medium': return 60
      case 'long': return 120
      default: return 60
    }
  }

  // A/B Testing for templates
  async runABTest(templateA: Template, templateB: Template, job: Job): Promise<{
    winner: Template
    metrics: {
      engagementRate: number
      responseRate: number
      conversionRate: number
    }
  }> {
    // Mock A/B test implementation
    const metricsA = {
      engagementRate: 0.75,
      responseRate: 0.35,
      conversionRate: 0.20
    }

    const metricsB = {
      engagementRate: 0.82,
      responseRate: 0.42,
      conversionRate: 0.28
    }

    const winner = metricsB.conversionRate > metricsA.conversionRate ? templateB : templateA
    const finalMetrics = metricsB.conversionRate > metricsA.conversionRate ? metricsB : metricsA

    return {
      winner,
      metrics: finalMetrics
    }
  }

  // Template optimization suggestions
  getOptimizationSuggestions(template: Template, job: Job): string[] {
    const suggestions: string[] = []

    if (template.performance.successRate < 0.5) {
      suggestions.push('Consider revising the template structure for better engagement')
    }

    if (template.performance.avgScore < 70) {
      suggestions.push('Focus on improving content quality and relevance')
    }

    // Check for keyword optimization
    const missingSkills = job.tags.filter(tag => !template.content.toLowerCase().includes(tag.toLowerCase()))
    if (missingSkills.length > 0) {
      suggestions.push(`Include keywords: ${missingSkills.join(', ')} for better ATS compatibility`)
    }

    if (template.content.length < 200) {
      suggestions.push('Consider expanding content for better detail and context')
    }

    return suggestions
  }

  getTemplateAnalytics(): {
    totalTemplates: number
    avgSuccessRate: number
    topPerformingCategories: Array<{ category: string; count: number }>
    avgEngagementTime: number
  } {
    const totalTemplates = this.templates.length
    const avgSuccessRate = this.templates.length > 0 
      ? this.templates.reduce((sum, t) => sum + t.performance.successRate, 0) / this.templates.length 
      : 0

    const categoryCount: Record<string, number> = {}
    this.templates.forEach(t => {
      categoryCount[t.category] = (categoryCount[t.category] || 0) + 1
    })

    const topPerformingCategories = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }))

    return {
      totalTemplates,
      avgSuccessRate,
      topPerformingCategories,
      avgEngagementTime: 45 // Mock average engagement time
    }
  }
}