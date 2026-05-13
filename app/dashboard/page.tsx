'use client'

import { useState, useEffect } from 'react'
import TelegramChat from '@/components/telegram-chat'
import ProposalModal from '@/components/proposal-modal'
import { signOut } from 'next-auth/react'
import { Bell, LogOut, Trash, X, Settings, Key, Globe, User, Shield, Moon, Sun } from 'lucide-react'

interface Job {
  id: string
  title: string
  company: string
  status: string
  description: string
  score: number
  tier: string
  budget: string
  type: string
  posted: string
  proposals: number
  platform: string
  url: string | null
  client: {
    rating: number
    spent: string
    hired: number
    verified: boolean
  }
  tags: string[]
  loom: boolean
  brief: string | null
}

interface PipelineStage {
  stage: string
  count: number
  value: string
  color: string
}

interface Alert {
  type: string
  time: string
  msg: string
}

function mapJob(r: Record<string, unknown>): Job {
  let tags: string[] = []
  try { tags = JSON.parse(r.skills as string || '[]') } catch { tags = [] }
  return {
    id: r.id as string,
    title: r.title as string,
    company: (r.clientName as string) || '',
    status: (r.status as string) || 'new',
    description: (r.description as string) || '',
    score: (r.score as number) || 0,
    tier: (r.tier as string) || 'normal',
    budget: (r.budget as string) || '—',
    type: (r.type as string) || '',
    posted: (r.timeAgo as string) || (r.ageLabel as string) || '—',
    proposals: (r.proposals as number) || 0,
    platform: (r.platform as string) || '',
    url: r.url as string | null,
    client: {
      rating: (r.clientRating as number) || 0,
      spent: (r.clientSpent as string) || '—',
      hired: (r.clientHired as number) || 0,
      verified: (r.clientVerified as boolean) || false,
    },
    tags,
    loom: (r.loom as boolean) || false,
    brief: r.brief as string | null,
  }
}

const PIPELINE_COLORS: Record<string, string> = {
  contacted: "#3B82F6", engaged: "#8B5CF6",
  call_booked: "#F59E0B", negotiating: "#F97316", won: "#10B981",
}

const SCORE_COLOR = (s: number) =>
  s >= 85 ? "#10B981" : s >= 75 ? "#3B82F6" : s >= 60 ? "#94A3B8" : "#64748B";

const SCORE_BG = (s: number) =>
  s >= 85 ? "rgba(16,185,129,0.12)" : s >= 75 ? "rgba(59,130,246,0.12)" : "rgba(100,116,139,0.1)";

export default function DashboardPage() {
  const [tab, setTab] = useState("feed");
  const [selected, setSelected] = useState<Job | null>(null);
  const [filter, setFilter] = useState("all");
  const [pulse, setPulse] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pipeline, setPipeline] = useState<Record<string, Array<{name: string; value: number; source: string; stage: string}>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [jobsRes, pipeRes] = await Promise.all([
          fetch('/api/jobs'),
          fetch('/api/pipeline'),
        ])
        const [jobsData, pipeData] = await Promise.all([jobsRes.json(), pipeRes.json()])
        if (Array.isArray(jobsData)) setJobs(jobsData.map(mapJob))
        if (pipeData && typeof pipeData === 'object') setPipeline(pipeData)
      } catch (e) {
        console.error('fetch error', e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const appliedCount = jobs.filter(j => j.status === 'applied').length
  const priorityCount = jobs.filter(j => j.score >= 85).length
  const today = new Date().toDateString()

  const STATS = [
    { label: "TOTAL JOBS", value: String(jobs.length), sub: "all time" },
    { label: "PRIORITY", value: String(priorityCount), sub: "score ≥ 85" },
    { label: "APPLIED", value: String(appliedCount), sub: "awaiting reply" },
    { label: "WIN RATE", value: "22%", sub: "rolling 30 days" },
    { label: "PIPELINE VALUE", value: "$20,500", sub: "weighted" },
    { label: "LAST POLL", value: "2m ago", sub: "Upwork + LinkedIn" },
  ]

  const PIPELINE_SIDEBAR: PipelineStage[] = Object.entries(PIPELINE_COLORS)
    .map(([key, color]) => {
      const leads = pipeline[key] || []
      const val = leads.reduce((s: number, l: {value: number}) => s + (l.value || 0), 0)
      return {
        stage: key.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
        count: leads.length,
        value: val > 0 ? `$${val.toLocaleString()}` : '$0',
        color,
      }
    })

  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 1800);
    return () => clearInterval(t);
  }, []);

  const filtered = jobs.filter(j =>
    filter === "all" ? true :
    filter === "priority" ? j.score >= 85 :
    filter === "draft" ? j.status === "draft" :
    filter === "applied" ? j.status === "applied" : true
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "#090B0F",
      color: "#E2E8F0",
      fontFamily: "var(--font-geist-sans), 'Inter', system-ui, sans-serif",
      display: "flex", flexDirection: "column",
    }}>
      {/* ── TOP NAV ── */}
      <nav style={{
        background: "#0D1117", borderBottom: "1px solid #1E293B",
        padding: "0 24px", height: 56, display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50,
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: "linear-gradient(135deg, #10B981, #06B6D4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700,
            }}>J</div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9", letterSpacing: "0.05em" }}>
              JOB HUNTER
            </span>
          </div>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: pulse ? "#10B981" : "#064E3B",
            transition: "background 0.4s", boxShadow: pulse ? "0 0 8px #10B981" : "none",
          }} />
          <span style={{ fontSize: 11, color: "#4B5563", letterSpacing: "0.08em" }}>LIVE</span>
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          {["feed","pipeline","templates","analytics"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? "rgba(16,185,129,0.1)" : "transparent",
              border: tab === t ? "1px solid rgba(16,185,129,0.35)" : "1px solid transparent",
              color: tab === t ? "#10B981" : "#64748B",
              padding: "5px 14px", borderRadius: 6, cursor: "pointer",
              fontSize: 11, fontFamily: "inherit", letterSpacing: "0.08em",
              textTransform: "uppercase",
              transition: "all 150ms ease-out",
              fontWeight: tab === t ? 700 : 500,
            }}>{t}</button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setAlertsOpen(!alertsOpen)} style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            color: "#EF4444", padding: "6px 12px", borderRadius: 6, cursor: "pointer",
            fontSize: 11, fontFamily: "inherit", letterSpacing: "0.06em", display: "flex",
            alignItems: "center", gap: 6, position: "relative",
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%", background: "#EF4444",
              animation: "ping 1.5s infinite",
            }} />
            ALERTS · {priorityCount}
          </button>
          <button onClick={() => setAlertsOpen(false)} style={{
            background: "rgba(100,116,139,0.1)", border: "1px solid rgba(100,116,139,0.3)",
            color: "#94A3B8", padding: "6px 12px", borderRadius: 6, cursor: "pointer",
            fontSize: 11, fontFamily: "inherit", letterSpacing: "0.06em", display: "flex",
            alignItems: "center", gap: 6,
          }}>
            <Trash size={12} />
            CLEAR
          </button>
          <div style={{ position: "relative" }}>
            <button 
              onClick={() => setSettingsOpen(!settingsOpen)}
              style={{
                background: "linear-gradient(135deg, #1E293B, #334155)",
                border: "1px solid #334155",
                borderRadius: "50%",
                width: 32, height: 32,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: settingsOpen ? "0 0 15px rgba(16,185,129,0.3)" : "none",
              }}
            >
              <User size={14} color="#94A3B8" />
            </button>
            
            {settingsOpen && (
              <div style={{
                position: "absolute", top: 40, right: 0,
                background: "#0D1117", border: "1px solid #1E293B",
                borderRadius: 8, minWidth: 220, zIndex: 50,
                boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
                animation: "fadeIn 0.2s ease-out",
              }}>
                <div style={{
                  padding: "12px 16px", borderBottom: "1px solid #1E293B",
                  fontSize: 11, color: "#64748B", letterSpacing: "0.06em",
                  background: "rgba(16,185,129,0.05)",
                }}>
                  ACCOUNT SETTINGS
                </div>
                
                <div style={{ padding: "8px 0" }}>
                  {/* Profile Section */}
                  <div style={{ padding: "8px 16px", borderBottom: "1px solid #0F172A" }}>
                    <div style={{ fontSize: 12, color: "#F1F5F9", fontWeight: 600 }}>Oliver P.</div>
                    <div style={{ fontSize: 10, color: "#64748B" }}>oliver@example.com</div>
                  </div>

                  {/* Platform API Settings */}
                  <div style={{ padding: "8px 16px", borderBottom: "1px solid #0F172A" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <Globe size={14} color="#3B82F6" />
                      <span style={{ fontSize: 11, color: "#CBD5E1", fontWeight: 600 }}>Platform API</span>
                    </div>
                    {[
                      { name: "Upwork RSS", status: "active" },
                      { name: "LinkedIn", status: "active" },
                      { name: "Contra", status: "pending" },
                    ].map((plat, i) => (
                      <div key={i} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "6px 8px", borderRadius: 4, margin: "2px 0",
                        background: plat.status === "active" ? "rgba(16,185,129,0.08)" : "rgba(100,116,139,0.08)",
                        border: plat.status === "active" ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(100,116,139,0.3)",
                      }}>
                        <span style={{ fontSize: 10, color: "#94A3B8" }}>{plat.name}</span>
                        <div style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: plat.status === "active" ? "#10B981" : "#334155",
                          boxShadow: plat.status === "active" ? "0 0 6px #10B981" : "none",
                        }} />
                      </div>
                    ))}
                  </div>

                  {/* Security & API Keys */}
                  <div style={{ padding: "8px 16px", borderBottom: "1px solid #0F172A" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <Shield size={14} color="#8B5CF6" />
                      <span style={{ fontSize: 11, color: "#CBD5E1", fontWeight: 600 }}>Security</span>
                    </div>
                    <div style={{ fontSize: 10, color: "#64748B", marginBottom: 4 }}>API Keys & Webhooks</div>
                    <button style={{
                      background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)",
                      color: "#8B5CF6", padding: "4px 8px", borderRadius: 4, cursor: "pointer",
                      fontSize: 10, width: "100%", textAlign: "left",
                    }}>Manage Keys</button>
                  </div>

                  {/* Preferences */}
                  <div style={{ padding: "8px 16px", borderBottom: "1px solid #0F172A" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <Settings size={14} color="#F59E0B" />
                      <span style={{ fontSize: 11, color: "#CBD5E1", fontWeight: 600 }}>Preferences</span>
                    </div>
                    <div style={{ fontSize: 10, color: "#64748B", marginBottom: 4 }}>Theme & Notifications</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button style={{
                        background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)",
                        color: "#F59E0B", padding: "4px 8px", borderRadius: 4, cursor: "pointer",
                        fontSize: 10, flex: 1, display: "flex", alignItems: "center", gap: 4,
                      }}>
                        <Sun size={12} /> Light
                      </button>
                      <button style={{
                        background: "rgba(100,116,139,0.1)", border: "1px solid rgba(100,116,139,0.3)",
                        color: "#94A3B8", padding: "4px 8px", borderRadius: 4, cursor: "pointer",
                        fontSize: 10, flex: 1, display: "flex", alignItems: "center", gap: 4,
                      }}>
                        <Moon size={12} /> Dark
                      </button>
                    </div>
                  </div>

                  {/* Logout */}
                  <div style={{ padding: "8px 16px" }}>
                    <button 
                      onClick={() => signOut()}
                      style={{
                        background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                        color: "#EF4444", padding: "8px 12px", borderRadius: 6, cursor: "pointer",
                        fontSize: 11, width: "100%", display: "flex", alignItems: "center", gap: 8,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.2)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.1)"}
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── ALERT DRAWER ── */}
      {alertsOpen && (
        <div style={{
          position: "fixed", top: 56, right: 0, width: 360,
          background: "#0D1117", borderLeft: "1px solid #1E293B",
          borderBottom: "1px solid #1E293B", zIndex: 40,
          maxHeight: "calc(100vh - 56px)", overflowY: "auto",
        }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #1E293B" }}>
            <span style={{ fontSize: 11, color: "#94A3B8", letterSpacing: "0.1em", fontWeight: 600 }}>RECENT ALERTS</span>
          </div>
          {jobs.filter(j => j.score >= 75).slice(0, 8).map((j, i) => (
            <div key={j.id} style={{
              padding: "14px 20px", borderBottom: "1px solid #0F172A",
              display: "flex", gap: 12, alignItems: "flex-start",
              background: i === 0 ? "rgba(16,185,129,0.04)" : "transparent",
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                background: j.score >= 85 ? "#10B981" : "#3B82F6",
              }} />
              <div>
                <div style={{ fontSize: 12, color: "#CBD5E1", lineHeight: 1.5 }}>
                  Score {j.score} — {j.title.slice(0, 60)}{j.title.length > 60 ? '…' : ''} — {j.budget}
                </div>
                <div style={{ fontSize: 10, color: "#4B5563", marginTop: 4 }}>{j.posted}</div>
              </div>
            </div>
          ))}
          {jobs.filter(j => j.score >= 75).length === 0 && (
            <div style={{ padding: "20px", fontSize: 12, color: "#4B5563" }}>No priority alerts — run hunt to fetch jobs.</div>
          )}
        </div>
      )}

      {/* ── STATS BAR ── */}
      <div style={{
        background: "#0D1117", borderBottom: "1px solid #1E293B",
        padding: "0 24px", display: "flex", gap: 0, overflowX: "auto",
      }}>
        {STATS.map((s, i) => (
          <div key={i} style={{
            padding: "14px 24px", borderRight: "1px solid #1E293B",
            flexShrink: 0, minWidth: 140,
          }}>
            <div style={{
              fontSize: 20, fontWeight: 700, color: "#F1F5F9", letterSpacing: "-0.02em",
              fontFamily: "var(--font-geist-mono), monospace",
            }}>
              {s.value}
            </div>
            <div style={{ fontSize: 10, color: "#64748B", marginTop: 3, letterSpacing: "0.08em" }}>
              {s.label}
            </div>
            <div style={{ fontSize: 10, color: "#4B5563", marginTop: 1 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── FEED TAB ── */}
        {tab === "feed" && (
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            {/* Job Feed */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              {/* Filters */}
              <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#64748B", letterSpacing: "0.08em", marginRight: 4 }}>FILTER</span>
                {["all","priority","draft","applied"].map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    background: filter === f ? "rgba(16,185,129,0.15)" : "rgba(30,41,59,0.5)",
                    border: filter === f ? "1px solid rgba(16,185,129,0.4)" : "1px solid #1E293B",
                    color: filter === f ? "#10B981" : "#64748B",
                    padding: "5px 12px", borderRadius: 4, cursor: "pointer",
                    fontSize: 11, fontFamily: "inherit", letterSpacing: "0.06em",
                    textTransform: "uppercase", transition: "all 0.15s",
                  }}>{f}</button>
                ))}
                <div style={{ marginLeft: "auto", fontSize: 11, color: "#4B5563", fontFamily: "var(--font-geist-mono), monospace" }}>
                  {filtered.length} jobs · last polled 2m ago
                </div>
              </div>

              {/* Job Cards */}
              {loading && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{
                      background: "#0D1117", border: "1px solid #1E2D3D",
                      borderRadius: 8, padding: "16px 18px", borderLeft: "3px solid #1E2D3D",
                    }}>
                      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#111827" }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ height: 13, background: "#111827", borderRadius: 4, width: "60%", marginBottom: 8 }} />
                          <div style={{ height: 11, background: "#111827", borderRadius: 4, width: "40%" }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#4B5563", fontSize: 13 }}>
                  No jobs match this filter — run a hunt to fetch new listings.
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filtered.map(job => (
                  <div key={job.id}
                    onClick={() => setSelected(selected?.id === job.id ? null : job)}
                    style={{
                      background: selected?.id === job.id ? "#0F1A2E" : "#0D1117",
                      borderTop: selected?.id === job.id ? "1px solid rgba(16,185,129,0.4)" : "1px solid #1E293B",
                      borderRight: selected?.id === job.id ? "1px solid rgba(16,185,129,0.4)" : "1px solid #1E293B",
                      borderBottom: selected?.id === job.id ? "1px solid rgba(16,185,129,0.4)" : "1px solid #1E293B",
                      borderLeft: selected?.id === job.id
                        ? "3px solid #10B981"
                        : job.tier === "priority" ? "3px solid rgba(16,185,129,0.55)"
                        : job.tier === "alert" ? "3px solid rgba(59,130,246,0.5)"
                        : "3px solid transparent",
                      borderRadius: 8, padding: "16px 18px", cursor: "pointer",
                      transition: "all 150ms ease-out",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      {/* Score Badge — circular */}
                      <div style={{
                        width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
                        background: SCORE_BG(job.score),
                        border: `2px solid ${SCORE_COLOR(job.score)}55`,
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                        boxShadow: `0 0 16px ${SCORE_COLOR(job.score)}22`,
                        transition: "transform 150ms ease-out",
                      }}>
                        <div style={{
                          fontSize: 17, fontWeight: 700, color: SCORE_COLOR(job.score), lineHeight: 1,
                          fontFamily: "var(--font-geist-mono), monospace",
                        }}>
                          {job.score}
                        </div>
                        <div style={{ fontSize: 7, color: SCORE_COLOR(job.score) + "88", letterSpacing: "0.1em", marginTop: 1 }}>
                          PTS
                        </div>
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                          {job.tier === "priority" && (
                            <span style={{
                              background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)",
                              color: "#10B981", fontSize: 9, padding: "2px 7px", borderRadius: 3,
                              letterSpacing: "0.12em", fontWeight: 700,
                            }}>⬤ PRIORITY</span>
                          )}
                          {job.tier === "alert" && (
                            <span style={{
                              background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)",
                              color: "#3B82F6", fontSize: 9, padding: "2px 7px", borderRadius: 3,
                              letterSpacing: "0.12em", fontWeight: 700,
                            }}>⬤ ALERT</span>
                          )}
                          {job.loom && (
                            <span style={{
                              background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)",
                              color: "#F59E0B", fontSize: 9, padding: "2px 7px", borderRadius: 3,
                              letterSpacing: "0.1em",
                            }}>LOOM</span>
                          )}
                          {job.status === "draft" && (
                            <span style={{
                              background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)",
                              color: "#8B5CF6", fontSize: 9, padding: "2px 7px", borderRadius: 3,
                              letterSpacing: "0.1em",
                            }}>DRAFT READY</span>
                          )}
                          {job.status === "applied" && (
                            <span style={{
                              background: "rgba(100,116,139,0.1)", border: "1px solid #334155",
                              color: "#94A3B8", fontSize: 9, padding: "2px 7px", borderRadius: 3,
                              letterSpacing: "0.1em",
                            }}>APPLIED</span>
                          )}
                        </div>

                        <div style={{ fontSize: 13, color: "#F1F5F9", fontWeight: 600, lineHeight: 1.4, marginBottom: 8 }}>
                          {job.title}
                        </div>

                        <div style={{ display: "flex", gap: 20, fontSize: 11, color: "#94A3B8", flexWrap: "wrap" }}>
                          <span style={{ color: "#10B981", fontWeight: 700, fontFamily: "var(--font-geist-mono), monospace", fontSize: 13 }}>{job.budget}</span>
                          <span style={{ color: "#64748B" }}>{job.type}</span>
                          <span style={{ color: job.proposals < 5 ? "#10B981" : job.proposals < 12 ? "#F59E0B" : "#EF4444", fontFamily: "var(--font-geist-mono), monospace" }}>· {job.proposals} props</span>
                          <span style={{ color: "#64748B" }}>· {job.posted}</span>
                          <span style={{ marginLeft: "auto", color: "#64748B" }}>
                            {job.client.rating}★ · {job.client.spent} spent
                            {job.client.verified && <span style={{ color: "#3B82F6" }}> · verified</span>}
                          </span>
                        </div>

                        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                          {job.tags.map(t => (
                            <span key={t} style={{
                              background: "rgba(30,41,59,0.8)", border: "1px solid #1E2D3D",
                              color: "#64748B", fontSize: 10, padding: "2px 8px", borderRadius: 3,
                              letterSpacing: "0.02em",
                            }}>{t}</span>
                          ))}
                        </div>

                        {/* Expanded Detail */}
                        {selected?.id === job.id && (
                          <div style={{
                            marginTop: 16, paddingTop: 16,
                            borderTop: "1px solid #1E293B",
                          }}>
                            {job.brief && (
                              <div style={{
                                background: "rgba(16,185,129,0.06)",
                                border: "1px solid rgba(16,185,129,0.15)",
                                borderRadius: 6, padding: "12px 14px", marginBottom: 14,
                              }}>
                                <div style={{ fontSize: 9, color: "#10B981", letterSpacing: "0.1em", marginBottom: 6 }}>
                                  AI BRIEF
                                </div>
                                <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.6 }}>{job.brief}</div>
                              </div>
                            )}

                            <div style={{ display: "flex", gap: 8 }}>
                              <button 
                                onClick={() => setProposalModalOpen(true)}
                                style={{
                                  background: "linear-gradient(135deg, #065F46, #047857)",
                                  border: "1px solid #10B981", color: "#10B981",
                                  padding: "8px 16px", borderRadius: 6, cursor: "pointer",
                                  fontSize: 11, fontFamily: "inherit", letterSpacing: "0.08em",
                                  flex: 1,
                                }}>
                                OPEN PROPOSAL →
                              </button>
                              {job.loom && (
                                <button style={{
                                  background: "rgba(245,158,11,0.1)",
                                  border: "1px solid rgba(245,158,11,0.3)", color: "#F59E0B",
                                  padding: "8px 16px", borderRadius: 6, cursor: "pointer",
                                  fontSize: 11, fontFamily: "inherit", letterSpacing: "0.08em",
                                }}>
                                  VIEW LOOM BRIEF
                                </button>
                              )}
                              <button style={{
                                background: "transparent", border: "1px solid #1E293B",
                                color: "#475569", padding: "8px 14px", borderRadius: 6, cursor: "pointer",
                                fontSize: 11, fontFamily: "inherit",
                              }}>SKIP</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Sidebar */}
            <div style={{
              width: 280, borderLeft: "1px solid #1E293B",
              background: "#0D1117", overflowY: "auto", padding: 20,
              flexShrink: 0,
            }}>
              <div style={{ fontSize: 11, color: "#64748B", letterSpacing: "0.1em", marginBottom: 16 }}>
                PIPELINE
              </div>
              {PIPELINE_SIDEBAR.map((stage, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: "#CBD5E1" }}>{stage.stage}</span>
                    <span style={{ fontSize: 11, color: stage.color, fontWeight: 700 }}>{stage.count}</span>
                  </div>
                  <div style={{ height: 3, background: "#1E293B", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 2,
                      width: `${(stage.count / 4) * 100}%`,
                      background: stage.color, transition: "width 0.6s ease",
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#4B5563", marginTop: 4 }}>{stage.value} value</div>
                </div>
              ))}

              <div style={{ height: 1, background: "#1E293B", margin: "24px 0" }} />

              <div style={{ fontSize: 11, color: "#64748B", letterSpacing: "0.1em", marginBottom: 16 }}>
                PLATFORM STATUS
              </div>
              {[
                { name: "Upwork RSS", status: "active", last: "2m ago", jobs: 312 },
                { name: "LinkedIn", status: "active", last: "8m ago", jobs: 89 },
                { name: "Contra", status: "pending", last: "—", jobs: 0 },
              ].map((plat, i) => (
                <div key={i} style={{
                  background: "#080C14", border: "1px solid #1E293B",
                  borderRadius: 6, padding: "10px 12px", marginBottom: 8,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#CBD5E1" }}>{plat.name}</span>
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: plat.status === "active" ? "#10B981" : "#334155",
                      boxShadow: plat.status === "active" ? "0 0 6px #10B981" : "none",
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#4B5563", marginTop: 4 }}>
                    {plat.status === "active" ? `Last: ${plat.last} · ${plat.jobs} jobs indexed` : "Not connected"}
                  </div>
                </div>
              ))}

              <div style={{ height: 1, background: "#1E293B", margin: "24px 0" }} />

              <div style={{ fontSize: 11, color: "#64748B", letterSpacing: "0.1em", marginBottom: 16 }}>
                THIS WEEK
              </div>
              {[
                { label: "Jobs scored", val: "47" },
                { label: "Proposals sent", val: "12" },
                { label: "Responses", val: "4" },
                { label: "Calls booked", val: "1" },
              ].map((s, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "7px 0", borderBottom: "1px solid #0F172A",
                }}>
                  <span style={{ fontSize: 11, color: "#64748B" }}>{s.label}</span>
                  <span style={{ fontSize: 11, color: "#F1F5F9", fontWeight: 700, fontFamily: "var(--font-geist-mono), monospace" }}>{s.val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PIPELINE TAB ── */}
        {tab === "pipeline" && (
          <div style={{ flex: 1, overflowX: "auto", padding: 24 }}>
            <div style={{ fontSize: 11, color: "#64748B", letterSpacing: "0.1em", marginBottom: 20 }}>
              PIPELINE — ALL STAGES
            </div>
            <div style={{ display: "flex", gap: 12, minWidth: 900 }}>
              {Object.entries(PIPELINE_COLORS).map(([key, color], ci) => {
                const leads = (pipeline[key] || []) as Array<{id?: string; name: string; value: number; source: string; ageLabel?: string; createdAt?: string}>
                const colLabel = key.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
                const col = { stage: colLabel, color, leads }
                return (
                <div key={ci} style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column" }}>
                  {/* Column header */}
                  <div style={{
                    padding: "9px 12px", borderRadius: "8px 8px 0 0",
                    background: `${col.color}08`,
                    borderTop: `1px solid ${col.color}40`,
                    borderRight: `1px solid ${col.color}30`,
                    borderLeft: `1px solid ${col.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <span style={{ fontSize: 10, color: col.color, letterSpacing: "0.12em", fontWeight: 700 }}>
                      {col.stage.toUpperCase()}
                    </span>
                    <span style={{
                      background: col.color + "20", color: col.color,
                      borderRadius: "50%", width: 20, height: 20,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700,
                    }}>{col.leads.length}</span>
                  </div>
                  {/* Cards area */}
                  <div style={{
                    flex: 1, display: "flex", flexDirection: "column", gap: 7,
                    background: "#111827", padding: 10,
                    borderLeft: `1px solid ${col.color}25`,
                    borderRight: `1px solid ${col.color}25`,
                    borderBottom: `1px solid ${col.color}25`,
                    borderRadius: "0 0 8px 8px", minHeight: 80,
                  }}>
                    {col.leads.map((lead, li) => {
                      const ageStr = lead.ageLabel || ''
                      const ageDays = parseInt(ageStr)
                      const ageColor = isNaN(ageDays) ? "#10B981" : ageDays <= 2 ? "#10B981" : ageDays <= 7 ? "#F59E0B" : "#EF4444"
                      return (
                        <div key={lead.id || li} style={{
                          background: "#0D1117",
                          borderTop: "1px solid #1E293B",
                          borderRight: "1px solid #1E293B",
                          borderBottom: "1px solid #1E293B",
                          borderLeft: `3px solid ${col.color}`,
                          borderRadius: 6, padding: "10px 12px",
                        }}>
                          <div style={{ fontSize: 12, color: "#E2E8F0", fontWeight: 600, marginBottom: 6 }}>{lead.name}</div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                            <span style={{ fontSize: 12, color: col.color, fontWeight: 700, fontFamily: "var(--font-geist-mono), monospace" }}>
                              ${(lead.value || 0).toLocaleString()}
                            </span>
                            <span style={{ fontSize: 10, fontFamily: "var(--font-geist-mono), monospace", color: ageColor }}>
                              {ageStr || '—'}
                            </span>
                          </div>
                          <span style={{
                            display: "inline-block", padding: "1px 7px", borderRadius: 3,
                            fontSize: 9, fontWeight: 600, letterSpacing: "0.08em",
                            color: "#4B5563", background: "rgba(30,41,59,0.5)", border: "1px solid #1E293B",
                            textTransform: "uppercase",
                          }}>{lead.source || 'manual'}</span>
                        </div>
                      )
                    })}
                    {col.leads.length === 0 && (
                      <div style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                        border: "1px dashed #1E293B", borderRadius: 6, padding: "24px 12px",
                        fontSize: 10, color: "#2D3748", letterSpacing: "0.06em",
                      }}>EMPTY</div>
                    )}
                  </div>
                </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── TEMPLATES TAB ── */}
        {tab === "templates" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", gap: 20 }}>
            <div style={{ width: 260, flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: "#64748B", letterSpacing: "0.1em", marginBottom: 16 }}>
                TEMPLATE LIBRARY
              </div>
              {[
                { id: "T01", name: "AI Automation", wins: 8, sent: 22, rate: "36%" },
                { id: "T02", name: "API Integration", wins: 5, sent: 18, rate: "28%" },
                { id: "T03", name: "SaaS Architecture", wins: 4, sent: 14, rate: "29%" },
                { id: "T04", name: "Security Audit", wins: 3, sent: 9, rate: "33%" },
                { id: "T05", name: "Bug Fix / Troubleshoot", wins: 6, sent: 19, rate: "32%" },
                { id: "T06", name: "Full Stack Build", wins: 2, sent: 11, rate: "18%" },
              ].map((t, i) => (
                <div key={i} style={{
                  background: i === 0 ? "rgba(16,185,129,0.08)" : "#0D1117",
                  border: i === 0 ? "1px solid rgba(16,185,129,0.3)" : "1px solid #1E293B",
                  borderRadius: 6, padding: "10px 14px", marginBottom: 8, cursor: "pointer",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: "#475569" }}>{t.id}</span>
                    <span style={{ fontSize: 11, color: i === 0 ? "#10B981" : "#64748B", fontWeight: 700 }}>{t.rate}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#E2E8F0" }}>{t.name}</div>
                  <div style={{ fontSize: 10, color: "#4B5563", marginTop: 4 }}>{t.wins}W / {t.sent} sent</div>
                </div>
              ))}
            </div>
            <div style={{ flex: 1, background: "#0D1117", border: "1px solid #1E293B", borderRadius: 8, padding: 24 }}>
              <div style={{ fontSize: 11, color: "#10B981", letterSpacing: "0.1em", marginBottom: 4 }}>T01 · BEST PERFORMER · 36% WIN RATE</div>
              <div style={{ fontSize: 16, color: "#F1F5F9", fontWeight: 700, marginBottom: 20 }}>AI Automation Template</div>
              <div style={{
                background: "#080C14", border: "1px solid #1E293B", borderRadius: 6,
                padding: 20, fontSize: 12, color: "#94A3B8", lineHeight: 1.8,
              }}>
                <span style={{ color: "#475569" }}>{"// Auto-filled variables shown in green"}</span><br /><br />
                I noticed your post about <span style={{ color: "#10B981" }}>{"{{job_title}}"}</span> — specifically the part about <span style={{ color: "#10B981" }}>{"{{pain_point}}"}</span>. That's a pattern I've solved a few times.<br /><br />
                My approach for a setup like yours (<span style={{ color: "#10B981" }}>{"{{detected_stack}}"}</span>) would be to build the automation in layers: start with the core trigger and data validation, then layer the AI logic on top so it's testable at each stage. Cuts debugging time significantly.<br /><br />
                I built something similar for a <span style={{ color: "#10B981" }}>{"{{industry}}"}</span> client recently — you can see how it works in my demo environment: <span style={{ color: "#3B82F6" }}>{"{{demo_link}}"}</span><br /><br />
                Quick question: is the main bottleneck the data coming in, or the logic deciding what to do with it?
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button style={{
                  background: "linear-gradient(135deg, #065F46, #047857)",
                  border: "1px solid #10B981", color: "#10B981",
                  padding: "9px 20px", borderRadius: 6, cursor: "pointer",
                  fontSize: 11, fontFamily: "inherit", letterSpacing: "0.08em",
                }}>EDIT TEMPLATE</button>
                <button style={{
                  background: "transparent", border: "1px solid #1E293B",
                  color: "#64748B", padding: "9px 20px", borderRadius: 6, cursor: "pointer",
                  fontSize: 11, fontFamily: "inherit",
                }}>DUPLICATE</button>
              </div>
            </div>
          </div>
        )}

        {/* ── ANALYTICS TAB ── */}
        {tab === "analytics" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
            <div style={{ fontSize: 11, color: "#64748B", letterSpacing: "0.1em", marginBottom: 24 }}>
              PERFORMANCE ANALYTICS — ROLLING 30 DAYS
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
              {[
                { label: "Proposal Conversion", value: "22%", trend: "+4%", good: true },
                { label: "Avg Response Time", value: "18 min", trend: "↓ 6 min", good: true },
                { label: "Top Category Win %", value: "36%", sub: "AI Automation", good: true },
                { label: "Avg Contract Value", value: "$1,840", trend: "+$340", good: true },
                { label: "Proposals / Week", value: "12.4", trend: "↑ 2.1", good: true },
                { label: "Skipped (low score)", value: "68%", sub: "of all jobs seen", good: false },
              ].map((m, i) => (
                <div key={i} style={{
                  background: "#0D1117",
                  borderTop: `2px solid ${m.good ? "rgba(16,185,129,0.35)" : "rgba(100,116,139,0.25)"}`,
                  borderRight: "1px solid #1E293B",
                  borderBottom: "1px solid #1E293B",
                  borderLeft: "1px solid #1E293B",
                  borderRadius: 8, padding: "18px 20px",
                }}>
                  <div style={{ fontSize: 11, color: "#64748B", letterSpacing: "0.06em", marginBottom: 10 }}>{m.label}</div>
                  <div style={{
                    fontSize: 28, color: "#F1F5F9", fontWeight: 700, letterSpacing: "-0.02em",
                    fontFamily: "var(--font-geist-mono), monospace",
                  }}>{m.value}</div>
                  <div style={{ fontSize: 11, color: m.good ? "#10B981" : "#64748B", marginTop: 8 }}>
                    {m.trend || m.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* Win rate by category */}
            <div style={{ background: "#0D1117", border: "1px solid #1E293B", borderRadius: 8, padding: "20px 24px" }}>
              <div style={{ fontSize: 11, color: "#64748B", letterSpacing: "0.1em", marginBottom: 20 }}>
                WIN RATE BY CATEGORY
              </div>
              {[
                { cat: "AI Automation", rate: 36, wins: 8, sent: 22 },
                { cat: "Security Audit", rate: 33, wins: 3, sent: 9 },
                { cat: "Bug Fix / Troubleshoot", rate: 32, wins: 6, sent: 19 },
                { cat: "SaaS Architecture", rate: 29, wins: 4, sent: 14 },
                { cat: "API Integration", rate: 28, wins: 5, sent: 18 },
                { cat: "Full Stack Build", rate: 18, wins: 2, sent: 11 },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
                  <div style={{ width: 160, fontSize: 12, color: "#94A3B8", flexShrink: 0 }}>{row.cat}</div>
                  <div style={{ flex: 1, height: 6, background: "#1E293B", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 3,
                      width: `${row.rate * 2.5}%`,
                      background: row.rate > 30
                        ? "linear-gradient(90deg, #10B981, #06B6D4)"
                        : row.rate > 20
                        ? "linear-gradient(90deg, #3B82F6, #8B5CF6)"
                        : "#475569",
                      transition: "width 0.8s ease",
                    }} />
                  </div>
                  <div style={{ width: 44, fontSize: 12, color: SCORE_COLOR(row.rate + 60), fontWeight: 700, textAlign: "right", fontFamily: "var(--font-geist-mono), monospace" }}>
                    {row.rate}%
                  </div>
                  <div style={{ width: 80, fontSize: 10, color: "#4B5563", textAlign: "right", fontFamily: "var(--font-geist-mono), monospace" }}>
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
          50%       { opacity: 0.6; transform: scale(1.4); }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #080C14; }
        ::-webkit-scrollbar-thumb { background: #1E293B; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: #2D3748; }
      `}</style>

      {/* Proposal Modal */}
      <ProposalModal
        isOpen={proposalModalOpen}
        onClose={() => setProposalModalOpen(false)}
        job={selected}
      />
    </div>
  )
}
