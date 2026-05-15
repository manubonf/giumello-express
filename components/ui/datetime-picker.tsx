'use client'

import { useState } from 'react'

const TIME_OPTIONS: string[] = []
for (let h = 0; h < 24; h++) {
  for (const m of [0, 15, 30, 45]) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
}

function roundTo15(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const slot = Math.round(m / 15) * 15
  if (slot === 60) return `${String((h + 1) % 24).padStart(2, '0')}:00`
  return `${String(h).padStart(2, '0')}:${String(slot).padStart(2, '0')}`
}

const inputStyle = {
  background: 'var(--bg-panel)',
  borderColor: 'var(--border-muted)',
  colorScheme: 'dark' as const,
}

export function DateTimePicker({
  name,
  required,
  defaultValue,
}: {
  name: string
  required?: boolean
  defaultValue?: string
}) {
  const [date, setDate] = useState(defaultValue?.slice(0, 10) ?? '')
  const [time, setTime] = useState(
    defaultValue ? roundTo15(defaultValue.slice(11, 16)) : ''
  )

  const combined = date && time ? `${date}T${time}` : ''

  return (
    <div className="flex gap-2">
      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        required={required}
        className="flex-1 min-w-0 rounded-sm border px-3 py-2.5 font-mono text-sm"
        style={{ ...inputStyle, color: date ? 'var(--text)' : 'var(--text-dim)' }}
      />
      <select
        value={time}
        onChange={e => setTime(e.target.value)}
        required={required}
        className="rounded-sm border px-3 py-2.5 font-mono text-sm"
        style={{ ...inputStyle, color: time ? 'var(--text)' : 'var(--text-dim)' }}
      >
        <option value="" disabled>--:--</option>
        {TIME_OPTIONS.map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <input type="hidden" name={name} value={combined} />
    </div>
  )
}
