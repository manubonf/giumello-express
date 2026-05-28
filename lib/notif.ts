import { supabaseAdmin } from './supabase'
import { sendPush } from './push'
import { formatShort } from './date'

export type MasterPref = 'notif_m1' | 'notif_m2' | 'notif_m3' | 'notif_m4' | 'notif_m5' | 'notif_m6'
export type BasePref = 'notif_u1' | 'notif_u2' | 'notif_u3' | 'notif_u4' | 'notif_u5' | 'notif_u6' | 'notif_u7' | 'notif_u8' | 'notif_u9' | 'notif_u10' | 'notif_u11' | 'notif_u12'

export function shuttleBody(departure_time: string, available_seats: number, max_seats: number): string {
  return `Navetta ${formatShort(departure_time)} — ${available_seats}/${max_seats} posti`
}

export async function masterIdsWithPref(pref: MasterPref): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('role', 'master')
    .eq(pref, true)
  return (data ?? []).map((p: { id: string }) => p.id)
}

export async function baseIdsWithPref(pref: BasePref, excludeIds: string[] = []): Promise<string[]> {
  let query = supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('role', 'base')
    .eq(pref, true)
  for (const id of excludeIds) query = query.neq('id', id)
  const { data } = await query
  return (data ?? []).map((p: { id: string }) => p.id)
}

export async function bookedBaseIdsWithPref(shuttleId: string, pref: BasePref, excludeIds: string[] = []): Promise<string[]> {
  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('id, booker_id')
    .eq('shuttle_id', shuttleId)

  const rows = bookings ?? []
  if (!rows.length) return []

  const bookingIds = rows.map((b: { id: string }) => b.id)
  const bookerIds = rows.map((b: { booker_id: string }) => b.booker_id)

  const { data: participants } = await supabaseAdmin
    .from('booking_participants')
    .select('user_id')
    .in('booking_id', bookingIds)
    .eq('is_guest', false)

  const participantUserIds = (participants ?? [])
    .map((p: { user_id: string | null }) => p.user_id)
    .filter((id): id is string => !!id)

  const allUserIds = [...new Set([...bookerIds, ...participantUserIds])]

  let query = supabaseAdmin
    .from('profiles')
    .select('id')
    .in('id', allUserIds)
    .eq(pref, true)
  for (const id of excludeIds) query = query.neq('id', id)

  const { data } = await query
  return (data ?? []).map((p: { id: string }) => p.id)
}

export async function userHasPref(userId: string, pref: BasePref | MasterPref): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .eq(pref, true)
    .maybeSingle()
  return !!data
}

// Sends U4 + U5 (deduped) for any state change except cancellation
export async function sendStateChangePush(
  shuttleId: string,
  title: string,
  body: string,
  excludeIds: string[] = [],
) {
  const [u4Ids, bookedU5Ids] = await Promise.all([
    baseIdsWithPref('notif_u4', excludeIds),
    bookedBaseIdsWithPref(shuttleId, 'notif_u5', excludeIds),
  ])
  const u4Set = new Set(u4Ids)
  const recipients = [...u4Ids, ...bookedU5Ids.filter(id => !u4Set.has(id))]
  if (recipients.length) {
    await sendPush(recipients, { title, body, url: `/base/navette/${shuttleId}` })
  }
}

// Sends U4 + U5 + U9 (deduped) for shuttle cancellation
// U4/U5 recipients get the standard cancelled body; U9-only recipients get the personal body
export async function sendCancelledPush(
  shuttleId: string,
  departure_time: string,
  excludeIds: string[] = [],
) {
  const title = 'Navetta annullata'
  const wideBody = `Navetta ${formatShort(departure_time)}`
  const personalBody = `Navetta ${formatShort(departure_time)} — la tua prenotazione è stata rimossa`
  const url = '/base/navette'

  const [u4Ids, bookedU5Ids, bookedU9Ids] = await Promise.all([
    baseIdsWithPref('notif_u4', excludeIds),
    bookedBaseIdsWithPref(shuttleId, 'notif_u5', excludeIds),
    bookedBaseIdsWithPref(shuttleId, 'notif_u9', excludeIds),
  ])

  const u4Set = new Set(u4Ids)
  const u5Only = bookedU5Ids.filter(id => !u4Set.has(id))
  const coveredByU4orU5 = new Set([...u4Ids, ...bookedU5Ids])
  const u9Only = bookedU9Ids.filter(id => !coveredByU4orU5.has(id))

  const wideRecipients = [...new Set([...u4Ids, ...u5Only])]

  await Promise.all([
    wideRecipients.length ? sendPush(wideRecipients, { title, body: wideBody, url }) : undefined,
    u9Only.length ? sendPush(u9Only, { title, body: personalBody, url }) : undefined,
  ])
}

// Sends U10 to a specific user when they are added to a shuttle by someone else
export async function sendAddedToShuttlePush(
  userId: string,
  shuttleId: string,
  departure_time: string,
  available_seats: number,
  max_seats: number,
) {
  const hasPref = await userHasPref(userId, 'notif_u10')
  if (!hasPref) return
  const body = shuttleBody(departure_time, available_seats, max_seats)
  await sendPush([userId], { title: 'Sei stato prenotato sulla navetta', body, url: `/base/navette/${shuttleId}` })
}

// Sends U10 to a specific user when they are removed from a shuttle by someone else
export async function sendRemovedFromShuttlePush(
  userId: string,
  shuttleId: string,
  departure_time: string,
  available_seats: number,
  max_seats: number,
) {
  const hasPref = await userHasPref(userId, 'notif_u10')
  if (!hasPref) return
  const body = shuttleBody(departure_time, available_seats, max_seats)
  await sendPush([userId], { title: 'Sei stato rimosso dalla navetta', body, url: `/base/navette/${shuttleId}` })
}

// Sends U11 + U12 (deduped) for departure time changes
export async function sendTimeChangePush(
  shuttleId: string,
  body: string,
  excludeIds: string[] = [],
) {
  const title = 'Orario navetta aggiornato'
  const [u11Ids, bookedU12Ids] = await Promise.all([
    baseIdsWithPref('notif_u11', excludeIds),
    bookedBaseIdsWithPref(shuttleId, 'notif_u12', excludeIds),
  ])
  const u11Set = new Set(u11Ids)
  const recipients = [...u11Ids, ...bookedU12Ids.filter(id => !u11Set.has(id))]
  if (recipients.length) {
    await sendPush(recipients, { title, body, url: `/base/navette/${shuttleId}` })
  }
}

// Sends U6 + U7 (deduped) for seat count changes without state change
export async function sendSeatUpdatePush(
  shuttleId: string,
  title: string,
  body: string,
  excludeIds: string[] = [],
) {
  const [u6Ids, bookedU7Ids] = await Promise.all([
    baseIdsWithPref('notif_u6', excludeIds),
    bookedBaseIdsWithPref(shuttleId, 'notif_u7', excludeIds),
  ])
  const u6Set = new Set(u6Ids)
  const recipients = [...u6Ids, ...bookedU7Ids.filter(id => !u6Set.has(id))]
  if (recipients.length) {
    await sendPush(recipients, { title, body, url: `/base/navette/${shuttleId}` })
  }
}
