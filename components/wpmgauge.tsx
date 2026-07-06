'use client'

import { useRef, useEffect } from 'react'

const RADIUS = 36
const CIRC = 2 * Math.PI * RADIUS

const CONFIG = {
  idle: { color: '#666',    label: 'Waiting...',  sub: 'Start speaking' },
  slow: { color: '#4ade80', label: 'Slow pace',   sub: 'Speed up a bit' },
  good: { color: '#a78bfa', label: 'Good pace',   sub: '110–180 ideal'  },
  fast: { color: '#f87171', label: 'Too fast',    sub: 'Slow down'      },
}

interface Props {
  wpm: number
  status: 'slow' | 'good' | 'fast' | 'idle'
  visible: boolean
}

export default function WpmGauge({ wpm, status, visible }: Props) {
  const ringRef = useRef<SVGCircleElement>(null)
  const cfg = CONFIG[status]
  const pct = Math.min(wpm / 220, 1)
  const offset = CIRC * (1 - pct)

  useEffect(() => {
    if (!ringRef.current) return
    ringRef.current.style.strokeDashoffset = offset.toFixed(1)
    ringRef.current.style.stroke = cfg.color
  }, [offset, cfg.color])

  if (!visible) return null

  const SIZE = 80

  return (
    <div style={{
      position: 'absolute',
      bottom: '28px',
      right: '28px',
      background: 'rgba(10,10,10,0.88)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '18px',
      padding: '16px 22px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      zIndex: 50,
      backdropFilter: 'blur(6px)',
      minWidth: '210px',
    }}>
      {/* Ring */}
      <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={SIZE/2} cy={SIZE/2} r={RADIUS} fill="none"
            stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle ref={ringRef}
            cx={SIZE/2} cy={SIZE/2} r={RADIUS} fill="none"
            stroke={cfg.color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
            {status === 'idle' ? '–' : wpm}
          </span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1 }}>
            WPM
          </span>
        </div>
      </div>

      {/* Label */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: cfg.color, lineHeight: 1 }}>
          {cfg.label}
        </span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1 }}>
          {cfg.sub}
        </span>
      </div>
    </div>
  )
}