const express = require('express')
const router = express.Router()
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// GET / — list all open sessions
router.get('/', async (req, res) => {
  try {
    const { rows: sessions } = await pool.query(`
      SELECT s.*,
        (SELECT m.message FROM chat_messages m WHERE m."sessionId" = s.id ORDER BY m."createdAt" DESC LIMIT 1) AS "lastMessage",
        (SELECT m."createdAt" FROM chat_messages m WHERE m."sessionId" = s.id ORDER BY m."createdAt" DESC LIMIT 1) AS "lastAt",
        (SELECT COUNT(*) FROM chat_messages m WHERE m."sessionId" = s.id AND m.sender = 'visitor') AS "visitorCount",
        (SELECT COUNT(*) FROM chat_messages m WHERE m."sessionId" = s.id AND m.sender = 'agent') AS "agentCount"
      FROM chat_sessions s
      ORDER BY s."updatedAt" DESC
    `)

    const openCount = sessions.filter(s => s.status === 'open').length

    res.render('chat', {
      title: 'Support Chat',
      active: 'chat',
      sessions,
      openCount,
      selectedId: null,
      selected: null,
      messages: [],
    })
  } catch (err) {
    console.error('[Chat]', err)
    res.status(500).send('Error loading chat sessions')
  }
})

// GET /:id — open a specific session
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const [sessionsResult, sessionResult, messagesResult] = await Promise.all([
      pool.query(`
        SELECT s.*,
          (SELECT m.message FROM chat_messages m WHERE m."sessionId" = s.id ORDER BY m."createdAt" DESC LIMIT 1) AS "lastMessage",
          (SELECT m."createdAt" FROM chat_messages m WHERE m."sessionId" = s.id ORDER BY m."createdAt" DESC LIMIT 1) AS "lastAt"
        FROM chat_sessions s
        ORDER BY s."updatedAt" DESC
      `),
      pool.query('SELECT * FROM chat_sessions WHERE id = $1', [id]),
      pool.query('SELECT * FROM chat_messages WHERE "sessionId" = $1 ORDER BY "createdAt" ASC', [id]),
    ])

    const selected = sessionResult.rows[0]
    if (!selected) return res.status(404).send('Session not found')

    const openCount = sessionsResult.rows.filter(s => s.status === 'open').length

    res.render('chat', {
      title: 'Support Chat',
      active: 'chat',
      sessions: sessionsResult.rows,
      openCount,
      selectedId: id,
      selected,
      messages: messagesResult.rows,
    })
  } catch (err) {
    console.error('[Chat]', err)
    res.status(500).send('Error loading session')
  }
})

// POST /:id/reply — agent sends a message
router.post('/:id/reply', async (req, res) => {
  const { id } = req.params
  const { message } = req.body
  if (!message?.trim()) return res.redirect(`/chat/${id}`)

  const msgId = require('crypto').randomUUID()
  await pool.query(
    'INSERT INTO chat_messages (id, "sessionId", sender, message) VALUES ($1, $2, $3, $4)',
    [msgId, id, 'agent', message.trim()],
  )
  await pool.query('UPDATE chat_sessions SET "updatedAt" = NOW() WHERE id = $1', [id])
  res.redirect(`/chat/${id}`)
})

// POST /:id/close
router.post('/:id/close', async (req, res) => {
  await pool.query('UPDATE chat_sessions SET status = $1 WHERE id = $2', ['closed', req.params.id])
  res.redirect('/chat')
})

// POST /:id/reopen
router.post('/:id/reopen', async (req, res) => {
  await pool.query('UPDATE chat_sessions SET status = $1 WHERE id = $2', ['open', req.params.id])
  res.redirect(`/chat/${req.params.id}`)
})

module.exports = router
