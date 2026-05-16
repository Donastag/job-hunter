;(function () {
  'use strict'

  var API_BASE = (document.currentScript && document.currentScript.getAttribute('data-api')) || 'http://194.163.161.220:3000'
  var APP_NAME = (document.currentScript && document.currentScript.getAttribute('data-app')) || document.title || 'App'
  var STORAGE_KEY = 'nexara_chat_session'
  var POLL_MS = 3000

  var sessionId = localStorage.getItem(STORAGE_KEY)
  var messages = []
  var lastTimestamp = null
  var pollTimer = null
  var isOpen = false
  var started = !!sessionId

  // --- Build DOM ---
  var css = `
    #nx-chat-btn {
      position:fixed;bottom:24px;right:24px;z-index:9999;
      width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;
      background:linear-gradient(135deg,#10B981 0%,#06B6D4 100%);
      box-shadow:0 4px 20px rgba(16,185,129,.4);
      display:flex;align-items:center;justify-content:center;
      transition:transform 150ms;
    }
    #nx-chat-btn:hover{transform:scale(1.08);}
    #nx-chat-badge {
      position:absolute;top:-4px;right:-4px;
      background:#EF4444;color:white;border-radius:50%;
      width:18px;height:18px;font-size:10px;font-weight:700;
      display:flex;align-items:center;justify-content:center;
    }
    #nx-chat-panel {
      position:fixed;bottom:88px;right:24px;z-index:9998;
      width:340px;height:480px;
      background:#0F172A;border:1px solid rgba(255,255,255,.1);
      border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.5);
      display:flex;flex-direction:column;overflow:hidden;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    }
    #nx-chat-panel * {box-sizing:border-box;}
    #nx-chat-header {
      padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08);
      background:rgba(16,185,129,.08);display:flex;align-items:center;gap:10px;
    }
    #nx-chat-avatar {
      width:32px;height:32px;border-radius:8px;flex-shrink:0;
      background:linear-gradient(135deg,#10B981,#06B6D4);
      display:flex;align-items:center;justify-content:center;
      font-size:12px;font-weight:900;color:white;
    }
    #nx-chat-start {
      flex:1;padding:24px;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:14px;
    }
    #nx-chat-start input {
      width:100%;padding:10px 14px;
      background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
      border-radius:8px;color:#F1F5F9;font-size:13px;outline:none;
    }
    #nx-chat-start button {
      width:100%;padding:10px 0;border:none;border-radius:8px;
      color:white;font-size:13px;font-weight:700;cursor:pointer;letter-spacing:.06em;
      background:linear-gradient(135deg,#10B981,#06B6D4);
    }
    #nx-chat-msgs {
      flex:1;overflow-y:auto;padding:12px 14px;
      display:flex;flex-direction:column;gap:8px;
    }
    .nx-msg { display:flex; }
    .nx-msg-visitor { justify-content:flex-end; }
    .nx-msg-bubble {
      max-width:78%;padding:8px 12px;color:#F1F5F9;
      font-size:13px;line-height:1.45;
    }
    .nx-msg-visitor .nx-msg-bubble {
      background:linear-gradient(135deg,#10B981,#059669);
      border-radius:12px 12px 2px 12px;
    }
    .nx-msg-agent .nx-msg-bubble {
      background:rgba(255,255,255,.07);
      border-radius:12px 12px 12px 2px;
    }
    .nx-msg-time { font-size:9px;color:rgba(255,255,255,.4);margin-top:4px;text-align:right; }
    #nx-chat-input-row {
      padding:10px 12px;border-top:1px solid rgba(255,255,255,.08);
      display:flex;gap:8px;
    }
    #nx-chat-input-row input {
      flex:1;padding:9px 12px;
      background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
      border-radius:8px;color:#F1F5F9;font-size:12px;outline:none;
    }
    #nx-chat-send {
      padding:0 14px;border:none;border-radius:8px;cursor:pointer;
      background:linear-gradient(135deg,#10B981,#06B6D4);
      display:flex;align-items:center;justify-content:center;
    }
  `

  var style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)

  // Button
  var btn = document.createElement('button')
  btn.id = 'nx-chat-btn'
  btn.innerHTML = iconChat()
  btn.title = 'Chat with us'
  document.body.appendChild(btn)

  // Panel (hidden initially)
  var panel = buildPanel()
  panel.style.display = 'none'
  document.body.appendChild(panel)

  btn.addEventListener('click', function () {
    isOpen = !isOpen
    panel.style.display = isOpen ? 'flex' : 'none'
    btn.innerHTML = isOpen ? iconClose() : iconChat()
    if (isOpen) { hideBadge(); scrollBottom() }
    if (isOpen && sessionId && !pollTimer) startPolling()
  })

  if (sessionId) { resumeSession() }

  // --- Functions ---

  function buildPanel() {
    var p = document.createElement('div')
    p.id = 'nx-chat-panel'

    p.innerHTML = `
      <div id="nx-chat-header">
        <div id="nx-chat-avatar">N</div>
        <div>
          <div style="font-size:13px;font-weight:700;color:#F1F5F9;">Nexara Support</div>
          <div style="font-size:10px;color:#10B981;display:flex;align-items:center;gap:4px;">
            <span style="width:6px;height:6px;border-radius:50%;background:#10B981;display:inline-block;"></span>Online
          </div>
        </div>
      </div>
      <div id="nx-chat-body"></div>
    `

    renderBody(p.querySelector('#nx-chat-body'))
    return p
  }

  function renderBody(container) {
    if (!started) {
      container.innerHTML = `
        <div id="nx-chat-start">
          <div style="font-size:22px;">👋</div>
          <div style="text-align:center;">
            <div style="font-size:14px;font-weight:700;color:#F1F5F9;margin-bottom:6px;">Hi there!</div>
            <div style="font-size:12px;color:#94A3B8;line-height:1.5;">How can we help?<br>Tell us your name to get started.</div>
          </div>
          <input id="nx-name-input" placeholder="Your name" />
          <button id="nx-start-btn">START CHAT</button>
        </div>
      `
      var nameInput = container.querySelector('#nx-name-input')
      var startBtn = container.querySelector('#nx-start-btn')
      nameInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') startChat(nameInput.value) })
      startBtn.addEventListener('click', function() { startChat(nameInput.value) })
    } else {
      container.innerHTML = `
        <div id="nx-chat-msgs"></div>
        <div id="nx-chat-input-row">
          <input id="nx-msg-input" placeholder="Type a message…" />
          <button id="nx-chat-send">${iconSend()}</button>
        </div>
      `
      renderMessages(container.querySelector('#nx-chat-msgs'))
      var msgInput = container.querySelector('#nx-msg-input')
      var sendBtn = container.querySelector('#nx-chat-send')
      msgInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') sendMessage(msgInput) })
      sendBtn.addEventListener('click', function() { sendMessage(msgInput) })
    }
  }

  function renderMessages(container) {
    if (!container) return
    container.innerHTML = ''
    if (messages.length === 0) {
      container.innerHTML = '<div style="text-align:center;margin-top:20px;font-size:11px;color:#64748B;">Send a message to start the conversation.</div>'
      return
    }
    messages.forEach(function(m) {
      var div = document.createElement('div')
      div.className = 'nx-msg nx-msg-' + m.sender
      var time = new Date(m.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
      div.innerHTML = '<div class="nx-msg-bubble">' + escHtml(m.message) + '<div class="nx-msg-time">' + time + '</div></div>'
      container.appendChild(div)
    })
    scrollBottom()
  }

  function startChat(name) {
    if (!name || !name.trim()) return
    var visitorName = name.trim()
    fetch(API_BASE + '/api/chat/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionId, appName: APP_NAME, visitorName: visitorName }),
    }).then(function(r) { return r.json() }).then(function(d) {
      sessionId = d.sessionId
      localStorage.setItem(STORAGE_KEY, sessionId)
      started = true
      var body = document.getElementById('nx-chat-body')
      if (body) renderBody(body)
      startPolling()
    }).catch(function() {})
  }

  function sendMessage(input) {
    var text = input.value.trim()
    if (!text || !sessionId) return
    input.value = ''
    fetch(API_BASE + '/api/chat/' + sessionId + '/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, sender: 'visitor' }),
    }).then(function() { poll() }).catch(function() {})
  }

  function poll() {
    var url = API_BASE + '/api/chat/' + sessionId + '/messages'
    if (lastTimestamp) url += '?after=' + encodeURIComponent(lastTimestamp)
    fetch(url).then(function(r) { return r.json() }).then(function(data) {
      if (data.messages && data.messages.length) {
        var ids = new Set(messages.map(function(m) { return m.id }))
        var fresh = data.messages.filter(function(m) { return !ids.has(m.id) })
        if (fresh.length) {
          messages = messages.concat(fresh)
          lastTimestamp = fresh[fresh.length - 1].createdAt
          var msgsEl = document.getElementById('nx-chat-msgs')
          if (msgsEl) renderMessages(msgsEl)
          if (!isOpen) showBadge(fresh.filter(function(m) { return m.sender === 'agent' }).length)
        }
      }
    }).catch(function() {})
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer)
    poll()
    pollTimer = setInterval(poll, POLL_MS)
  }

  function resumeSession() {
    fetch(API_BASE + '/api/chat/' + sessionId + '/messages')
      .then(function(r) { return r.json() })
      .then(function(data) {
        if (data.messages && data.messages.length) {
          messages = data.messages
          lastTimestamp = messages[messages.length - 1].createdAt
        }
        started = true
        var body = document.getElementById('nx-chat-body')
        if (body) renderBody(body)
        startPolling()
      }).catch(function() { sessionId = null; localStorage.removeItem(STORAGE_KEY) })
  }

  function scrollBottom() {
    setTimeout(function() {
      var el = document.getElementById('nx-chat-msgs')
      if (el) el.scrollTop = el.scrollHeight
    }, 50)
  }

  var unreadCount = 0
  function showBadge(n) {
    unreadCount += n
    if (unreadCount <= 0) return
    var existing = document.getElementById('nx-chat-badge')
    if (!existing) {
      var badge = document.createElement('span')
      badge.id = 'nx-chat-badge'
      badge.className = 'nx-chat-badge'
      btn.style.position = 'relative'
      btn.appendChild(badge)
    }
    document.getElementById('nx-chat-badge').textContent = unreadCount
  }

  function hideBadge() {
    unreadCount = 0
    var b = document.getElementById('nx-chat-badge')
    if (b) b.remove()
  }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
  }

  function iconChat() {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
  }
  function iconClose() {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>'
  }
  function iconSend() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="m22 2-7 20-4-9-9-4 20-7z"/><path d="M22 2 11 13"/></svg>'
  }
})()
