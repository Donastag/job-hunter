'use client'

import { useState, useEffect } from 'react'
import { Job } from '@/types'

interface ProposalModalProps {
  isOpen: boolean
  onClose: () => void
  job: Job | null
  onApplied?: (jobId: string) => void
}

interface Template {
  id: string
  name: string
  category: string
  content: string
  variables: string[]
  wins: number
  sent: number
  rate: string
}

export default function ProposalModal({ isOpen, onClose, job, onApplied }: ProposalModalProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [proposalText, setProposalText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchTemplates()
      setProposalText('')
      setStatusMsg(null)
    }
  }, [isOpen])

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates')
      if (res.ok) {
        const data: Template[] = await res.json()
        setTemplates(data)
        if (data.length > 0) {
          const best = data.reduce((a, b) =>
            parseFloat(a.rate) > parseFloat(b.rate) ? a : b
          )
          setSelectedTemplate(best)
        }
      }
    } catch { /* ignore */ }
  }

  const generate = () => {
    if (!selectedTemplate || !job) return
    setIsGenerating(true)
    const text = selectedTemplate.content
      .replace(/\{\{job_title\}\}/g, job.title)
      .replace(/\{\{pain_point\}\}/g, job.brief || 'your specific requirements')
      .replace(/\{\{detected_stack\}\}/g, job.tags.join(', ') || 'your stack')
      .replace(/\{\{industry\}\}/g, 'your industry')
      .replace(/\{\{demo_link\}\}/g, 'https://nexara.dev/demo')
    setProposalText(text)
    setIsGenerating(false)
  }

  const sendToTelegram = async () => {
    if (!proposalText || !job) return
    setIsSending(true)
    try {
      await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `📝 Proposal Draft — ${job.title} (${job.budget})\n\n${proposalText.slice(0, 800)}${proposalText.length > 800 ? '…' : ''}`,
        }),
      })
      setStatusMsg('Sent to Telegram ✓')
    } catch {
      setStatusMsg('Failed to send')
    } finally {
      setIsSending(false)
    }
  }

  const markApplied = async () => {
    if (!job) return
    setIsApplying(true)
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'applied' }),
      })
      if (res.ok) {
        onApplied?.(job.id)
        onClose()
      } else {
        setStatusMsg('Failed to update status')
      }
    } catch {
      setStatusMsg('Network error')
    } finally {
      setIsApplying(false)
    }
  }

  if (!isOpen || !job) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 60, padding: 16,
    }}>
      <div style={{
        background: '#0D1117', border: '1px solid #1E293B', borderRadius: 10,
        width: '100%', maxWidth: 860, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #1E293B',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(16,185,129,0.04)',
        }}>
          <div>
            <div style={{ fontSize: 13, color: '#F1F5F9', fontWeight: 700 }}>{job.title}</div>
            <div style={{ fontSize: 11, color: '#10B981', marginTop: 2 }}>
              {job.platform} · {job.budget} · Score {job.score}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: '#475569',
            cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4,
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
          {/* Template column */}
          <div style={{
            width: 220, flexShrink: 0, borderRight: '1px solid #1E293B',
            padding: '14px 12px', overflowY: 'auto',
          }}>
            <div style={{ fontSize: 10, color: '#64748B', letterSpacing: '0.1em', marginBottom: 10 }}>TEMPLATES</div>
            {templates.map(t => (
              <button key={t.id} onClick={() => setSelectedTemplate(t)} style={{
                width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 6, marginBottom: 6,
                background: selectedTemplate?.id === t.id ? 'rgba(16,185,129,0.1)' : 'rgba(30,41,59,0.4)',
                border: selectedTemplate?.id === t.id ? '1px solid rgba(16,185,129,0.4)' : '1px solid #1E293B',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <div style={{ fontSize: 11, color: '#E2E8F0', fontWeight: 600, marginBottom: 2 }}>{t.name}</div>
                <div style={{ fontSize: 10, color: '#64748B' }}>{t.category}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: '#4B5563' }}>{t.wins}W/{t.sent}</span>
                  <span style={{ fontSize: 10, color: '#10B981', fontWeight: 700 }}>{t.rate}</span>
                </div>
              </button>
            ))}
            {templates.length === 0 && (
              <div style={{ fontSize: 11, color: '#4B5563' }}>No templates yet</div>
            )}
          </div>

          {/* Proposal editor */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: '#64748B', letterSpacing: '0.1em' }}>PROPOSAL TEXT</div>
              <button onClick={generate} disabled={isGenerating || !selectedTemplate} style={{
                background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.35)',
                color: '#3B82F6', padding: '5px 14px', borderRadius: 5, cursor: 'pointer',
                fontSize: 11, fontFamily: 'inherit', letterSpacing: '0.06em',
                opacity: !selectedTemplate ? 0.5 : 1,
              }}>
                {isGenerating ? 'GENERATING…' : '⚡ GENERATE'}
              </button>
            </div>

            {job.brief && (
              <div style={{
                background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
                borderRadius: 6, padding: '10px 12px', marginBottom: 12, fontSize: 11,
                color: '#94A3B8', lineHeight: 1.6,
              }}>
                <span style={{ fontSize: 9, color: '#10B981', letterSpacing: '0.1em', fontWeight: 700 }}>AI BRIEF  </span>
                {job.brief}
              </div>
            )}

            <textarea
              value={proposalText}
              onChange={e => setProposalText(e.target.value)}
              placeholder="Generate or paste your proposal here…"
              style={{
                flex: 1, resize: 'none', minHeight: 240,
                background: '#080C14', border: '1px solid #1E293B', borderRadius: 6,
                padding: '12px 14px', fontSize: 12, color: '#CBD5E1', lineHeight: 1.7,
                fontFamily: 'var(--font-geist-sans), Inter, system-ui, sans-serif',
                outline: 'none',
              }}
            />
            <div style={{ fontSize: 10, color: '#4B5563', marginTop: 6, textAlign: 'right' }}>
              {proposalText.length} chars
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid #1E293B',
          display: 'flex', gap: 10, alignItems: 'center',
          background: '#080C14',
        }}>
          {statusMsg && (
            <span style={{ fontSize: 11, color: statusMsg.includes('✓') ? '#10B981' : '#EF4444' }}>
              {statusMsg}
            </span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{
              background: 'transparent', border: '1px solid #1E293B',
              color: '#475569', padding: '8px 16px', borderRadius: 6,
              cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
            }}>
              CANCEL
            </button>
            <button onClick={sendToTelegram} disabled={!proposalText || isSending} style={{
              background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
              color: '#3B82F6', padding: '8px 16px', borderRadius: 6,
              cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', letterSpacing: '0.06em',
              opacity: !proposalText ? 0.4 : 1,
            }}>
              {isSending ? 'SENDING…' : '📤 SEND TO TELEGRAM'}
            </button>
            <button onClick={markApplied} disabled={isApplying} style={{
              background: 'linear-gradient(135deg, #065F46, #047857)',
              border: '1px solid #10B981', color: '#10B981',
              padding: '8px 20px', borderRadius: 6, cursor: 'pointer',
              fontSize: 11, fontFamily: 'inherit', letterSpacing: '0.08em', fontWeight: 700,
              opacity: isApplying ? 0.6 : 1,
            }}>
              {isApplying ? 'SAVING…' : '✓ MARK APPLIED'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
