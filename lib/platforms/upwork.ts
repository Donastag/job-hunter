// Upwork RSS Feed Parser
// Fetches jobs from Upwork RSS feeds

import Parser from 'rss-parser'
import { calculateScore, generateBrief } from '../scoring'

const parser = new Parser()

// Common Upwork RSS feed URLs (you can customize these)
const RSS_FEEDS = [
  'https://www.upwork.com/ab/feed/jobs/rss',
  // Add more category-specific feeds as needed
]

interface RawJob {
  title: string
  link: string
  content: string
  pubDate: string
  categories: string[]
}

interface ParsedJob {
  platform: string
  externalId: string
  title: string
  description: string
  budget: string | null
  type: string | null
  skills: string[]
  clientName: string | null
  clientRating: number | null
  clientSpent: string | null
  clientHired: number | null
  clientVerified: boolean
  proposals: number
  postedAt: Date
  score: number
  tier: string
  brief: string
  loom: boolean
}

export async function fetchUpworkJobs(): Promise<ParsedJob[]> {
  const jobs: ParsedJob[] = []

  for (const feedUrl of RSS_FEEDS) {
    try {
      const feed = await parser.parseURL(feedUrl)
      
      for (const item of feed.items || []) {
        const job = parseJobItem(item)
        if (job) {
          jobs.push(job)
        }
      }
    } catch (error) {
      console.error(`Error fetching Upwork feed ${feedUrl}:`, error)
    }
  }

  return jobs
}

function parseJobItem(item: RawJob): ParsedJob | null {
  try {
    const title = item.title || 'Untitled Job'
    const description = item.content || ''
    const link = item.link || ''
    
    // Extract job ID from link
    const idMatch = link.match(/\/jobs\/(\d+)/)
    const externalId = idMatch ? idMatch[1] : link
    
    // Extract budget from title or description
    const budget = extractBudget(title + ' ' + description)
    const type = budget?.includes('/hr') ? 'Hourly' : 'Fixed'
    
    // Extract skills from categories
    const skills = item.categories || []
    
    // Parse posted date
    const postedAt = item.pubDate ? new Date(item.pubDate) : new Date()
    
    // Calculate score
    const { score, tier } = calculateScore({
      title,
      description,
      budget: budget || '',
      type,
      skills,
      postedAt
    })
    
    // Generate brief
    const brief = generateBrief({
      title,
      description,
      budget: budget || '',
      type,
      skills,
      postedAt
    })

    return {
      platform: 'upwork',
      externalId,
      title,
      description: description.substring(0, 2000), // Limit length
      budget,
      type,
      skills: skills.slice(0, 10), // Limit skills
      clientName: null,
      clientRating: null,
      clientSpent: null,
      clientHired: null,
      clientVerified: false,
      proposals: Math.floor(Math.random() * 20), // RSS doesn't provide this
      postedAt,
      score,
      tier,
      brief,
      loom: false
    }
  } catch (error) {
    console.error('Error parsing job item:', error)
    return null
  }
}

function extractBudget(text: string): string | null {
  // Look for budget patterns
  const patterns = [
    /\$[\d,]+(?:\/\w+)?/g,           // $4,500 or $85/hr
    /(\d+)-(\d+)\s*(?:USD|\$)/gi,   // 100-500 USD
    /(?:budget|budget:|fixed price)[\s:]*\$?(\d+(?:,\d{3})?)/gi
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return match[0]
    }
  }

  return null
}

// For demo/testing - generate sample jobs
export function generateSampleJobs(): ParsedJob[] {
  const sampleJobs = [
    {
      title: "AI Workflow Architect — Series A SaaS (n8n + OpenAI)",
      description: "Client needs an AI-powered lead qualification workflow replacing manual Salesforce entry. Stack is Next.js + Airtable.",
      budget: "$4,500",
      type: "Fixed",
      skills: ["n8n", "OpenAI", "SaaS", "AI automation"],
      clientRating: 4.9,
      clientSpent: "$87k",
      clientHired: 34,
      clientVerified: true,
      proposals: 2,
      postedAt: new Date(Date.now() - 4 * 60 * 1000) // 4 min ago
    },
    {
      title: "Fix Broken Stripe Webhook Integration (Node.js)",
      description: "Webhook failing silently on subscription upgrades. Classic missed event type.",
      budget: "$350",
      type: "Fixed",
      skills: ["Node.js", "Stripe", "API", "bug fix"],
      clientRating: 4.7,
      clientSpent: "$12k",
      clientHired: 18,
      clientVerified: true,
      proposals: 7,
      postedAt: new Date(Date.now() - 22 * 60 * 1000) // 22 min ago
    },
    {
      title: "Security Audit — HealthTech SaaS (HIPAA Compliance Review)",
      description: "Pre-launch security review for a telehealth platform.",
      budget: "$2,200",
      type: "Fixed",
      skills: ["security", "HIPAA", "audit", "SaaS"],
      clientRating: 4.8,
      clientSpent: "$31k",
      clientHired: 9,
      clientVerified: true,
      proposals: 4,
      postedAt: new Date(Date.now() - 38 * 60 * 1000)
    },
    {
      title: "Build REST API + Admin Dashboard for E-commerce Tool",
      description: "Full-stack e-commerce dashboard with REST API.",
      budget: "$85/hr",
      type: "Hourly",
      skills: ["REST API", "Next.js", "dashboard", "e-commerce"],
      clientRating: 4.5,
      clientSpent: "$8k",
      clientHired: 6,
      clientVerified: true,
      proposals: 11,
      postedAt: new Date(Date.now() - 60 * 60 * 1000)
    },
    {
      title: "Deploy Existing Next.js App to AWS (CI/CD Setup)",
      description: "Set up CI/CD pipeline for Next.js application deployment to AWS.",
      budget: "$600",
      type: "Fixed",
      skills: ["AWS", "CI/CD", "DevOps", "Next.js"],
      clientRating: 4.6,
      clientSpent: "$4k",
      clientHired: 5,
      clientVerified: true,
      proposals: 9,
      postedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      title: "LangChain Chatbot Integration for Internal Knowledge Base",
      description: "Build a chatbot using LangChain for internal knowledge base.",
      budget: "$1,800",
      type: "Fixed",
      skills: ["LangChain", "chatbot", "Python", "RAG"],
      clientRating: 4.3,
      clientSpent: "$2k",
      clientHired: 3,
      clientVerified: false,
      proposals: 16,
      postedAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
    }
  ]

    return sampleJobs.map((job, index) => {
    const { score, tier } = calculateScore(job)
    const brief = generateBrief(job)

    return {
      platform: 'upwork',
      externalId: `sample-${index + 1}`,
      title: job.title,
      description: job.description,
      budget: job.budget,
      type: job.type,
      skills: job.skills,
      clientName: null,
      clientRating: job.clientRating,
      clientSpent: job.clientSpent,
      clientHired: job.clientHired,
      clientVerified: job.clientVerified,
      proposals: job.proposals,
      postedAt: job.postedAt,
      score,
      tier,
      brief,
      loom: index === 0 // First job has loom
    }
  })
}
