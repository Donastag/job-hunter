'use client'

import { useEffect, useRef, useCallback } from 'react'

const IDLE_MS = 30 * 60 * 1000   // 30 min before sign-out
const WARN_MS = 60 * 1000        // warn 60 s before

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click']

export function useIdleTimeout(onIdle: () => void, onWarn: (secondsLeft: number) => void, onActivity: () => void) {
  const idleTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdown  = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearAll = useCallback(() => {
    if (idleTimer.current)  clearTimeout(idleTimer.current)
    if (warnTimer.current)  clearTimeout(warnTimer.current)
    if (countdown.current)  clearInterval(countdown.current)
  }, [])

  const resetTimers = useCallback(() => {
    clearAll()
    onActivity()

    warnTimer.current = setTimeout(() => {
      let secs = WARN_MS / 1000
      onWarn(secs)
      countdown.current = setInterval(() => {
        secs -= 1
        if (secs <= 0) {
          clearInterval(countdown.current!)
        } else {
          onWarn(secs)
        }
      }, 1000)
    }, IDLE_MS - WARN_MS)

    idleTimer.current = setTimeout(() => {
      clearAll()
      onIdle()
    }, IDLE_MS)
  }, [clearAll, onIdle, onWarn, onActivity])

  useEffect(() => {
    resetTimers()
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, resetTimers, { passive: true }))
    return () => {
      clearAll()
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetTimers))
    }
  }, [resetTimers, clearAll])
}
