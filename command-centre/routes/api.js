const router = require('express').Router()
const db = require('../lib/db')

// Poll for new chat messages (used by chat.ejs agent view)
router.get('/chat-poll', async (req, res) => {
  const { sessionId, after } = req.query
  if (!sessionId) return res.json({ messages: [] })
  try {
    const whereParts = ['"sessionId" = $1']
    const params = [sessionId]
    if (after) {
      whereParts.push('"createdAt" > $2')
      params.push(new Date(after))
    }
    const { rows } = await db.query(
      `SELECT * FROM chat_messages WHERE ${whereParts.join(' AND ')} ORDER BY "createdAt" ASC`,
      params,
    )
    res.json({ messages: rows })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Trigger the Job Hunter scraper via Next.js app on :3000
router.post('/run-hunt', async (req, res) => {
  try {
    const r = await fetch('http://job-hunter:3000/api/jobs/run', { method: 'POST' })
    const data = await r.json()
    res.json({ ok: true, ...data })
  } catch {
    res.status(503).json({ ok: false, error: 'Job Hunter is not reachable' })
  }
})

// Move lead to a new stage
router.put('/leads/:id/stage', async (req, res) => {
  const { stage } = req.body
  const valid = ['contacted', 'engaged', 'call_booked', 'negotiating', 'won']
  if (!valid.includes(stage)) return res.status(400).json({ error: 'Invalid stage' })

  try {
    const result = await db.query(
      `UPDATE "Lead" SET stage = $1, age = 0, "updatedAt" = NOW() WHERE id = $2`,
      [stage, req.params.id]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Lead not found' })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Create a new lead
router.post('/leads', async (req, res) => {
  const { name, company, source, value, stage, notes } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' })

  const id = 'cc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)

  try {
    await db.query(
      `INSERT INTO "Lead" (id, name, company, source, value, stage, age, notes, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, 0, $7, NOW(), NOW())`,
      [id, name.trim(), company?.trim() || null, source || 'manual',
       parseFloat(value) || 0, stage || 'contacted', notes?.trim() || null]
    )
    res.json({ ok: true, id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Mark job as applied
router.put('/jobs/:id/apply', async (req, res) => {
  try {
    await db.query(`UPDATE "Job" SET status = 'applied', "updatedAt" = NOW() WHERE id = $1`, [req.params.id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Archive (skip) a job
router.put('/jobs/:id/archive', async (req, res) => {
  try {
    await db.query(`UPDATE "Job" SET status = 'archived', "updatedAt" = NOW() WHERE id = $1`, [req.params.id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
