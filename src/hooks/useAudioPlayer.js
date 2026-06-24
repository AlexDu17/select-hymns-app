import { useState, useEffect, useCallback } from 'react'

// Module-level singleton — one audio element shared across all components
const audio = typeof window !== 'undefined' ? new Audio() : null
const subscribers = new Set()

function notify() {
  subscribers.forEach(fn => fn())
}

if (audio) {
  ;['play', 'pause', 'ended', 'loadstart', 'canplay', 'timeupdate', 'durationchange', 'error'].forEach(evt =>
    audio.addEventListener(evt, notify)
  )
}

function toPath(url) {
  if (!url) return ''
  try { return new URL(url, window.location.href).pathname } catch { return url }
}

function currentPath() {
  if (!audio?.src) return ''
  try { return new URL(audio.src).pathname } catch { return audio.src }
}

export function formatTime(s) {
  if (!s || !isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function useAudioPlayer(url) {
  const [, tick] = useState(0)

  useEffect(() => {
    const update = () => tick(n => n + 1)
    subscribers.add(update)
    return () => subscribers.delete(update)
  }, [])

  const path = toPath(url)
  const isCurrent = !!url && currentPath() === path
  const isPlaying = isCurrent && !!audio && !audio.paused && !audio.ended
  const isLoading = isCurrent && !!audio && audio.readyState < 3
  const currentTime = isCurrent && audio ? audio.currentTime : 0
  const duration = isCurrent && audio ? (audio.duration || 0) : 0

  const toggle = useCallback(() => {
    if (!audio || !url) return
    if (currentPath() !== toPath(url)) {
      audio.src = url
      audio.load()
      audio.play().catch(() => notify())
    } else if (audio.paused || audio.ended) {
      audio.play().catch(() => notify())
    } else {
      audio.pause()
    }
  }, [url])

  const seek = useCallback((time) => {
    if (audio && isCurrent) audio.currentTime = time
  }, [isCurrent])

  return { isPlaying, isLoading, isCurrent, currentTime, duration, toggle, seek }
}
