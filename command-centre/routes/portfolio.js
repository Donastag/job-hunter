const router = require('express').Router()
const db = require('../lib/db')

function fmtKES(n) {
  return Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

router.get('/', async (req, res) => {
  try {
    const { status } = req.query
    const where = status && status !== 'all' ? `WHERE status = $1` : `WHERE status != 'archived'`
    const params = status && status !== 'all' ? [status] : []

    const { rows: items } = await db.query(
      `SELECT * FROM portfolio_items ${where} ORDER BY "completedAt" DESC NULLS LAST, "createdAt" DESC`,
      params
    )

    const { rows: all } = await db.query('SELECT revenue, status FROM portfolio_items')
    const totalRevenue = all.filter(i => i.status === 'active').reduce((s, i) => s + Number(i.revenue || 0), 0)
    const activeCount  = all.filter(i => i.status === 'active').length
    const avgRevenue   = activeCount > 0 ? totalRevenue / activeCount : 0

    const stats = {
      total:        all.length,
      active:       activeCount,
      archived:     all.filter(i => i.status === 'archived').length,
      totalRevenue,
      avgRevenue,
    }

    res.render('portfolio', { title: 'Portfolio', active: 'portfolio', items, stats, fmtKES, activeFilter: status || 'active' })
  } catch (err) {
    console.error('[Portfolio] Error:', err.message)
    res.status(500).send('Database error: ' + err.message)
  }
})

router.post('/portfolio', async (req, res) => {
  const { title, client, techStack, outcome, revenue, testimonial, url, completedAt } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'Title required' })

  try {
    const { rows } = await db.query(
      `INSERT INTO portfolio_items (id, title, client, "techStack", outcome, revenue, testimonial, url, "completedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [title.trim(), client?.trim() || null, techStack?.trim() || '',
       outcome?.trim() || null, parseFloat(revenue) || 0,
       testimonial?.trim() || null, url?.trim() || null,
       completedAt || null]
    )
    res.json({ ok: true, id: rows[0].id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/portfolio/:id', async (req, res) => {
  const { title, client, techStack, outcome, revenue, testimonial, url, status, completedAt } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'Title required' })

  try {
    const result = await db.query(
      `UPDATE portfolio_items
       SET title=$1, client=$2, "techStack"=$3, outcome=$4, revenue=$5,
           testimonial=$6, url=$7, status=$8, "completedAt"=$9, "updatedAt"=NOW()
       WHERE id=$10`,
      [title.trim(), client?.trim() || null, techStack?.trim() || '',
       outcome?.trim() || null, parseFloat(revenue) || 0,
       testimonial?.trim() || null, url?.trim() || null,
       status || 'active', completedAt || null, req.params.id]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/portfolio/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM portfolio_items WHERE id = $1', [req.params.id])
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
