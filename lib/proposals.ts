// Agent 2 — Closer
// Generates targeted Upwork proposals using OpenAI or OpenRouter (free DeepSeek V3)

interface JobInput {
  title: string
  description: string
  budget?: string | null
  type?: string | null
  skills: string[]
  platform: string
}

const PERSONA = `You are Donastag, an AI automation engineer based in Nairobi, Kenya.
You specialise in: n8n workflows, RAG chatbots, API integrations, SaaS backends (Next.js + FastAPI), and Python automation.
You have 4+ years of experience delivering real results for international clients on Upwork and remote platforms.
Your proposals are concise, specific, and confident — never generic. You always reference the exact problem in the job post.`

export async function generateProposal(job: JobInput): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn('[Proposals] No API key — set OPENROUTER_API_KEY or OPENAI_API_KEY')
    return null
  }

  const useOpenRouter = !!process.env.OPENROUTER_API_KEY
  const endpoint = useOpenRouter
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions'

  // openai/gpt-oss-120b:free: best free model for clean proposal writing
  const model = useOpenRouter ? 'openai/gpt-oss-120b:free' : 'gpt-3.5-turbo'

  const skills = job.skills.length > 0 ? job.skills.slice(0, 6).join(', ') : 'automation, AI, APIs'
  const budget = job.budget && job.budget !== '$0' ? `Budget: ${job.budget} (${job.type || 'Fixed'})` : ''

  const userPrompt = `Write a short, punchy Upwork proposal (150–200 words) for this job.

Job: ${job.title}
${budget}
Skills required: ${skills}

Description:
${job.description.slice(0, 600)}

Rules:
- Open with a direct reference to their specific problem (not "I saw your job post...")
- Mention 1-2 directly relevant past projects or capabilities
- State a clear next step (discovery call, quick question, etc.)
- No fluff, no buzzwords like "passionate" or "dedicated"
- End with your name: Donastag`

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(useOpenRouter ? { 'HTTP-Referer': 'https://job-hunter.local', 'X-Title': 'Job Hunter' } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: PERSONA },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 350,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`[Proposals] API error ${res.status}:`, err.slice(0, 200))
      return null
    }

    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || null
  } catch (err) {
    console.error('[Proposals] fetch failed:', (err as Error).message)
    return null
  }
}
