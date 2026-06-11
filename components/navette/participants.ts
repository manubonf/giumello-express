// Mapping condiviso dei partecipanti ricevuti via realtime (join profiles(username)).

export type ParticipantEntry = {
  id: string
  is_guest: boolean
  guest_label: string | null
  user_id: string | null
  username: string | null
}

type RawParticipant = {
  id: string
  is_guest: boolean
  guest_label: string | null
  user_id: string | null
  profiles: { username: string } | { username: string }[] | null
}

export function mapRawParticipants(parts: unknown[] | null): ParticipantEntry[] {
  return ((parts ?? []) as RawParticipant[]).map(p => ({
    id: p.id,
    is_guest: p.is_guest,
    guest_label: p.guest_label,
    user_id: p.user_id ?? null,
    username: p.is_guest
      ? null
      : (Array.isArray(p.profiles) ? p.profiles[0]?.username : p.profiles?.username) ?? null,
  }))
}
