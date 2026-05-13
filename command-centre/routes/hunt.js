const router = require('express').Router()
const db = require('../lib/db')

function timeAgo(iso) {
  if (!iso) return '—'
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

router.get('/', async (req, res) => {
  try {
    const { filter = 'all' } = req.query
    const today = new Date(); today.setHours(0, 0, 0, 0)

    const [total, todayCount, priority, applied] = await Promise.all([
      db.query('SELECT COUNT(*)::int AS c FROM "Job"'),
      db.query('SELECT COUNT(*)::int AS c FROM "Job" WHERE "fetchedAt" >= $1', [today]),
      db.query('SELECT COUNT(*)::int AS c FROM "Job" WHERE score >= 85'),
      db.query(`SELECT COUNT(*)::int AS c FROM "Job" WHERE status = 'applied'`),
    ])

    const stats = {
      total:    total.rows[0].c,
      today:    todayCount.rows[0].c,
      priority: priority.rows[0].c,
      applied:  applied.rows[0].c,
    }

    const filterClauses = {
      all:      '',
      priority: 'WHERE score >= 85',
      alert:    'WHERE score >= 75 AND score < 85',
      applied:  `WHERE status = 'applied'`,
      new:      `WHERE status = 'new'`,
    }
    const clause = filterClauses[filter] || ''
    const jobsRes = await db.query(
      `SELECT * FROM "Job" ${clause} ORDER BY score DESC LIMIT 100`
    )

    const jobs = jobsRes.rows.map(j => ({
      ...j,
      skills: (() => { try { return JSON.parse(j.skills || '[]') } catch { return [] } })(),
      timeAgo: timeAgo(j.fetchedAt),
    }))

    const lastRes = await db.query('SELECT "fetchedAt" FROM "Job" ORDER BY "fetchedAt" DESC LIMIT 1')
    const lastJob = lastRes.rows[0]

    res.render('hunt', {
      title: 'Hunt',
      jobs,
      filter,
      stats,
      lastPoll: lastJob?.fetchedAt ? new Date(lastJob.fetchedAt).toLocaleTimeString() : 'Never',
      active: 'hunt',
    })
  } catch (err) {
    console.error('[Hunt] Error:', err.message)
    res.status(500).send('Database error: ' + err.message)
  }
})

module.exports = router
