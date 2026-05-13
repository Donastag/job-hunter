const router = require('express').Router()
const db = require('../lib/db')

router.get('/', async (req, res) => {
  try {
    const { cat } = req.query
    const where = cat && cat !== 'all' ? `WHERE category = $1` : ''
    const params = cat && cat !== 'all' ? [cat] : []

    const { rows: entries } = await db.query(
      `SELECT * FROM knowledge_entries ${where} ORDER BY "createdAt" DESC`,
      params
    )

    const { rows: counts } = await db.query(`
      SELECT category, COUNT(*)::int AS n FROM knowledge_entries GROUP BY category
    `)

    const byCategory = {}
    counts.forEach(r => { byCategory[r.category] = r.n })

    const stats = {
      total:    entries.length,
      proposal: byCategory.proposal  || 0,
      platform: byCategory.platform  || 0,
      tech:     byCategory.tech      || 0,
      client:   byCategory.client    || 0,
      general:  byCategory.general   || 0,
    }

    res.render('knowledge', { title: 'Knowledge', active: 'knowledge', entries, stats, activeFilter: cat || 'all' })
  } catch (err) {
    console.error('[Knowledge] Error:', err.message)
    res.status(500).send('Database error: ' + err.message)
  }
})

router.post('/knowledge', async (req, res) => {
  const { title, category, tags, content, source } = req.body
  if (!title?.trim() || !content?.trim()) return res.status(400).json({ error: 'Title and content required' })

  try {
    const { rows } = await db.query(
      `INSERT INTO knowledge_entries (id, title, category, tags, content, source)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5) RETURNING id`,
      [title.trim(), category || 'general', tags?.trim() || '', content.trim(), source?.trim() || null]
    )
    res.json({ ok: true, id: rows[0].id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/knowledge/:id', async (req, res) => {
  const { title, category, tags, content, source } = req.body
  if (!title?.trim() || !content?.trim()) return res.status(400).json({ error: 'Title and content required' })

  try {
    const result = await db.query(
      `UPDATE knowledge_entries SET title=$1, category=$2, tags=$3, content=$4, source=$5, "updatedAt"=NOW()
       WHERE id=$6`,
      [title.trim(), category || 'general', tags?.trim() || '', content.trim(), source?.trim() || null, req.params.id]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/knowledge/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM knowledge_entries WHERE id = $1', [req.params.id])
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
