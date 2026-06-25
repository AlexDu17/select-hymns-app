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
  if (!s || !isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// knownDuration: pre-stored duration in seconds from DB, used before audio metadata loads
export function useAudioPlayer(url, knownDuration = null) {
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

  // Use actual duration when loaded, fall back to knownDuration from DB
  const rawDuration = isCurrent && audio ? audio.duration : NaN
  const duration = isFinite(rawDuration) && rawDuration > 0 ? rawDuration : (knownDuration ?? 0)

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
    if (!audio || !url) return
    if (currentPath() !== toPath(url)) {
      // Different track: load it and seek, but don't auto-play
      audio.src = url
      audio.load()
      audio.addEventListener('loadedmetadata', () => { audio.currentTime = time }, { once: true })
    } else {
      audio.currentTime = time
    }
  }, [url])

  return { isPlaying, isLoading, isCurrent, currentTime, duration, toggle, seek }
}
