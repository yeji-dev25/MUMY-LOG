import { blankParticipant } from './model'
import type { Database, Membership, Play, User, Work } from './model'

export const demoUserIds = ['mystery', 'haru', 'luce', 'sol']
const credential = 'mumy-demo:3f93599d3aca3d0fbb366e61bea76a156aff258d76bb736dff584bb091a21329'
const users: User[] = [
  { id: 'mystery', nickname: '미스터리러', email: 'detective@mumy.demo', credential },
  { id: 'haru', nickname: '하루', email: 'haru@mumy.demo', credential },
  { id: 'luce', nickname: '루체', email: 'luce@mumy.demo', credential },
  { id: 'mocha', nickname: '모카', email: 'mocha@mumy.demo', credential },
  { id: 'dodam', nickname: '도담', email: 'dodam@mumy.demo', credential },
  { id: 'liv', nickname: '리브', email: 'liv@mumy.demo', credential },
  { id: 'sol', nickname: '솔', email: 'sol@mumy.demo', credential },
]
const works: Work[] = [
  { id: 'lighthouse', title: '안개 속의 저택', author: '유안', minPlayers: 5, maxPlayers: 6, duration: 120, genre: '추리 · 드라마', description: '안개에 갇힌 해안 저택에서 하룻밤을 보낸 손님들. 새벽이 오기 전, 모두의 알리바이를 맞춰야 합니다.' },
  { id: 'train', title: '붉은 열차의 증언', author: '서하', minPlayers: 4, maxPlayers: 5, duration: 100, genre: '추리 · 미스터리', description: '붉은 협곡을 달리는 야간열차. 멈춰 버린 객차 안에 그날 밤을 기억하는 증언이 남아 있습니다.' },
  { id: 'mountain', title: '설산의 유산', author: '윤설', minPlayers: 5, maxPlayers: 7, duration: 150, genre: '미스터리 · 서스펜스', description: '눈보라에 고립된 산장에서 유언장이 사라집니다. 날이 밝기 전에 누가 이곳에 왔는지 밝혀 보세요.' },
  { id: 'ballroom', title: '가면무도회의 밤', author: '리온', minPlayers: 5, maxPlayers: 6, duration: 130, genre: '추리 · 시대극', description: '샹들리에 아래에서 모두가 가면을 벗는 자정, 초대받지 않은 손님이 모습을 드러냅니다.' },
  { id: 'castle', title: '달 아래의 성', author: '서하', minPlayers: 4, maxPlayers: 6, duration: 110, genre: '고딕 · 추리', description: '보름달이 뜬 밤, 오래된 성의 문이 열립니다. 각자의 비밀이 성의 역사와 얽혀 있습니다.' },
]
const groups = [
  { id: 'friday', name: '금요일의 탐정들', description: '매주 금요일, 머더미스터리 한 판!', inviteCode: 'FRIDAY' },
  { id: 'club', name: '미스터리 클럽', description: '매달 새로운 사건을 함께 풀어요.', inviteCode: 'MYSTERY' },
  { id: 'friends', name: '보드게임 친구들', description: '가볍게 모여 즐기는 추리 모임', inviteCode: 'FRIENDS' },
]
const joinedAt = '2026-07-01T00:00:00.000Z'
const demoLeftAt = '2026-11-17T00:00:00.000Z'

const memberships: Membership[] = [
  ...users.map(({ id }, index): Membership => ({ groupId: 'friday', userId: id, role: index === 0 ? 'owner' : index === 1 ? 'manager' : 'member', joinedAt, ...(id === 'sol' ? { leftAt: demoLeftAt } : {}) })),
  ...users.map(({ id }): Membership => ({ groupId: 'club', userId: id, role: id === 'mocha' ? 'owner' : 'member', joinedAt })),
  ...users.slice(0, 4).map(({ id }): Membership => ({ groupId: 'friends', userId: id, role: id === 'luce' ? 'owner' : 'member', joinedAt })),
]
const characters = ['탐정', '가정부', '상속자', '의사', '정원사', '집사', '기자']
const withParticipants = (ids: string[], win: boolean, solved: boolean) => ids.map((id, index) => ({
  ...blankParticipant(id),
  character: characters[index], score: Math.max(1, 9 - index * 2), won: win && index < 2,
  goal: index < 3, solved: solved && index < 2, culprit: index === ids.length - 1,
}))
const seed = (id: string, workId: string, groupId: string, date: string, ids: string[], createdBy: string, win: boolean, solved: boolean): Play => ({
  id, workId, groupId, date, createdBy, updatedAt: `${date}T12:00:00Z`, participants: withParticipants(ids, win, solved),
  result: { culprit: characters[ids.length - 1], notes: '마지막 투표에서 증언과 알리바이를 대조해 사건을 정리했습니다.' },
})
const plays = [
  seed('first', 'lighthouse', 'friday', '2026-11-15', ['haru', 'luce', 'mocha', 'dodam', 'liv', 'sol'], 'haru', true, true),
  seed('second', 'train', 'friday', '2026-10-31', ['mystery', 'haru', 'mocha', 'dodam', 'liv'], 'mystery', false, false),
  seed('third', 'mountain', 'club', '2026-10-12', ['mystery', 'luce', 'mocha', 'liv', 'sol'], 'mocha', true, true),
  seed('fourth', 'ballroom', 'friday', '2026-09-28', ['mystery', 'haru', 'luce', 'mocha', 'dodam', 'liv'], 'mystery', true, true),
  seed('fifth', 'castle', 'friends', '2026-09-07', ['mystery', 'haru', 'luce', 'mocha'], 'luce', false, true),
]
const initial: Database = { users, works, groups, memberships, plays, activeUserId: 'mystery' }
export const storageKey = 'mumy-log:database:v4'

type LegacyPlay = { id: string; workId: string; date: string; group: string; participants: number; canView: boolean; outcome: string; solved: boolean }

function restoreDemoMemberships(db: Database): Database {
  const memberships = db.memberships.map((entry) => {
    const wasRemovedByDemo = entry.userId === 'mystery' && (entry.groupId === 'club' || entry.groupId === 'friends') &&
      entry.joinedAt === joinedAt && entry.role === 'member' && entry.leftAt === demoLeftAt
    if (!wasRemovedByDemo) return entry
    const rejoined = db.memberships.some((other) => other.userId === entry.userId && other.groupId === entry.groupId && other.joinedAt > entry.joinedAt)
    return rejoined ? entry : { ...entry, leftAt: undefined }
  })
  return { ...db, memberships }
}

export function readDatabase(): Database {
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved) return JSON.parse(saved) as Database
    const v3 = localStorage.getItem('mumy-log:database:v3')
    if (v3) return restoreDemoMemberships(JSON.parse(v3) as Database)
    const v2 = localStorage.getItem('mumy-log:database:v2')
    if (v2) return JSON.parse(v2) as Database
    const oldPlays = localStorage.getItem('mumy-log:plays:v1')
    const oldGroup = localStorage.getItem('mumy-log:group:v1')
    const settings = oldGroup ? JSON.parse(oldGroup) as { name: string; description: string } : null
    if (!oldPlays && !settings) return initial

    return {
      ...initial,
      groups: groups.map((group) => settings && group.id === 'friday' ? { ...group, ...settings } : group),
      plays: oldPlays ? (JSON.parse(oldPlays) as LegacyPlay[]).map((old) => {
        const original = plays.find(({ id }) => id === old.id)
        if (original) return original
        const people = users.filter((user) => old.canView || user.id !== 'mystery').slice(0, old.participants).map(({ id }) => id)
        const groupId = groups.find(({ name }) => name === old.group)?.id ?? 'friday'
        return { ...seed(old.id, old.workId, groupId, old.date, people, 'mystery', old.outcome === 'win', old.solved), result: { culprit: '', notes: '' } }
      }) : plays,
    }
  } catch {
    return initial
  }
}
