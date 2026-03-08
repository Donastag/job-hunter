'use client'

import { useState, useEffect } from 'react'
import TelegramChat from '@/components/telegram-chat'

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

interface Stat {
  label: string
  value: string
  sub: string
}

interface Alert {
  type: string
  time: string
  msg: string
}

const JOBS = [
  {
    id: 1, score: 94, tier: "priority",
    title: "AI Workflow Architect — Series A SaaS (n8n + OpenAI)",
    budget: "$4,500", type: "Fixed", posted: "4 min ago", proposals: 2,
    client: { rating: 4.9, spent: "$87k", hired: 34, verified: true },
    tags: ["n8n", "OpenAI", "SaaS", "AI automation"],
    status: "new", loom: true,
    brief: "Client needs an AI-powered lead qualification workflow replacing manual Salesforce entry. Stack is Next.js + Airtable. Budget is real — they've spent well before.",
  },
  {
    id: 2, score: 81, tier: "alert",
    title: "Fix Broken Stripe Webhook Integration (Node.js)",
    budget: "$350", type: "Fixed", posted: "22 min ago", proposals: 7,
    client: { rating: 4.7, spent: "$12k", hired: 18, verified: true },
    tags: ["Node.js", "Stripe", "API", "bug fix"],
    status: "new", loom: false,
    brief: "Webhook failing silently on subscription upgrades. Classic missed event type. 2-3 hour job max. Easy review.",
  },
  {
    id: 3, score: 78, tier: "alert",
    title: "Security Audit — HealthTech SaaS (HIPAA Compliance Review)",
    budget: "$2,200", type: "Fixed", posted: "38 min ago", proposals: 4,
    client: { rating: 4.8, spent: "$31k", hired: 9, verified: true },
    tags: ["security", "HIPAA", "audit", "SaaS"],
    status: "draft", loom: false,
    brief: "Pre-launch security review for a telehealth platform. They have the budget and urgency. Strong retainer potential post-audit.",
  },
  {
    id: 4, score: 71, tier: "normal",
    title: "Build REST API + Admin Dashboard for E-commerce Tool",
    budget: "$85/hr", type: "Hourly", posted: "1 hr ago", proposals: 11,
    client: { rating: 4.5, spent: "$8k", hired: 6, verified: true },
    tags: ["REST API", "Next.js", "dashboard", "e-commerce"],
    status: "new", loom: false,
    brief: null,
  },
  {
    id: 5, score: 67, tier: "normal",
    title: "Deploy Existing Next.js App to AWS (CI/CD Setup)",
    budget: "$600", type: "Fixed", posted: "2 hr ago", proposals: 9,
    client: { rating: 4.6, spent: "$4k", hired: 5, verified: true },
    tags: ["AWS", "CI/CD", "DevOps", "Next.js"],
    status: "applied", loom: false,
    brief: null,
  },
  {
    id: 6, score: 58, tier: "normal",
    title: "LangChain Chatbot Integration for Internal Knowledge Base",
    budget: "$1,800", type: "Fixed", posted: "3 hr ago", proposals: 16,
    client: { rating: 4.3, spent: "$2k", hired: 3, verified: false },
    tags: ["LangChain", "chatbot", "Python", "RAG"],
    status: "new", loom: false,
    brief: null,
  },
];

const PIPELINE = [
  { stage: "Contacted", count: 4, value: "$9,200", color: "#3B82F6" },
  { stage: "Engaged", count: 2, value: "$6,800", color: "#8B5CF6" },
  { stage: "Call Booked", count: 1, value: "$4,500", color: "#F59E0B" },
  { stage: "Won", count: 3, value: "$7,350", color: "#10B981" },
];

const STATS = [
  { label: "This Week", value: "12", sub: "proposals sent" },
  { label: "Response Rate", value: "31%", sub: "↑ 4% vs last week" },
  { label: "Win Rate", value: "22%", sub: "rolling 30 days" },
  { label: "MTD Revenue", value: "$8,400", sub: "of $12,000 target" },
  { label: "Active Pipeline", value: "$20,500", sub: "weighted value" },
  { label: "Last Poll", value: "2m ago", sub: "Upwork + LinkedIn" },
];

const ALERTS = [
  { type: "priority", time: "4m", msg: "Score 94 — AI Workflow Architect — $4,500 fixed — 2 proposals" },
  { type: "alert", time: "22m", msg: "Score 81 — Stripe Webhook Fix — $350 fixed — 7 proposals" },
  { type: "signal", time: "1h", msg: "LinkedIn: Maya Chen (CTO @ FlowDesk) posted about automation pain" },
  { type: "win", time: "2h", msg: "Contract won — DevOps Setup — $1,200 — Moved to pipeline" },
  { type: "alert", time: "3h", msg: "Score 78 — HIPAA Security Audit — $2,200 — 4 proposals" },
];

const SCORE_COLOR = (s: number) =>
  s >= 85 ? "#10B981" : s >= 75 ? "#3B82F6" : s >= 60 ? "#94A3B8" : "#64748B";

const SCORE_BG = (s: number) =>
  s >= 85 ? "rgba(16,185,129,0.12)" : s >= 75 ? "rgba(59,130,246,0.12)" : "rgba(100,116,139,0.1)";

const TIER_LABEL = { priority: "PRIORITY", alert: "ALERT", normal: "" };

export default function DashboardPage() {
  const [tab, setTab] = useState("feed");
  const [selected, setSelected] = useState<Job | null>(null);
  const [filter, setFilter] = useState("all");
  const [pulse, setPulse] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 1800);
    return () => clearInterval(t);
  }, []);

  const filtered = JOBS.filter(j =>
    filter === "all" ? true :
    filter === "priority" ? j.score >= 85 :
    filter === "draft" ? j.status === "draft" :
    filter === "applied" ? j.status === "applied" : true
  );

  return (
    <div style={{
      minHeight: "100vh", 
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
      color: "#E2E8F0",
      fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      display: "flex", flexDirection: "column",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Animated Background Grid */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        background: `
          linear-gradient(rgba(59,130,246,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59,130,246,0.1) 1px, transparent 1px)
        `,
        backgroundSize: "50px 50px",
        opacity: 0.3,
        animation: "gridMove 20s linear infinite",
        pointerEvents: "none",
        zIndex: 0,
      }} />
      
      {/* Floating Particles */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: "none", zIndex: 1,
      }}>
        <div style={{
          position: "absolute", top: "10%", left: "10%",
          width: 4, height: 4, background: "#10B981", borderRadius: "50%",
          animation: "float 6s ease-in-out infinite", opacity: 0.6,
        }} />
        <div style={{
          position: "absolute", top: "20%", right: "15%",
          width: 3, height: 3, background: "#3B82F6", borderRadius: "50%",
          animation: "float 8s ease-in-out infinite reverse", opacity: 0.5,
        }} />
        <div style={{
          position: "absolute", bottom: "15%", left: "20%",
          width: 5, height: 5, background: "#F59E0B", borderRadius: "50%",
          animation: "float 10s ease-in-out infinite", opacity: 0.7,
        }} />
        <div style={{
          position: "absolute", top: "60%", right: "25%",
          width: 3, height: 3, background: "#8B5CF6", borderRadius: "50%",
          animation: "float 7s ease-in-out infinite reverse", opacity: 0.5,
        }} />
      </div>
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
          <span style={{ fontSize: 11, color: "#475569", letterSpacing: "0.08em" }}>LIVE</span>
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          {["feed","pipeline","templates","analytics"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? "rgba(16,185,129,0.1)" : "transparent",
              border: tab === t ? "1px solid rgba(16,185,129,0.3)" : "1px solid transparent",
              color: tab === t ? "#10B981" : "#64748B",
              padding: "6px 14px", borderRadius: 6, cursor: "pointer",
              fontSize: 11, fontFamily: "inherit", letterSpacing: "0.08em",
              textTransform: "uppercase", transition: "all 0.15s",
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
            ALERTS ·{ALERTS.length}
          </button>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "linear-gradient(135deg, #1E293B, #334155)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, color: "#94A3B8", border: "1px solid #334155",
          }}>OP</div>
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
            <span style={{ fontSize: 11, color: "#64748B", letterSpacing: "0.1em" }}>RECENT ALERTS</span>
          </div>
          {ALERTS.map((a, i) => (
            <div key={i} style={{
              padding: "14px 20px", borderBottom: "1px solid #0F172A",
              display: "flex", gap: 12, alignItems: "flex-start",
              background: i === 0 ? "rgba(16,185,129,0.04)" : "transparent",
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                background: a.type === "priority" ? "#10B981" : a.type === "win" ? "#3B82F6" :
                  a.type === "signal" ? "#F59E0B" : "#8B5CF6",
              }} />
              <div>
                <div style={{ fontSize: 12, color: "#CBD5E1", lineHeight: 1.5 }}>{a.msg}</div>
                <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>{a.time} ago</div>
              </div>
            </div>
          ))}
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
            <div style={{ fontSize: 18, fontWeight: 700, color: "#F1F5F9", letterSpacing: "-0.02em" }}>
              {s.value}
            </div>
            <div style={{ fontSize: 10, color: "#475569", marginTop: 2, letterSpacing: "0.06em" }}>
              {s.label}
            </div>
            <div style={{ fontSize: 10, color: "#334155", marginTop: 1 }}>{s.sub}</div>
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
                <span style={{ fontSize: 11, color: "#475569", letterSpacing: "0.08em", marginRight: 4 }}>FILTER</span>
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
                <div style={{ marginLeft: "auto", fontSize: 11, color: "#334155" }}>
                  {filtered.length} jobs · last polled 2m ago
                </div>
              </div>

              {/* Job Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filtered.map(job => (
                  <div key={job.id}
                    onClick={() => setSelected(selected?.id === job.id ? null : job)}
                    style={{
                      background: selected?.id === job.id ? "#0F1A2E" : "#0D1117",
                      border: selected?.id === job.id
                        ? "1px solid rgba(16,185,129,0.4)"
                        : job.tier === "priority" ? "1px solid rgba(16,185,129,0.2)"
                        : "1px solid #1E293B",
                      borderRadius: 8, padding: "16px 18px", cursor: "pointer",
                      transition: "all 0.15s",
                      boxShadow: job.tier === "priority" ? "0 0 20px rgba(16,185,129,0.06)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      {/* Score Badge */}
                      <div style={{
                        width: 52, height: 52, borderRadius: 8, flexShrink: 0,
                        background: SCORE_BG(job.score),
                        border: `1px solid ${SCORE_COLOR(job.score)}40`,
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                        position: "relative",
                        boxShadow: `0 0 15px ${SCORE_COLOR(job.score)}20`,
                        transition: "all 0.3s ease",
                      }}>
                        {/* Inner glow effect */}
                        <div style={{
                          position: "absolute", inset: -2, borderRadius: 8,
                          background: `radial-gradient(circle at center, ${SCORE_COLOR(job.score)}30 0%, transparent 70%)`,
                          zIndex: -1,
                        }} />
                        <div style={{ fontSize: 18, fontWeight: 700, color: SCORE_COLOR(job.score), lineHeight: 1 }}>
                          {job.score}
                        </div>
                        <div style={{ fontSize: 8, color: SCORE_COLOR(job.score) + "99", letterSpacing: "0.06em" }}>
                          SCORE
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
                            }}>🎥 LOOM</span>
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

                        <div style={{ display: "flex", gap: 20, fontSize: 11, color: "#64748B", flexWrap: "wrap" }}>
                          <span style={{ color: "#10B981", fontWeight: 700 }}>{job.budget}</span>
                          <span>{job.type}</span>
                          <span>· {job.proposals} proposals</span>
                          <span>· {job.posted}</span>
                          <span style={{ marginLeft: "auto" }}>
                            {job.client.rating}★ · {job.client.spent} spent
                            {job.client.verified && <span style={{ color: "#3B82F6" }}> · ✓ verified</span>}
                          </span>
                        </div>

                        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                          {job.tags.map(t => (
                            <span key={t} style={{
                              background: "rgba(30,41,59,0.8)", border: "1px solid #1E293B",
                              color: "#94A3B8", fontSize: 10, padding: "2px 8px", borderRadius: 3,
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
                              <button style={{
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
              <div style={{ fontSize: 11, color: "#475569", letterSpacing: "0.1em", marginBottom: 16 }}>
                PIPELINE
              </div>
              {PIPELINE.map((stage, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: "#94A3B8" }}>{stage.stage}</span>
                    <span style={{ fontSize: 11, color: stage.color, fontWeight: 700 }}>{stage.count}</span>
                  </div>
                  <div style={{ height: 3, background: "#1E293B", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 2,
                      width: `${(stage.count / 4) * 100}%`,
                      background: stage.color, transition: "width 0.6s ease",
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#334155", marginTop: 4 }}>{stage.value} value</div>
                </div>
              ))}

              <div style={{ height: 1, background: "#1E293B", margin: "24px 0" }} />

              <div style={{ fontSize: 11, color: "#475569", letterSpacing: "0.1em", marginBottom: 16 }}>
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
                  <div style={{ fontSize: 10, color: "#334155", marginTop: 4 }}>
                    {plat.status === "active" ? `Last: ${plat.last} · ${plat.jobs} jobs indexed` : "Not connected"}
                  </div>
                </div>
              ))}

              <div style={{ height: 1, background: "#1E293B", margin: "24px 0" }} />

              <div style={{ fontSize: 11, color: "#475569", letterSpacing: "0.1em", marginBottom: 16 }}>
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
                  <span style={{ fontSize: 11, color: "#F1F5F9", fontWeight: 700 }}>{s.val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PIPELINE TAB ── */}
        {tab === "pipeline" && (
          <div style={{ flex: 1, overflowX: "auto", padding: 24 }}>
            <div style={{ fontSize: 11, color: "#475569", letterSpacing: "0.1em", marginBottom: 20 }}>
              PIPELINE — ALL STAGES
            </div>
            <div style={{ display: "flex", gap: 12, minWidth: 900 }}>
              {[
                { stage: "Contacted", color: "#3B82F6", leads: [
                  { name: "Taylor (FlowSaaS)", value: "$1,200", age: "2d", source: "Upwork" },
                  { name: "Marcus (DevOps Co)", value: "$3,500", age: "4d", source: "LinkedIn" },
                  { name: "Aisha (HealthTech)", value: "$2,200", age: "1d", source: "Upwork" },
                  { name: "Chris (E-comm SaaS)", value: "$2,300", age: "3d", source: "Direct" },
                ]},
                { stage: "Engaged", color: "#8B5CF6", leads: [
                  { name: "Sarah (NovaTech)", value: "$4,500", age: "6d", source: "LinkedIn" },
                  { name: "Raj (FinFlow)", value: "$2,300", age: "8d", source: "Upwork" },
                ]},
                { stage: "Call Booked", color: "#F59E0B", leads: [
                  { name: "Maya (FlowDesk)", value: "$4,500", age: "1d", source: "LinkedIn" },
                ]},
                { stage: "Negotiating", color: "#F97316", leads: [] },
                { stage: "Won", color: "#10B981", leads: [
                  { name: "Ben (CloudPulse)", value: "$1,200", age: "2d", source: "Upwork" },
                  { name: "Lisa (RetailAI)", value: "$3,600", age: "5d", source: "Direct" },
                  { name: "Tom (DevStream)", value: "$2,550", age: "8d", source: "Upwork" },
                ]},
              ].map((col, ci) => (
                <div key={ci} style={{ flex: 1, minWidth: 180 }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginBottom: 10, padding: "8px 12px",
                    background: "rgba(30,41,59,0.4)", borderRadius: 6,
                    border: `1px solid ${col.color}30`,
                  }}>
                    <span style={{ fontSize: 10, color: col.color, letterSpacing: "0.1em", fontWeight: 700 }}>
                      {col.stage.toUpperCase()}
                    </span>
                    <span style={{
                      background: col.color + "20", color: col.color,
                      borderRadius: "50%", width: 20, height: 20,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700,
                    }}>{col.leads.length}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {col.leads.map((lead, li) => (
                      <div key={li} style={{
                        background: "#0D1117", border: "1px solid #1E293B",
                        borderRadius: 6, padding: "10px 12px",
                        borderLeft: `2px solid ${col.color}`,
                      }}>
                        <div style={{ fontSize: 12, color: "#E2E8F0", marginBottom: 6 }}>{lead.name}</div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 10, color: col.color, fontWeight: 700 }}>{lead.value}</span>
                          <span style={{ fontSize: 10, color: "#334155" }}>{lead.age} ago</span>
                        </div>
                        <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>{lead.source}</div>
                      </div>
                    ))}
                    {col.leads.length === 0 && (
                      <div style={{
                        background: "rgba(30,41,59,0.2)", border: "1px dashed #1E293B",
                        borderRadius: 6, padding: "20px 12px", textAlign: "center",
                        fontSize: 10, color: "#334155",
                      }}>empty</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TEMPLATES TAB ── */}
        {tab === "templates" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", gap: 20 }}>
            <div style={{ width: 260, flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: "#475569", letterSpacing: "0.1em", marginBottom: 16 }}>
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
                  <div style={{ fontSize: 10, color: "#334155", marginTop: 4 }}>{t.wins}W / {t.sent} sent</div>
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
            <div style={{ fontSize: 11, color: "#475569", letterSpacing: "0.1em", marginBottom: 24 }}>
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
                  background: "#0D1117", border: "1px solid #1E293B",
                  borderRadius: 8, padding: "18px 20px",
                }}>
                  <div style={{ fontSize: 11, color: "#475569", letterSpacing: "0.06em", marginBottom: 8 }}>{m.label}</div>
                  <div style={{ fontSize: 28, color: "#F1F5F9", fontWeight: 700, letterSpacing: "-0.02em" }}>{m.value}</div>
                  <div style={{ fontSize: 11, color: m.good ? "#10B981" : "#64748B", marginTop: 6 }}>
                    {m.trend || m.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* Win rate by category */}
            <div style={{ background: "#0D1117", border: "1px solid #1E293B", borderRadius: 8, padding: "20px 24px" }}>
              <div style={{ fontSize: 11, color: "#475569", letterSpacing: "0.1em", marginBottom: 20 }}>
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
                  <div style={{ width: 40, fontSize: 12, color: SCORE_COLOR(row.rate + 60), fontWeight: 700, textAlign: "right" }}>
                    {row.rate}%
                  </div>
                  <div style={{ width: 80, fontSize: 10, color: "#334155", textAlign: "right" }}>
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
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(180deg); }
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #080C14; }
        ::-webkit-scrollbar-thumb { background: #1E293B; border-radius: 2px; }
      `}</style>
    </div>
  )
}
