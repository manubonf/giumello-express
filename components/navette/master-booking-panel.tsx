'use client'

import { useState } from 'react'
import { SubmitButton } from '@/components/ui/submit-button'
import { Button } from '@/components/ui/button'
import { UserSearchInput, type Profile } from '@/components/ui/user-search'
import { masterBookUser, masterBookGuest } from '@/app/master/navette/actions'

type ActivePanel = null | 'user' | 'guest'

export function MasterBookingPanel({
  shuttleId,
  excludedUserIds,
}: {
  shuttleId: string
  excludedUserIds: string[]
}) {
  const excludedSet = new Set(excludedUserIds)
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)

  function closePanel() {
    setActivePanel(null)
    setSelectedUser(null)
  }

  return (
    <div>
      <p
        className="font-mono text-[10px] uppercase tracking-widest mb-3"
        style={{ color: 'var(--text-muted)' }}
      >
        Aggiungi prenotazione
      </p>

      {activePanel === null && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="px-4 py-2" onClick={() => setActivePanel('user')}>
            Prenota utente
          </Button>
          <Button variant="outline" className="px-4 py-2" onClick={() => setActivePanel('guest')}>
            Prenota ospite
          </Button>
        </div>
      )}

      {activePanel === 'user' && (
        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
            Seleziona un utente base da prenotare
          </p>
          <UserSearchInput
            excludedUserIds={excludedSet}
            selectedUser={selectedUser}
            onSelect={setSelectedUser}
          />
          <div className="flex gap-2 mt-1">
            {selectedUser && (
              <form action={masterBookUser}>
                <input type="hidden" name="shuttle_id" value={shuttleId} />
                <input type="hidden" name="user_id" value={selectedUser.id} />
                <SubmitButton variant="primary" className="px-4 py-2">
                  Conferma
                </SubmitButton>
              </form>
            )}
            <Button variant="cancel" className="px-4 py-2" onClick={closePanel}>
              Annulla
            </Button>
          </div>
        </div>
      )}

      {activePanel === 'guest' && (
        <form action={masterBookGuest} className="flex flex-col gap-3">
          <input type="hidden" name="shuttle_id" value={shuttleId} />
          <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
            Nome dell&apos;ospite da prenotare
          </p>
          <div className="flex gap-2">
            <input
              name="guest_name"
              type="text"
              placeholder="Mario Rossi"
              autoFocus
              className="flex-1 rounded-xl border px-4 py-2.5 font-mono text-sm outline-none"
              style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>
          <div className="flex gap-2">
            <SubmitButton variant="primary" className="px-4 py-2">
              Prenota ospite
            </SubmitButton>
            <Button variant="cancel" className="px-4 py-2" onClick={closePanel}>
              Annulla
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
