import { useRef, useState, useCallback } from 'react'

interface WpmData {
  wpm: number
  status: 'slow' | 'good' | 'fast' | 'idle'
}

const WINDOW_MS = 10000

export function useWpm() {
  const wordEvents = useRef<number[]>([])
  const idleTimer = useRef<NodeJS.Timeout | null>(null)
  const [data, setData] = useState<WpmData>({ wpm: 0, status: 'idle' })

  // Call this with the word COUNT from each transcription chunk
  const recordWords = useCallback((count: number) => {
    const now = Date.now()

    // Spread words evenly over last 4 seconds so timestamps don't collide
    for (let i = 0; i < count; i++) {
      wordEvents.current.push(now - (count - i) * 100)
    }

    const cutoff = now - WINDOW_MS
    wordEvents.current = wordEvents.current.filter(t => t >= cutoff)

    const words = wordEvents.current
    if (words.length < 4) return

    const elapsedSec = Math.max((now - words[0]) / 1000, 1) // never 0
    const wpm = Math.round((words.length / elapsedSec) * 60)

    setData({
      wpm,
      status: wpm < 90 ? 'slow' : wpm <= 200 ? 'good' : 'fast',
    })

    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => {
      setData({ wpm: 0, status: 'idle' })
      wordEvents.current = []
    }, 3000)
  }, [])

  // Keep recordWord for single-word calls (backwards compat)
  const recordWord = useCallback(() => recordWords(1), [recordWords])

  const reset = useCallback(() => {
    wordEvents.current = []
    if (idleTimer.current) clearTimeout(idleTimer.current)
    setData({ wpm: 0, status: 'idle' })
  }, [])

  return { data, recordWord, recordWords, reset }
}