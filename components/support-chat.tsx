'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface Message {
  id: string
  sender: string
  message: string
  createdAt: string
}

interface SupportChatProps {
  appName?: string
}

const STORAGE_KEY = 'nexara_chat_session'
const POLL_INTERVAL = 3000

export function SupportChat({ appName = 'Job Hunter' }: SupportChatProps) {
  const [open, setOpen] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [visitorName, setVisitorName] = useState('')
  const [started, setStarted] = useState(false)
  const [unread, setUnread] = useState(0)
  const lastTimestampRef = useRef<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const initSession = useCallback(async (name: string) => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const res = await fetch('/api/chat/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: stored, appName, visitorName: name }),
    })
    const data = await res.json()
    localStorage.setItem(STORAGE_KEY, data.sessionId)
    setSessionId(data.sessionId)
    return data.sessionId
  }, [appName])

  const pollMessages = useCallback(async (sid: string) => {
    const url = lastTimestampRef.current
      ? `/api/chat/${sid}/messages?after=${encodeURIComponent(lastTimestampRef.current)}`
      : `/api/chat/${sid}/messages`

    const res = await fetch(url)
    const data = await res.json()
    if (data.messages?.length) {
      setMessages(prev => {
        const ids = new Set(prev.map((m: Message) => m.id))
        const fresh = data.messages.filter((m: Message) => !ids.has(m.id))
        if (!fresh.length) return prev
        lastTimestampRef.current = fresh[fresh.length - 1].createdAt
        if (!open) setUnread(u => u + fresh.filter((m: Message) => m.sender === 'agent').length)
        return [...prev, ...fresh]
      })
    }
  }, [open])

  useEffect(() => {
    if (!sessionId) return
    pollRef.current = setInterval(() => pollMessages(sessionId), POLL_INTERVAL)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [sessionId, pollMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) setUnread(0)
  }, [open])

  // Resume existing session on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setSessionId(stored)
      setStarted(true)
      fetch(`/api/chat/${stored}/messages`).then(r => r.json()).then(data => {
        if (data.messages?.length) {
          setMessages(data.messages)
          lastTimestampRef.current = data.messages[data.messages.length - 1].createdAt
        }
      }).catch(() => {})
    }
  }, [])

  const handleStart = async () => {
    if (!visitorName.trim()) return
    await initSession(visitorName.trim())
    setStarted(true)
  }

  const handleSend = async () => {
    if (!input.trim() || !sessionId || sending) return
    setSending(true)
    const text = input.trim()
    setInput('')
    try {
      await fetch(`/api/chat/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sender: 'visitor', senderName: visitorName }),
      })
      await pollMessages(sessionId)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(135deg,#10B981 0%,#06B6D4 100%)',
          border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(16,185,129,.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 150ms ease',
        }}
        title="Chat with us"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        )}
        {unread > 0 && !open && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#EF4444', color: 'white',
            borderRadius: '50%', width: 18, height: 18,
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{unread}</span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 88, right: 24, zIndex: 9998,
          width: 340, height: 480,
          background: '#0F172A', border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,.5)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,.08)',
            background: 'rgba(16,185,129,.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'linear-gradient(135deg,#10B981 0%,#06B6D4 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 900, color: 'white',
              }}>N</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Nexara Support</div>
                <div style={{ fontSize: 10, color: '#10B981', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }}/>
                  Online
                </div>
              </div>
            </div>
          </div>

          {!started ? (
            /* Name prompt */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
              <div style={{ fontSize: 22 }}>👋</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', marginBottom: 6 }}>Hi there!</div>
                <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.5 }}>How can we help you today?<br/>Tell us your name to get started.</div>
              </div>
              <input
                value={visitorName}
                onChange={e => setVisitorName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStart()}
                placeholder="Your name"
                style={{
                  width: '100%', padding: '10px 14px',
                  background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)',
                  borderRadius: 8, color: '#F1F5F9', fontSize: 13, outline: 'none',
                }}
                autoFocus
              />
              <button
                onClick={handleStart}
                disabled={!visitorName.trim()}
                style={{
                  width: '100%', padding: '10px 0',
                  background: visitorName.trim() ? 'linear-gradient(135deg,#10B981,#06B6D4)' : 'rgba(255,255,255,.05)',
                  border: 'none', borderRadius: 8, color: 'white',
                  fontSize: 13, fontWeight: 700, cursor: visitorName.trim() ? 'pointer' : 'not-allowed',
                  letterSpacing: '.06em',
                }}
              >START CHAT</button>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <div style={{ fontSize: 11, color: '#64748B' }}>Send a message to start the conversation.</div>
                  </div>
                )}
                {messages.map(m => (
                  <div key={m.id} style={{
                    display: 'flex',
                    justifyContent: m.sender === 'visitor' ? 'flex-end' : 'flex-start',
                  }}>
                    <div style={{
                      maxWidth: '78%',
                      padding: '8px 12px',
                      borderRadius: m.sender === 'visitor' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      background: m.sender === 'visitor'
                        ? 'linear-gradient(135deg,#10B981,#059669)'
                        : 'rgba(255,255,255,.07)',
                      color: '#F1F5F9',
                      fontSize: 13,
                      lineHeight: 1.45,
                    }}>
                      {m.message}
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', marginTop: 4, textAlign: 'right' }}>
                        {new Date(m.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,.08)', display: 'flex', gap: 8 }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Type a message…"
                  style={{
                    flex: 1, padding: '9px 12px',
                    background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)',
                    borderRadius: 8, color: '#F1F5F9', fontSize: 12, outline: 'none',
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  style={{
                    padding: '0 14px',
                    background: input.trim() ? 'linear-gradient(135deg,#10B981,#06B6D4)' : 'rgba(255,255,255,.05)',
                    border: 'none', borderRadius: 8, cursor: input.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="m22 2-7 20-4-9-9-4 20-7z"/><path d="M22 2 11 13"/></svg>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
