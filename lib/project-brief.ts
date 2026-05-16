// Agent 3 — Architect
// Generates a project kickoff brief when a job is won

interface JobInput {
  title: string
  description?: string | null
  budget?: string | null
  skills: string
  clientName?: string | null
}

export async function generateProjectBrief(job: JobInput): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return null

  const skills = (() => {
    try { return JSON.parse(job.skills || '[]').slice(0, 8).join(', ') } catch { return job.skills }
  })()

  const prompt = `You are a senior freelance project manager. A contract has just been won. Write a concise project kickoff brief.

Job: ${job.title}
Client: ${job.clientName || 'Unknown'}
Budget: ${job.budget || 'TBD'}
Skills: ${skills}
Description: ${(job.description || '').slice(0, 500)}

Output format (plain text, no markdown):
GOAL: [one sentence project goal]
DELIVERABLES:
- [deliverable 1]
- [deliverable 2]
- [deliverable 3]
TIMELINE: [suggested timeline]
STACK: [recommended tech approach]
FIRST STEP: [what to do in the first 24 hours]`

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://job-hunter.local',
        'X-Title': 'Job Hunter',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b:free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.4,
      }),
    })
    if (!res.ok) return null
    const data = await res.json() as { choices?: Array<{ message: { content: string } }> }
    return data.choices?.[0]?.message?.content?.trim() ?? null
  } catch {
    return null
  }
}
