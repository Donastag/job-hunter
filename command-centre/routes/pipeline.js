const router = require('express').Router()
const db = require('../lib/db')

function daysAgo(iso) {
  if (!iso) return '—'
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000)
  return d === 0 ? 'today' : d === 1 ? '1d ago' : `${d}d ago`
}

const STAGES = ['contacted', 'engaged', 'call_booked', 'negotiating', 'won']
const STAGE_LABELS = {
  contacted:   'CONTACTED',
  engaged:     'ENGAGED',
  call_booked: 'CALL BOOKED',
  negotiating: 'NEGOTIATING',
  won:         'WON',
}
const STAGE_COLORS = {
  contacted:   '#3B82F6',
  engaged:     '#8B5CF6',
  call_booked: '#F59E0B',
  negotiating: '#F97316',
  won:         '#10B981',
}

router.get('/', async (req, res) => {
  try {
    const { rows: leads } = await db.query('SELECT * FROM "Lead" ORDER BY "updatedAt" DESC')

    const staged = {}
    STAGES.forEach(s => {
      staged[s] = leads
        .filter(l => l.stage === s)
        .map(l => ({ ...l, ageLabel: daysAgo(l.createdAt) }))
    })

    const totalValue = leads.reduce((s, l) => s + (l.value || 0), 0)
    const wonValue   = (staged.won || []).reduce((s, l) => s + (l.value || 0), 0)

    res.render('pipeline', {
      title: 'Pipeline',
      staged,
      totalValue,
      wonValue,
      totalLeads: leads.length,
      STAGES,
      STAGE_LABELS,
      STAGE_COLORS,
      active: 'pipeline',
    })
  } catch (err) {
    console.error('[Pipeline] Error:', err.message)
    res.status(500).send('Database error: ' + err.message)
  }
})

module.exports = router
