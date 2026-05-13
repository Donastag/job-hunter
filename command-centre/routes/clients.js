const router = require('express').Router()
const db = require('../lib/db')

router.get('/', async (req, res) => {
  try {
    const [clientsRes, wonLeadsRes] = await Promise.all([
      db.query('SELECT * FROM clients ORDER BY "createdAt" DESC'),
      db.query(`SELECT * FROM "Lead" WHERE stage = 'won' ORDER BY "updatedAt" DESC`),
    ])

    const clients  = clientsRes.rows
    const wonLeads = wonLeadsRes.rows

    const stats = {
      total:      clients.length,
      wonLeads:   wonLeads.length,
      totalValue: wonLeads.reduce((s, l) => s + Number(l.value || 0), 0),
    }

    res.render('clients', { title: 'Clients', active: 'clients', clients, wonLeads, stats })
  } catch (err) {
    console.error('[Clients] Error:', err.message)
    res.status(500).send('Database error: ' + err.message)
  }
})

// Create client
router.post('/clients', async (req, res) => {
  const { name, email, company, phone, source, notes } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' })

  try {
    const { rows } = await db.query(
      `INSERT INTO clients (name, email, company, phone, source, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [name.trim(), email?.trim() || null, company?.trim() || null,
       phone?.trim() || null, source || 'manual', notes?.trim() || null]
    )
    res.json({ ok: true, id: rows[0].id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update client
router.put('/clients/:id', async (req, res) => {
  const { name, email, company, phone, source, notes } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' })

  try {
    const result = await db.query(
      `UPDATE clients SET name=$1, email=$2, company=$3, phone=$4, source=$5, notes=$6, "updatedAt"=NOW()
       WHERE id=$7`,
      [name.trim(), email?.trim() || null, company?.trim() || null,
       phone?.trim() || null, source || 'manual', notes?.trim() || null, req.params.id]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete client
router.delete('/clients/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM clients WHERE id = $1', [req.params.id])
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
