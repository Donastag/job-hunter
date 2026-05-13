const router = require('express').Router()
const db = require('../lib/db')

function fmtKES(n) {
  return Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

router.get('/', async (req, res) => {
  try {
    const { rows: invoices } = await db.query('SELECT * FROM invoices ORDER BY "createdAt" DESC')

    const totalEarned  = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
    const totalPending = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + Number(i.amount), 0)
    const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.amount), 0)

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const thisMonth = invoices
      .filter(i => i.status === 'paid' && new Date(i.updatedAt) >= monthStart)
      .reduce((s, i) => s + Number(i.amount), 0)

    const paidCount = invoices.filter(i => i.status === 'paid').length
    const avgDeal = paidCount > 0 ? totalEarned / paidCount : 0

    res.render('finance', {
      title: 'Finance',
      active: 'finance',
      invoices,
      stats: { totalEarned, totalPending, totalOverdue, thisMonth, avgDeal, count: invoices.length },
      fmtKES,
    })
  } catch (err) {
    console.error('[Finance] Error:', err.message)
    res.status(500).send('Database error: ' + err.message)
  }
})

// Create invoice
router.post('/invoices', async (req, res) => {
  const { clientName, clientEmail, description, amount, status, dueDate } = req.body
  if (!clientName?.trim()) return res.status(400).json({ error: 'Client name required' })

  try {
    const { rows } = await db.query(
      `INSERT INTO invoices ("clientName", "clientEmail", description, amount, status, "dueDate")
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [clientName.trim(), clientEmail?.trim() || null, description?.trim() || null,
       parseFloat(amount) || 0, status || 'draft', dueDate || null]
    )
    res.json({ ok: true, id: rows[0].id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update status
router.put('/invoices/:id/status', async (req, res) => {
  const valid = ['draft', 'sent', 'paid', 'overdue', 'cancelled']
  const { status } = req.body
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' })

  try {
    const result = await db.query(
      `UPDATE invoices SET status = $1, "updatedAt" = NOW() WHERE id = $2`,
      [status, req.params.id]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete invoice
router.delete('/invoices/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM invoices WHERE id = $1', [req.params.id])
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
