import { supabaseAdmin } from '@/lib/supabase'

export async function markExpiredShuttlesDone(shuttleId?: string) {
  const now = new Date().toISOString()
  if (shuttleId) {
    await supabaseAdmin
      .from('shuttles')
      .update({ status: 'done' })
      .in('status', ['confirmed', 'full'])
      .lt('departure_time', now)
      .eq('id', shuttleId)
  } else {
    await supabaseAdmin
      .from('shuttles')
      .update({ status: 'done' })
      .in('status', ['confirmed', 'full'])
      .lt('departure_time', now)
  }
}

export async function getProfileIdsByRole(role: 'master' | 'base'): Promise<string[]> {
  const { data } = await supabaseAdmin.from('profiles').select('id').eq('role', role)
  return (data ?? []).map(p => p.id)
}

export type BookingParticipant = {
  id: string
  booking_id: string
  is_guest: boolean
  guest_label: string | null
  user_id: string | null
  profiles: { username: string } | null
}

export type BookingWithParticipants = {
  bookings: { id: string; booker_id: string; created_at: string }[]
  profileById: Record<string, { id: string; username: string }>
  participantsByBooking: Record<string, BookingParticipant[]>
}

export async function getBookingsWithParticipants(shuttleId: string): Promise<BookingWithParticipants> {
  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('id, booker_id, created_at')
    .eq('shuttle_id', shuttleId)
    .order('created_at', { ascending: true })

  const rows = bookings ?? []
  const bookerIds = [...new Set(rows.map(b => b.booker_id))]
  const bookingIds = rows.map(b => b.id)

  const [{ data: bookerProfiles }, { data: allParticipants }] = await Promise.all([
    bookerIds.length
      ? supabaseAdmin.from('profiles').select('id, username').in('id', bookerIds)
      : Promise.resolve({ data: [] as { id: string; username: string }[] }),
    bookingIds.length
      ? supabaseAdmin
          .from('booking_participants')
          .select('id, booking_id, is_guest, guest_label, user_id, profiles(username)')
          .in('booking_id', bookingIds)
      : Promise.resolve({ data: [] as BookingParticipant[] }),
  ])

  const profileById = Object.fromEntries((bookerProfiles ?? []).map(p => [p.id, p]))

  const participantsByBooking = (allParticipants ?? []).reduce<Record<string, BookingParticipant[]>>((acc, p) => {
    if (!acc[p.booking_id]) acc[p.booking_id] = []
    acc[p.booking_id].push(p as unknown as BookingParticipant)
    return acc
  }, {})

  return { bookings: rows, profileById, participantsByBooking }
}
