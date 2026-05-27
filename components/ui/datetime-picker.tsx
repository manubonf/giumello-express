'use client'

import { useState } from 'react'

function roundTo15(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const slot = Math.round(m / 15) * 15
  if (slot === 60) return `${String((h + 1) % 24).padStart(2, '0')}:00`
  return `${String(h).padStart(2, '0')}:${String(slot).padStart(2, '0')}`
}

/** "YYYY-MM-DD" nel fuso locale (non UTC) */
function localDateStr(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

/** Primo slot da :00/:15/:30/:45 >= ora corrente, nel fuso locale */
function minTimeStr(d: Date): string {
  const h = d.getHours()
  const m = d.getMinutes()
  const slot = Math.ceil(m / 15) * 15
  if (slot === 60) return `${String((h + 1) % 24).padStart(2, '0')}:00`
  return `${String(h).padStart(2, '0')}:${String(slot).padStart(2, '0')}`
}

const inputStyle = {
  background: 'var(--bg-panel)',
  borderColor: 'var(--border-muted)',
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

  const now = new Date()
  const today = localDateStr(now)
  const minTime = minTimeStr(now)
  const isToday = date === today

  function handleDateChange(newDate: string) {
    setDate(newDate)
    // Se l'utente torna a oggi e l'orario selezionato è già passato, lo azzera
    if (newDate === today && time && time < minTime) {
      setTime('')
    }
  }

  const combined = date && time
    ? new Date(`${date}T${time}`).toISOString().slice(0, 16)
    : ''

  return (
    <div className="flex gap-2">
      <input
        type="date"
        value={date}
        min={today}
        onChange={e => handleDateChange(e.target.value)}
        required={required}
        className="flex-1 min-w-0 rounded-sm border px-3 py-2.5 font-mono text-sm"
        style={{ ...inputStyle, color: date ? 'var(--text)' : 'var(--text-dim)', colorScheme: 'light' }}
      />
      <input
        type="time"
        value={time}
        min={isToday ? minTime : undefined}
        onChange={e => setTime(e.target.value)}
        required={required}
        step={900}
        className="w-[7.5rem] flex-shrink-0 rounded-sm border px-3 py-2.5 font-mono text-sm"
        style={{ ...inputStyle, color: time ? 'var(--text)' : 'var(--text-dim)', colorScheme: 'light' }}
      />
      <input type="hidden" name={name} value={combined} />
    </div>
  )
}
