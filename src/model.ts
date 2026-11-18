export type User = { id: string; nickname: string; email: string; credential: string }
export type Work = { id: string; title: string; author: string; minPlayers: number; maxPlayers: number; duration: number; genre: string; description: string }
export type Group = { id: string; name: string; description: string; inviteCode: string }
export type Role = 'owner' | 'manager' | 'member'
export type Membership = { groupId: string; userId: string; role: Role; joinedAt: string; leftAt?: string }
export type Participant = { userId: string; character: string; score: number | null; won: boolean; goal: boolean; solved: boolean; culprit: boolean }
export type Play = {
  id: string
  groupId: string
  workId: string
  date: string
  participants: Participant[]
  result: { culprit: string; notes: string }
  createdBy: string
  updatedAt: string
  deletedAt?: string
}
export type Database = { users: User[]; works: Work[]; groups: Group[]; memberships: Membership[]; plays: Play[]; activeUserId: string | null }

export const roleLabels: Record<Role, string> = { owner: '모임장', manager: '기록 관리자', member: '일반 구성원' }
export const formatDate = (date: string) => date.replaceAll('-', '.')
export const today = () => new Intl.DateTimeFormat('sv-SE').format(new Date())
export const normalize = (value: string) => value.trim().normalize('NFKC').toLowerCase()
export const matches = (query: string, ...fields: string[]) => fields.some((field) => normalize(field).includes(normalize(query)))
export const playerRange = ({ minPlayers, maxPlayers }: Work) => `${minPlayers === maxPlayers ? minPlayers : `${minPlayers}–${maxPlayers}`}인`
export const findUser = (db: Database, userId: string) => db.users.find(({ id }) => id === userId)
export const findGroup = (db: Database, groupId: string) => db.groups.find(({ id }) => id === groupId)
export const findWork = (db: Database, workId: string) => db.works.find(({ id }) => id === workId)
export const currentMembers = (db: Database, groupId: string) => db.memberships.filter((entry) => entry.groupId === groupId && !entry.leftAt)
export const roleIn = (db: Database, userId: string | null, groupId: string) => currentMembers(db, groupId).find((entry) => entry.userId === userId)?.role
export const canManageRecords = (db: Database, userId: string | null, groupId: string) => {
  const role = roleIn(db, userId, groupId)
  return role === 'owner' || role === 'manager'
}
export const participated = (play: Play, userId: string | null) => play.participants.some((person) => person.userId === userId)
export const canReadDetails = (play: Play, userId: string | null) => !play.deletedAt && participated(play, userId)
export const activePlays = (db: Database) => db.plays.filter((play) => !play.deletedAt).sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
export const personalPlays = (db: Database, userId: string | null) => activePlays(db).filter((play) => participated(play, userId))
export const groupPlays = (db: Database, userId: string | null, groupId: string) => roleIn(db, userId, groupId)
  ? activePlays(db).filter((play) => play.groupId === groupId)
  : []
export const joinedGroups = (db: Database, userId: string | null) => db.groups.filter((group) => roleIn(db, userId, group.id))
export const blankParticipant = (userId: string): Participant => ({ userId, character: '', score: null, won: false, goal: false, solved: false, culprit: false })

export function personalStats(plays: Play[], userId: string | null) {
  const entries = plays.flatMap((play) => play.participants.filter((person) => person.userId === userId))
  return {
    total: entries.length,
    wins: entries.filter((person) => person.won).length,
    solved: entries.filter((person) => person.solved).length,
    culprit: entries.filter((person) => person.culprit).length,
  }
}

export function duplicatePlayers(db: Database, workId: string, groupId: string) {
  const played = new Set(groupPlays(db, db.activeUserId, groupId).filter((play) => play.workId === workId).flatMap((play) => play.participants.map((person) => person.userId)))
  return currentMembers(db, groupId).filter((member) => played.has(member.userId)).flatMap((member) => findUser(db, member.userId) ?? [])
}

export function joinGroup(db: Database, groupId: string, userId: string): Database {
  if (!findGroup(db, groupId) || !findUser(db, userId) || roleIn(db, userId, groupId)) return db
  return { ...db, memberships: [...db.memberships, { groupId, userId, role: 'member', joinedAt: new Date().toISOString() }] }
}

export function leaveGroup(db: Database, groupId: string, userId: string): Database {
  if (roleIn(db, userId, groupId) === 'owner') return db
  return { ...db, memberships: db.memberships.map((entry) => entry.groupId === groupId && entry.userId === userId && !entry.leftAt ? { ...entry, leftAt: new Date().toISOString() } : entry) }
}

export function changeRole(db: Database, actor: string, groupId: string, userId: string, nextRole: Role): Database {
  if (roleIn(db, actor, groupId) !== 'owner' || actor === userId || !roleIn(db, userId, groupId)) return db
  const memberships = db.memberships.map((entry) => {
    if (entry.leftAt || entry.groupId !== groupId) return entry
    if (entry.userId === userId) return { ...entry, role: nextRole }
    if (entry.userId === actor && nextRole === 'owner') return { ...entry, role: 'member' as const }
    return entry
  })
  return { ...db, memberships }
}

export type PlayInput = Pick<Play, 'groupId' | 'workId' | 'date' | 'participants' | 'result'>

export function savePlay(db: Database, actor: string, input: PlayInput, id?: string, overwriteDetails = false): Database {
  const previous = id ? db.plays.find((play) => play.id === id && !play.deletedAt) : undefined
  if ((id && !previous) || (previous && previous.groupId !== input.groupId) || !canManageRecords(db, actor, input.groupId)) return db
  const allowed = new Set([...currentMembers(db, input.groupId).map((member) => member.userId), ...(previous?.participants.map((person) => person.userId) ?? [])])
  const participantIds = input.participants.map((person) => person.userId)
  const date = new Date(input.date)
  const validDate = Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === input.date
  const validParticipants = participantIds.length > 0 && participantIds.length === new Set(participantIds).size && participantIds.every((userId) => allowed.has(userId))
  const validScores = input.participants.every(({ score }) => score === null || Number.isFinite(score))
  if (!findWork(db, input.workId) || !validDate || !validParticipants || !validScores) return db
  const preserve = previous && !canReadDetails(previous, actor) && !overwriteDetails
  const play = {
    ...input,
    id: previous?.id ?? crypto.randomUUID(),
    createdBy: previous?.createdBy ?? actor,
    updatedAt: new Date().toISOString(),
    participants: preserve ? input.participants.map(({ userId }) => previous.participants.find((person) => person.userId === userId) ?? blankParticipant(userId)) : input.participants,
    result: preserve ? previous.result : input.result,
  }
  return { ...db, plays: previous ? db.plays.map((entry) => entry.id === previous.id ? play : entry) : [play, ...db.plays] }
}

export function setPlayDeleted(db: Database, actor: string, id: string, deleted: boolean): Database {
  const play = db.plays.find((entry) => entry.id === id)
  if (!play || Boolean(play.deletedAt) === deleted || roleIn(db, actor, play.groupId) !== 'owner') return db
  const updatedAt = new Date().toISOString()
  return { ...db, plays: db.plays.map((entry) => entry.id === id ? { ...entry, updatedAt, deletedAt: deleted ? updatedAt : undefined } : entry) }
}

export async function makeCredential(password: string, salt: string = crypto.randomUUID()): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${password}`))
  return `${salt}:${Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')}`
}
