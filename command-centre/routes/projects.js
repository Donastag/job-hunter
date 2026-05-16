const router = require('express').Router()
const db = require('../lib/db')

function daysAgo(iso) {
  if (!iso) return '—'
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000)
  return d === 0 ? 'today' : d === 1 ? '1d ago' : `${d}d ago`
}

router.get('/', async (req, res) => {
  try {
    const { rows: projects } = await db.query(
      `SELECT * FROM "Job" WHERE status IN ('won','delivered') ORDER BY "updatedAt" DESC`
    )
    const { rows: invoices } = await db.query(
      `SELECT * FROM invoices WHERE status IN ('draft','sent','overdue') ORDER BY "createdAt" DESC`
    )
    const { rows: portfolio } = await db.query(
      `SELECT COUNT(*) as count, SUM(revenue) as revenue FROM portfolio_items WHERE status='active'`
    )

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
    const overdueInvoices = invoices.filter(i => i.status === 'sent' && new Date(i.createdAt) < sevenDaysAgo)

    const mapped = projects.map(p => ({
      ...p,
      ageLabel: daysAgo(p.updatedAt),
      skills: (() => { try { return JSON.parse(p.skills || '[]').slice(0, 6) } catch { return [] } })(),
    }))

    res.render('projects', {
      title: 'Projects',
      active: 'projects',
      projects: mapped,
      pendingInvoices: invoices.filter(i => i.status === 'draft'),
      overdueInvoices,
      portfolioCount: parseInt(portfolio[0]?.count || 0),
      portfolioRevenue: parseFloat(portfolio[0]?.revenue || 0),
    })
  } catch (err) {
    console.error('[Projects] Error:', err.message)
    res.status(500).send('Database error: ' + err.message)
  }
})

// Mark project as delivered
router.post('/:id/deliver', async (req, res) => {
  try {
    await db.query(`UPDATE "Job" SET status='delivered', "updatedAt"=NOW() WHERE id=$1`, [req.params.id])
    res.redirect('/projects')
  } catch (err) {
    res.status(500).send('Error: ' + err.message)
  }
})

// Update invoice status
router.post('/invoices/:id/status', async (req, res) => {
  try {
    const { status } = req.body
    await db.query(`UPDATE invoices SET status=$1, "updatedAt"=NOW() WHERE id=$2`, [status, req.params.id])

    if (status === 'paid') {
      // Auto-create portfolio item
      const { rows } = await db.query(`SELECT * FROM invoices WHERE id=$1`, [req.params.id])
      const inv = rows[0]
      if (inv) {
        let jobData = { skills: '[]', "projectNotes": '' }
        if (inv.jobId) {
          const { rows: jRows } = await db.query(`SELECT * FROM "Job" WHERE id=$1`, [inv.jobId])
          if (jRows[0]) jobData = jRows[0]
        }
        const techStack = (() => { try { return JSON.parse(jobData.skills || '[]').join(', ') } catch { return '' } })()
        await db.query(
          `INSERT INTO portfolio_items (id, title, client, "techStack", outcome, revenue, status, "completedAt", "createdAt", "updatedAt")
           VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, 'active', NOW(), NOW(), NOW())`,
          [jobData.title || inv.description || inv.clientName, inv.clientName, techStack, jobData.projectNotes || '', inv.amount]
        )
      }
    }
    res.redirect('/projects')
  } catch (err) {
    res.status(500).send('Error: ' + err.message)
  }
})

module.exports = router
