'use client'

import { useState, useEffect } from 'react'

// Types
interface Job {
  id: number
  score: number
  tier: string
  title: string
  budget: string
  type: string
  posted: string
  proposals: number
  client: {
    rating: number
    spent: string
    hired: number
    verified: boolean
  }
  tags: string[]
  status: string
  loom: boolean
  brief: string | null
}

interface PipelineStage {
  stage: string
  count: number
  value: string
  color: string
}

interface Stats {
  label: string
  value: string
  sub: string
}

interface Alert {
  type: string
  time: string
  msg: string
}

// Demo Data
const JOBS: Job[] = [
  {
    id: 1, score: 94, tier: 'priority',
    title: 'AI Workflow Architect — Series A SaaS (n8n + OpenAI)',
    budget: '$4,500', type: 'Fixed', posted: '4 min ago', proposals: 2,
    client: { rating: 4.9, spent: '$87k', hired: 34, verified: true },
    tags: ['n8n', 'OpenAI', 'SaaS', 'AI automation'],
    status: 'new', loom: true,
    brief: 'Client needs an AI-powered lead qualification workflow replacing manual Salesforce entry. Stack is Next.js + Airtable. Budget is real — they\'ve spent well before.',
  },
  {
    id: 2, score: 81, tier: 'alert',
    title: 'Fix Broken Stripe Webhook Integration (Node.js)',
    budget: '$350', type: 'Fixed', posted: '22 min ago', proposals: 7,
    client: { rating: 4.7, spent: '$12k', hired: 18, verified: true },
    tags: ['Node.js', 'Stripe', 'API', 'bug fix'],
    status: 'new', loom: false,
    brief: 'Webhook failing silently on subscription upgrades. Classic missed event type. 2-3 hour job max. Easy review.',
  },
  {
    id: 3, score: 78, tier: 'alert',
    title: 'Security Audit — HealthTech SaaS (HIPAA Compliance Review)',
    budget: '$2,200', type: 'Fixed', posted: '38 min ago', proposals: 4,
    client: { rating: 4.8, spent: '$31k', hired: 9, verified: true },
    tags: ['security', 'HIPAA', 'audit', 'SaaS'],
    status: 'draft', loom: false,
    brief: 'Pre-launch security review for a telehealth platform. They have the budget and urgency. Strong retainer potential post-audit.',
  },
  {
    id: 4, score: 71, tier: 'normal',
    title: 'Build REST API + Admin Dashboard for E-commerce Tool',
    budget: '$85/hr', type: 'Hourly', posted: '1 hr ago', proposals: 11,
    client: { rating: 4.5, spent: '$8k', hired: 6, verified: true },
    tags: ['REST API', 'Next.js', 'dashboard', 'e-commerce'],
    status: 'new', loom: false,
    brief: null,
  },
  {
    id: 5, score: 67, tier: 'normal',
    title: 'Deploy Existing Next.js App to AWS (CI/CD Setup)',
    budget: '$600', type: 'Fixed', posted: '2 hr ago', proposals: 9,
    client: { rating: 4.6, spent: '$4k', hired: 5, verified: true },
    tags: ['AWS', 'CI/CD', 'DevOps', 'Next.js'],
    status: 'applied', loom: false,
    brief: null,
  },
  {
    id: 6, score: 58, tier: 'normal',
    title: 'LangChain Chatbot Integration for Internal Knowledge Base',
    budget: '$1,800', type: 'Fixed', posted: '3 hr ago', proposals: 16,
    client: { rating: 4.3, spent: '$2k', hired: 3, verified: false },
    tags: ['LangChain', 'chatbot', 'Python', 'RAG'],
    status: 'new', loom: false,
    brief: null,
  },
]

const PIPELINE: PipelineStage[] = [
  { stage: 'Contacted', count: 4, value: '$9,200', color: '#6366F1' },
  { stage: 'Engaged', count: 2, value: '$6,800', color: '#8B5CF6' },
  { stage: 'Call Booked', count: 1, value: '$4,500', color: '#F59E0B' },
  { stage: 'Won', count: 3, value: '$7,350', color: '#10B981' },
]

const STATS: Stats[] = [
  { label: 'This Week', value: '12', sub: 'proposals sent' },
  { label: 'Response Rate', value: '31%', sub: '↑ 4% vs last week' },
  { label: 'Win Rate', value: '22%', sub: 'rolling 30 days' },
  { label: 'MTD Revenue', value: '$8,400', sub: 'of $12,000 target' },
  { label: 'Active Pipeline', value: '$20,500', sub: 'weighted value' },
  { label: 'Last Poll', value: '2m ago', sub: 'Upwork + LinkedIn' },
]

const ALERTS: Alert[] = [
  { type: 'priority', time: '4m', msg: 'Score 94 — AI Workflow Architect — $4,500 fixed — 2 proposals' },
  { type: 'alert', time: '22m', msg: 'Score 81 — Stripe Webhook Fix — $350 fixed — 7 proposals' },
  { type: 'signal', time: '1h', msg: 'LinkedIn: Maya Chen (CTO @ FlowDesk) posted about automation pain' },
  { type: 'win', time: '2h', msg: 'Contract won — DevOps Setup — $1,200 — Moved to pipeline' },
  { type: 'alert', time: '3h', msg: 'Score 78 — HIPAA Security Audit — $2,200 — 4 proposals' },
]

const SCORE_COLOR = (s: number) =>
  s >= 85 ? '#10B981' : s >= 75 ? '#6366F1' : s >= 60 ? '#94A3B8' : '#64748B'

const SCORE_BG = (s: number) =>
  s >= 85 ? 'rgba(16,185,129,0.15)' : s >= 75 ? 'rgba(99,102,241,0.15)' : 'rgba(148,163,184,0.1)'

export default function JobHunter() {
  const [tab, setTab] = useState('feed')
  const [selected, setSelected] = useState<Job | null>(null)
  const [filter, setFilter] = useState('all')
  const [pulse, setPulse] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 1800)
    return () => clearInterval(t)
  }, [])

  const filtered = JOBS.filter(j =>
    filter === 'all' ? true :
    filter === 'priority' ? j.score >= 85 :
    filter === 'draft' ? j.status === 'draft' :
    filter === 'applied' ? j.status === 'applied' : true
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
      color: '#F1F5F9',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* TOP NAV */}
      <nav style={{
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
        padding: '0 24px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 700,
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)',
          }}>J</div>
          <div>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
              Job Hunter
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: pulse ? '#10B981' : '#334155',
                transition: 'background 0.4s',
                boxShadow: pulse ? '0 0 12px #10B981' : 'none',
              }} />
              <span style={{ fontSize: 11, color: '#64748B', letterSpacing: '0.05em' }}>LIVE</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, background: 'rgba(30, 41, 59, 0.5)', padding: 4, borderRadius: 12 }}>
          {['feed','pipeline','templates','analytics'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? 'linear-gradient(135deg, #10B981, #059669)' : 'transparent',
              border: 'none',
              color: tab === t ? '#FFFFFF' : '#94A3B8',
              padding: '8px 20px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'inherit',
              transition: 'all 0.2s',
              boxShadow: tab === t ? '0 2px 10px rgba(16, 185, 129, 0.3)' : 'none',
            }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setAlertsOpen(!alertsOpen)} style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#FCA5A5',
            padding: '8px 16px',
            borderRadius: 10,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s',
          }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#EF4444',
              animation: 'ping 1.5s infinite',
            }} />
            Alerts ({ALERTS.length})
          </button>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            color: '#FFFFFF',
            fontWeight: 600,
            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
          }}>OP</div>
        </div>
      </nav>

      {/* ALERT DRAWER */}
      {alertsOpen && (
        <div style={{
          position: 'fixed',
          top: 64,
          right: 0,
          width: 380,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(148, 163, 184, 0.1)',
          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
          zIndex: 40,
          maxHeight: 'calc(100vh - 64px)',
          overflowY: 'auto',
          boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.3)',
        }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
            <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600, letterSpacing: '0.1em' }}>NOTIFICATIONS</span>
          </div>
          {ALERTS.map((a, i) => (
            <div key={i} style={{
              padding: '16px 24px',
              borderBottom: '1px solid rgba(30, 41, 59, 0.5)',
              display: 'flex',
              gap: 14,
              alignItems: 'flex-start',
              background: i === 0 ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
              transition: 'background 0.2s',
            }}>
              <div style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                marginTop: 4,
                flexShrink: 0,
                background: a.type === 'priority' ? '#10B981' : a.type === 'win' ? '#6366F1' :
                  a.type === 'signal' ? '#F59E0B' : '#8B5CF6',
                boxShadow: a.type === 'priority' ? '0 0 10px #10B981' : 'none',
              }} />
              <div>
                <div style={{ fontSize: 13, color: '#E2E8F0', lineHeight: 1.5, fontWeight: 500 }}>{a.msg}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 6 }}>{a.time} ago</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STATS BAR */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
        padding: '0 24px',
        display: 'flex',
        gap: 0,
        overflowX: 'auto',
      }}>
        {STATS.map((s, i) => (
          <div key={i} style={{
            padding: '16px 32px',
            borderRight: '1px solid rgba(148, 163, 184, 0.1)',
            flexShrink: 0,
            minWidth: 160,
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, fontWeight: 500 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: 24, gap: 24 }}>

        {/* FEED TAB */}
        {tab === 'feed' && (
          <div style={{ flex: 1, display: 'flex', gap: 24, overflow: 'hidden' }}>
            {/* Job Feed */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
              {/* Filters */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600, letterSpacing: '0.08em' }}>FILTER</span>
                {['all','priority','draft','applied'].map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    background: filter === f ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(30, 41, 59, 0.5)',
                    border: filter === f ? 'none' : '1px solid rgba(148, 163, 184, 0.1)',
                    color: filter === f ? '#FFFFFF' : '#94A3B8',
                    padding: '6px 16px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    transition: 'all 0.2s',
                  }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
                ))}
                <div style={{ marginLeft: 'auto', fontSize: 12, color: '#64748B' }}>
                  {filtered.length} jobs · Polled 2m ago
                </div>
              </div>

              {/* Job Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {filtered.map(job => (
                  <div key={job.id}
                    onClick={() => setSelected(selected?.id === job.id ? null : job)}
                    style={{
                      background: selected?.id === job.id 
                        ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9))'
                        : 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.4))',
                      border: selected?.id === job.id
                        ? '1px solid rgba(16, 185, 129, 0.5)'
                        : job.tier === 'priority' ? '1px solid rgba(16, 185, 129, 0.3)'
                        : '1px solid rgba(148, 163, 184, 0.1)',
                      borderRadius: 16,
                      padding: 20,
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: job.tier === 'priority' 
                        ? '0 4px 30px rgba(16, 185, 129, 0.15)' 
                        : selected?.id === job.id 
                        ? '0 8px 30px rgba(0, 0, 0, 0.3)'
                        : '0 2px 10px rgba(0, 0, 0, 0.1)',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                      {/* Score Badge */}
                      <div style={{
                        width: 60,
                        height: 60,
                        borderRadius: 16,
                        flexShrink: 0,
                        background: SCORE_BG(job.score),
                        border: `1px solid ${SCORE_COLOR(job.score)}40`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 4px 20px ${SCORE_COLOR(job.score)}20`,
                      }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: SCORE_COLOR(job.score), lineHeight: 1 }}>
                          {job.score}
                        </div>
                        <div style={{ fontSize: 9, color: SCORE_COLOR(job.score) + 'AA', letterSpacing: '0.1em', marginTop: 2 }}>
                          SCORE
                        </div>
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                          {job.tier === 'priority' && (
                            <span style={{
                              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1))',
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              color: '#10B981',
                              fontSize: 10,
                              padding: '4px 10px',
                              borderRadius: 6,
                              letterSpacing: '0.1em',
                              fontWeight: 600,
                            }}>★ PRIORITY</span>
                          )}
                          {job.tier === 'alert' && (
                            <span style={{
                              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.1))',
                              border: '1px solid rgba(99, 102, 241, 0.4)',
                              color: '#818CF8',
                              fontSize: 10,
                              padding: '4px 10px',
                              borderRadius: 6,
                              letterSpacing: '0.1em',
                              fontWeight: 600,
                            }}>★ ALERT</span>
                          )}
                          {job.loom && (
                            <span style={{
                              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.1))',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              color: '#FBBF24',
                              fontSize: 10,
                              padding: '4px 10px',
                              borderRadius: 6,
                              letterSpacing: '0.05em',
                            }}>▶ Loom</span>
                          )}
                          {job.status === 'draft' && (
                            <span style={{
                              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.1))',
                              border: '1px solid rgba(139, 92, 246, 0.4)',
                              color: '#A78BFA',
                              fontSize: 10,
                              padding: '4px 10px',
                              borderRadius: 6,
                              letterSpacing: '0.05em',
                            }}>DRAFT</span>
                          )}
                          {job.status === 'applied' && (
                            <span style={{
                              background: 'linear-gradient(135deg, rgba(100, 116, 139, 0.2), rgba(100, 116, 139, 0.1))',
                              border: '1px solid rgba(100, 116, 139, 0.4)',
                              color: '#94A3B8',
                              fontSize: 10,
                              padding: '4px 10px',
                              borderRadius: 6,
                              letterSpacing: '0.05em',
                            }}>APPLIED</span>
                          )}
                        </div>

                        <div style={{ fontSize: 15, color: '#F8FAFC', fontWeight: 600, lineHeight: 1.4, marginBottom: 10 }}>
                          {job.title}
                        </div>

                        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748B', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ color: '#10B981', fontWeight: 700, fontSize: 14 }}>{job.budget}</span>
                          <span>{job.type}</span>
                          <span>· {job.proposals} proposals</span>
                          <span>· {job.posted}</span>
                          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: '#FBBF24' }}>★</span> {job.client.rating}
                            <span>· {job.client.spent}</span>
                            {job.client.verified && <span style={{ color: '#6366F1' }}>✓</span>}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                          {job.tags.map(t => (
                            <span key={t} style={{
                              background: 'rgba(30, 41, 59, 0.8)',
                              border: '1px solid rgba(148, 163, 184, 0.1)',
                              color: '#94A3B8',
                              fontSize: 11,
                              padding: '4px 10px',
                              borderRadius: 6,
                            }}>{t}</span>
                          ))}
                        </div>

                        {/* Expanded Detail */}
                        {selected?.id === job.id && (
                          <div style={{
                            marginTop: 20,
                            paddingTop: 20,
                            borderTop: '1px solid rgba(148, 163, 184, 0.1)',
                          }}>
                            {job.brief && (
                              <div style={{
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 182, 212, 0.05))',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                borderRadius: 12,
                                padding: 16,
                                marginBottom: 16,
                              }}>
                                <div style={{ fontSize: 10, color: '#10B981', letterSpacing: '0.1em', marginBottom: 8, fontWeight: 600 }}>
                                  AI BRIEF
                                </div>
                                <div style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.6 }}>{job.brief}</div>
                              </div>
                            )}

                            <div style={{ display: 'flex', gap: 10 }}>
                              <button style={{
                                background: 'linear-gradient(135deg, #10B981, #059669)',
                                border: 'none',
                                color: '#FFFFFF',
                                padding: '10px 20px',
                                borderRadius: 10,
                                cursor: 'pointer',
                                fontSize: 12,
                                fontWeight: 600,
                                fontFamily: 'inherit',
                                flex: 1,
                                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                              }}>
                                Open Proposal →
                              </button>
                              {job.loom && (
                                <button style={{
                                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.1))',
                                  border: '1px solid rgba(245, 158, 11, 0.4)',
                                  color: '#FBBF24',
                                  padding: '10px 20px',
                                  borderRadius: 10,
                                  cursor: 'pointer',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  fontFamily: 'inherit',
                                }}>
                                  ▶ Watch Loom
                                </button>
                              )}
                              <button style={{
                                background: 'transparent',
                                border: '1px solid rgba(148, 163, 184, 0.2)',
                                color: '#64748B',
                                padding: '10px 16px',
                                borderRadius: 10,
                                cursor: 'pointer',
                                fontSize: 12,
                                fontFamily: 'inherit',
                              }}>Skip</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Sidebar - Floating */}
            <div style={{
              width: 300,
              background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.4), rgba(15, 23, 42, 0.6))',
              backdropFilter: 'blur(20px)',
              borderRadius: 20,
              border: '1px solid rgba(148, 163, 184, 0.1)',
              overflowY: 'auto',
              padding: 24,
              flexShrink: 0,
              boxShadow: '0 8px 40px rgba(0, 0, 0, 0.2)',
            }}>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, letterSpacing: '0.1em', marginBottom: 20 }}>
                PIPELINE
              </div>
              {PIPELINE.map((stage, i) => (
                <div key={i} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: '#E2E8F0', fontWeight: 500 }}>{stage.stage}</span>
                    <span style={{ fontSize: 13, color: stage.color, fontWeight: 700 }}>{stage.count}</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(30, 41, 59, 0.8)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      borderRadius: 3,
                      width: `${(stage.count / 4) * 100}%`,
                      background: `linear-gradient(90deg, ${stage.color}, ${stage.color}80)`,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 6 }}>{stage.value}</div>
                </div>
              ))}

              <div style={{ height: 1, background: 'rgba(148, 163, 184, 0.1)', margin: '24px 0' }} />

              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, letterSpacing: '0.1em', marginBottom: 20 }}>
                PLATFORMS
              </div>
              {[
                { name: 'Upwork RSS', status: 'active', last: '2m ago', jobs: 312 },
                { name: 'LinkedIn', status: 'active', last: '8m ago', jobs: 89 },
                { name: 'Contra', status: 'pending', last: '—', jobs: 0 },
              ].map((plat, i) => (
                <div key={i} style={{
                  background: 'rgba(30, 41, 59, 0.4)',
                  border: '1px solid rgba(148, 163, 184, 0.1)',
                  borderRadius: 12,
                  padding: '14px 16px',
                  marginBottom: 10,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: '#F1F5F9', fontWeight: 500 }}>{plat.name}</span>
                    <div style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: plat.status === 'active' ? '#10B981' : '#334155',
                      boxShadow: plat.status === 'active' ? '0 0 10px #10B981' : 'none',
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 6 }}>
                    {plat.status === 'active' ? `${plat.last} · ${plat.jobs} jobs` : 'Not connected'}
                  </div>
                </div>
              ))}

              <div style={{ height: 1, background: 'rgba(148, 163, 184, 0.1)', margin: '24px 0' }} />

              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, letterSpacing: '0.1em', marginBottom: 20 }}>
                THIS WEEK
              </div>
              {[
                { label: 'Jobs scored', val: '47' },
                { label: 'Proposals sent', val: '12' },
                { label: 'Responses', val: '4' },
                { label: 'Calls booked', val: '1' },
              ].map((s, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: '1px solid rgba(30, 41, 59, 0.5)',
                }}>
                  <span style={{ fontSize: 12, color: '#64748B' }}>{s.label}</span>
                  <span style={{ fontSize: 12, color: '#F1F5F9', fontWeight: 600 }}>{s.val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PIPELINE TAB */}
        {tab === 'pipeline' && (
          <div style={{ flex: 1, overflowX: 'auto', padding: 8 }}>
            <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, letterSpacing: '0.1em', marginBottom: 24 }}>
              PIPELINE — ALL STAGES
            </div>
            <div style={{ display: 'flex', gap: 20, minWidth: 1100 }}>
              {[
                { stage: 'Contacted', color: '#6366F1', leads: [
                  { name: 'Taylor (FlowSaaS)', value: '$1,200', age: '2d', source: 'Upwork' },
                  { name: 'Marcus (DevOps Co)', value: '$3,500', age: '4d', source: 'LinkedIn' },
                  { name: 'Aisha (HealthTech)', value: '$2,200', age: '1d', source: 'Upwork' },
                  { name: 'Chris (E-comm SaaS)', value: '$2,300', age: '3d', source: 'Direct' },
                ]},
                { stage: 'Engaged', color: '#8B5CF6', leads: [
                  { name: 'Sarah (NovaTech)', value: '$4,500', age: '6d', source: 'LinkedIn' },
                  { name: 'Raj (FinFlow)', value: '$2,300', age: '8d', source: 'Upwork' },
                ]},
                { stage: 'Call Booked', color: '#F59E0B', leads: [
                  { name: 'Maya (FlowDesk)', value: '$4,500', age: '1d', source: 'LinkedIn' },
                ]},
                { stage: 'Negotiating', color: '#F97316', leads: [] },
                { stage: 'Won', color: '#10B981', leads: [
                  { name: 'Ben (CloudPulse)', value: '$1,200', age: '2d', source: 'Upwork' },
                  { name: 'Lisa (RetailAI)', value: '$3,600', age: '5d', source: 'Direct' },
                  { name: 'Tom (DevStream)', value: '$2,550', age: '8d', source: 'Upwork' },
                ]},
              ].map((col, ci) => (
                <div key={ci} style={{ flex: 1, minWidth: 200 }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                    padding: '12px 16px',
                    background: 'rgba(30, 41, 59, 0.5)',
                    borderRadius: 12,
                    border: `1px solid ${col.color}30`,
                  }}>
                    <span style={{ fontSize: 12, color: col.color, letterSpacing: '0.05em', fontWeight: 600 }}>
                      {col.stage}
                    </span>
                    <span style={{
                      background: `${col.color}20`,
                      color: col.color,
                      borderRadius: '50%',
                      width: 24,
                      height: 24,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                    }}>{col.leads.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {col.leads.map((lead, li) => (
                      <div key={li} style={{
                        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.4))',
                        border: '1px solid rgba(148, 163, 184, 0.1)',
                        borderRadius: 12,
                        padding: '14px 16px',
                        borderLeft: `3px solid ${col.color}`,
                      }}>
                        <div style={{ fontSize: 13, color: '#F1F5F9', marginBottom: 8, fontWeight: 500 }}>{lead.name}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, color: col.color, fontWeight: 700 }}>{lead.value}</span>
                          <span style={{ fontSize: 11, color: '#64748B' }}>{lead.age}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 6 }}>{lead.source}</div>
                      </div>
                    ))}
                    {col.leads.length === 0 && (
                      <div style={{
                        background: 'rgba(30, 41, 59, 0.3)',
                        border: '1px dashed rgba(148, 163, 184, 0.2)',
                        borderRadius: 12,
                        padding: '30px 16px',
                        textAlign: 'center',
                        fontSize: 11,
                        color: '#64748B',
                      }}>No leads</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TEMPLATES TAB */}
        {tab === 'templates' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', gap: 24 }}>
            <div style={{ width: 280, flexShrink: 0 }}>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, letterSpacing: '0.1em', marginBottom: 20 }}>
                TEMPLATE LIBRARY
              </div>
              {[
                { id: 'T01', name: 'AI Automation', wins: 8, sent: 22, rate: '36%' },
                { id: 'T02', name: 'API Integration', wins: 5, sent: 18, rate: '28%' },
                { id: 'T03', name: 'SaaS Architecture', wins: 4, sent: 14, rate: '29%' },
                { id: 'T04', name: 'Security Audit', wins: 3, sent: 9, rate: '33%' },
                { id: 'T05', name: 'Bug Fix / Troubleshoot', wins: 6, sent: 19, rate: '32%' },
                { id: 'T06', name: 'Full Stack Build', wins: 2, sent: 11, rate: '18%' },
              ].map((t, i) => (
                <div key={i} style={{
                  background: i === 0 ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.05))' : 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.4))',
                  border: i === 0 ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(148, 163, 184, 0.1)',
                  borderRadius: 14,
                  padding: '14px 18px',
                  marginBottom: 10,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: '#64748B' }}>{t.id}</span>
                    <span style={{ fontSize: 13, color: i === 0 ? '#10B981' : '#94A3B8', fontWeight: 700 }}>{t.rate}</span>
                  </div>
                  <div style={{ fontSize: 14, color: '#F1F5F9', fontWeight: 500 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{t.wins}W / {t.sent} sent</div>
                </div>
              ))}
            </div>
            <div style={{ flex: 1, background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.4))', border: '1px solid rgba(148, 163, 184, 0.1)', borderRadius: 20, padding: 28, backdropFilter: 'blur(10px)' }}>
              <div style={{ fontSize: 12, color: '#10B981', fontWeight: 600, letterSpacing: '0.1em', marginBottom: 6 }}>T01 · BEST PERFORMER</div>
              <div style={{ fontSize: 20, color: '#F8FAFC', fontWeight: 700, marginBottom: 24 }}>AI Automation Template</div>
              <div style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(148, 163, 184, 0.1)',
                borderRadius: 14,
                padding: 24,
                fontSize: 13,
                color: '#94A3B8',
                lineHeight: 1.8,
              }}>
                <span style={{ color: '#64748B' }}>// Auto-filled variables shown in green</span><br /><br />
                I noticed your post about <span style={{ color: '#10B981' }}>{'{{job_title}}'}</span> — specifically the part about <span style={{ color: '#10B981' }}>{'{{pain_point}}'}</span>. That's a pattern I've solved a few times.<br /><br />
                My approach for a setup like yours (<span style={{ color: '#10B981' }}>{'{{detected_stack}}'}</span>) would be to build the automation in layers: start with the core trigger and data validation, then layer the AI logic on top so it's testable at each stage. Cuts debugging time significantly.<br /><br />
                I built something similar for a <span style={{ color: '#10B981' }}>{'{{industry}}'}</span> client recently — you can see how it works in my demo environment: <span style={{ color: '#6366F1' }}>{'{{demo_link}}'}</span><br /><br />
                Quick question: is the main bottleneck the data coming in, or the logic deciding what to do with it?
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button style={{
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  border: 'none',
                  color: '#FFFFFF',
                  padding: '12px 24px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                }}>Edit Template</button>
                <button style={{
                  background: 'transparent',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  color: '#94A3B8',
                  padding: '12px 24px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}>Duplicate</button>
              </div>
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {tab === 'analytics' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, letterSpacing: '0.1em', marginBottom: 28 }}>
              PERFORMANCE ANALYTICS — ROLLING 30 DAYS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
              {[
                { label: 'Proposal Conversion', value: '22%', trend: '+4%', good: true },
                { label: 'Avg Response Time', value: '18 min', trend: '↓ 6 min', good: true },
                { label: 'Top Category Win %', value: '36%', sub: 'AI Automation', good: true },
                { label: 'Avg Contract Value', value: '$1,840', trend: '+$340', good: true },
                { label: 'Proposals / Week', value: '12.4', trend: '↑ 2.1', good: true },
                { label: 'Skipped (low score)', value: '68%', sub: 'of all jobs seen', good: false },
              ].map((m, i) => (
                <div key={i} style={{
                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.4))',
                  border: '1px solid rgba(148, 163, 184, 0.1)',
                  borderRadius: 16,
                  padding: '20px 24px',
                  backdropFilter: 'blur(10px)',
                }}>
                  <div style={{ fontSize: 12, color: '#64748B', letterSpacing: '0.05em', marginBottom: 10, fontWeight: 500 }}>{m.label}</div>
                  <div style={{ fontSize: 32, color: '#F8FAFC', fontWeight: 700, letterSpacing: '-0.02em' }}>{m.value}</div>
                  <div style={{ fontSize: 12, color: m.good ? '#10B981' : '#64748B', marginTop: 8, fontWeight: 500 }}>
                    {m.trend || m.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* Win rate by category */}
            <div style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.4))', border: '1px solid rgba(148, 163, 184, 0.1)', borderRadius: 20, padding: '24px 28px', backdropFilter: 'blur(10px)' }}>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, letterSpacing: '0.1em', marginBottom: 24 }}>
                WIN RATE BY CATEGORY
              </div>
              {[
                { cat: 'AI Automation', rate: 36, wins: 8, sent: 22 },
                { cat: 'Security Audit', rate: 33, wins: 3, sent: 9 },
                { cat: 'Bug Fix / Troubleshoot', rate: 32, wins: 6, sent: 19 },
                { cat: 'SaaS Architecture', rate: 29, wins: 4, sent: 14 },
                { cat: 'API Integration', rate: 28, wins: 5, sent: 18 },
                { cat: 'Full Stack Build', rate: 18, wins: 2, sent: 11 },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
                  <div style={{ width: 160, fontSize: 13, color: '#94A3B8', flexShrink: 0 }}>{row.cat}</div>
                  <div style={{ flex: 1, height: 8, background: 'rgba(30, 41, 59, 0.8)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      borderRadius: 4,
                      width: `${row.rate * 2.5}%`,
                      background: row.rate > 30
                        ? 'linear-gradient(90deg, #10B981, #06B6D4)'
                        : row.rate > 20
                        ? 'linear-gradient(90deg, #6366F1, #8B5CF6)'
                        : '#475569',
                      transition: 'width 0.8s ease',
                    }} />
                  </div>
                  <div style={{ width: 50, fontSize: 13, color: SCORE_COLOR(row.rate + 60), fontWeight: 700, textAlign: 'right' }}>
                    {row.rate}%
                  </div>
                  <div style={{ width: 80, fontSize: 11, color: '#64748B', textAlign: 'right' }}>
                    {row.wins}W / {row.sent}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes ping {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.4); }
        }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.5); }
      `}</style>
    </div>
  )
}
