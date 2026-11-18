import { useState } from 'react'
import { BarChart3, Bell, CalendarDays, ChevronRight, Crown, Dices, Ellipsis, Funnel, LockKeyhole, Plus, Search, Settings, ShieldCheck, SlidersHorizontal, UserRound, UserRoundPlus, UsersRound, X } from 'lucide-react'
import { canManageRecords, canReadDetails, currentMembers, duplicatePlayers, findGroup, findUser, findWork, formatDate, groupPlays, joinedGroups, matches, personalPlays, personalStats, playerRange, roleIn, roleLabels } from './model'
import type { Database, Group, Play } from './model'
import { Art, Choices, PageHeader, PlayRow, SearchBox, SectionTitle } from './ui'

export type Panel = 'register' | 'edit' | 'notifications' | 'profile' | 'statistics' | 'members' | 'permissions' | 'groupSettings' | 'workFilters' | 'work' | 'newWork' | 'newGroup' | 'joinGroup' | 'recordMenu' | 'deleteRecord' | 'deletedRecords' | 'leaveGroup'
export type OpenPanel = (panel: Panel, id?: string) => void
type PageProps = { db: Database; open: OpenPanel }
export type WorkFilters = { minimum: number; groupId: string }

function AddRecord({ open, groupId }: { open: OpenPanel; groupId?: string }) {
  return <button className="primary-button" type="button" onClick={() => open('register', groupId)}><Plus size={21} /> 기록 등록하기</button>
}

export function PersonalStats({ db }: { db: Database }) {
  const { total, wins, solved, culprit } = personalStats(personalPlays(db, db.activeUserId), db.activeUserId)
  return <dl className="record-facts card">
    <div><dt>누적 플레이</dt><dd>{total}회</dd></div>
    <div><dt>승리</dt><dd>{wins}회</dd></div>
    <div><dt>승률</dt><dd>{total ? Math.round(wins / total * 100) : 0}%</dd></div>
    <div><dt>범인 역할 수행</dt><dd>{culprit}회</dd></div>
    <div><dt>범인 추리 성공</dt><dd>{solved}회</dd></div>
  </dl>
}

function GroupRow({ db, group }: { db: Database; group: Group }) {
  const role = roleIn(db, db.activeUserId, group.id)
  return <a className="item-row card group-row" href={`#/group/${group.id}`}>
    <Art name="group" />
    <div className="row-content"><h3>{group.name}</h3><p>구성원 {currentMembers(db, group.id).length}명 <span className="divider" /> 기록 {groupPlays(db, db.activeUserId, group.id).length}회</p></div>
    {role && <span className="badge">{roleLabels[role]}</span>}
    <ChevronRight className="row-arrow" size={19} />
  </a>
}

export function Home({ db, open }: PageProps) {
  const user = db.users.find(({ id }) => id === db.activeUserId)
  const plays = personalPlays(db, db.activeUserId)
  const groups = joinedGroups(db, db.activeUserId)
  const stats = personalStats(plays, db.activeUserId)
  return <>
    <section className="hero">
      <Art name="hero" />
      <div className="hero-copy">
        <p>나의 머더미스터리 플레이 일지</p>
        <h1 tabIndex={-1}>오늘의 추리,<br />기록으로 남겨요.</h1>
        <p>머더미스터리 플레이 경험을<br className="mobile-break" /> 함께 기록하고 관리하세요.</p>
      </div>
      {user && <button className="icon-button hero-bell" type="button" aria-label="알림" onClick={() => open('notifications')}><Bell size={21} /></button>}
    </section>
    {user ? <div className="home-content">
      <section className="home-overview" aria-label="나의 플레이 요약">
        <SectionTitle title={`안녕하세요, ${user.nickname} 님!`}><button className="text-button" type="button" onClick={() => open('profile')} aria-label="내 프로필"><ChevronRight size={19} /></button></SectionTitle>
        <div className="stats card">
          <div className="stats-total"><span className="stat-icon"><Dices size={23} /></span><div><span>누적 플레이</span><strong>{stats.total}<small>회</small></strong></div></div>
          <div className="stats-breakdown"><p><Crown size={17} /><span>승리</span><strong>{stats.wins}회</strong></p><p><Search size={17} /><span>범인 추리 성공</span><strong>{stats.solved}회</strong></p></div>
        </div>
        {groups.some((group) => canManageRecords(db, user.id, group.id)) && <AddRecord open={open} />}
      </section>
      <div className="home-lists">
        <section><SectionTitle title="최근 플레이" href="#/records" /><div className="rows home-recent">
          {plays.slice(0, 2).map((play) => <PlayRow db={db} play={play} key={play.id} />)}
          {!plays.length && <p className="empty card">아직 참여한 플레이가 없어요.</p>}
        </div></section>
        <section><SectionTitle title="내 모임" href="#/group" /><div className="rows">
          {groups.slice(0, 2).map((group) => <GroupRow db={db} group={group} key={group.id} />)}
          {!groups.length && <p className="empty card">모임을 만들거나 초대 코드로 참여해 보세요.</p>}
        </div></section>
      </div>
    </div> : <div className="guest-actions card"><p>내 기록과 가입한 모임을 보려면 로그인하세요.</p><button className="primary-button" type="button" onClick={() => open('profile')}>로그인 · 회원가입</button></div>}
  </>
}

export function Records({ db, open }: PageProps) {
  const [query, setQuery] = useState('')
  const [groupId, setGroupId] = useState('')
  const [ascending, setAscending] = useState(false)
  const plays = personalPlays(db, db.activeUserId)
  const groups = db.groups.filter((group) => plays.some((play) => play.groupId === group.id))
  const filtered = plays.filter((play) => (!groupId || play.groupId === groupId) && matches(query, findWork(db, play.workId)?.title ?? '', findGroup(db, play.groupId)?.name ?? '', play.date, formatDate(play.date)))
  if (ascending) filtered.reverse()

  return <>
    <PageHeader title="내 기록">{db.activeUserId && <button type="button" className="icon-button soft" aria-label="플레이 통계" onClick={() => open('statistics')}><BarChart3 size={21} /></button>}</PageHeader>
    {db.activeUserId ? <>
      <div className="search-line"><SearchBox value={query} onChange={setQuery} placeholder="작품명, 모임, 날짜로 검색" /><button type="button" aria-label={ascending ? '최신순으로 정렬' : '오래된순으로 정렬'} aria-pressed={ascending} className="icon-button soft" onClick={() => setAscending(!ascending)}><SlidersHorizontal size={19} /></button></div>
      <div className="list-toolbar"><label className="inline-field">모임 <select value={groupId} onChange={(event) => setGroupId(event.target.value)}><option value="">전체 모임</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><span>{filtered.length}개 기록 · {ascending ? '오래된순' : '최신순'}</span></div>
      <div className="rows">{filtered.map((play) => <PlayRow db={db} key={play.id} play={play} />)}{!filtered.length && <p className="empty card">{plays.length ? '조건에 맞는 플레이 기록이 없어요.' : '아직 참여한 플레이가 없어요.'}</p>}</div>
    </> : <div className="guest-actions card"><p>로그인하면 참여한 플레이를 모아 볼 수 있어요.</p><button className="primary-button" type="button" onClick={() => open('profile')}>로그인 · 회원가입</button></div>}
  </>
}

export function Groups({ db, open }: PageProps) {
  const mine = joinedGroups(db, db.activeUserId)
  return <>
    <PageHeader title="모임" />
    {db.activeUserId ? <>
      <div className="button-row"><button className="primary-button" type="button" onClick={() => open('newGroup')}><Plus size={19} />모임 만들기</button><button className="secondary-button" type="button" onClick={() => open('joinGroup')}><UserRoundPlus size={19} />초대 코드로 가입</button></div>
      <section className="block-section"><SectionTitle title="내 모임" /><div className="rows">{mine.map((group) => <GroupRow key={group.id} group={group} db={db} />)}{!mine.length && <p className="empty card">모임을 만들거나 초대 코드로 가입해 보세요.</p>}</div></section>
    </> : <div className="guest-actions card"><p>로그인하면 가입한 모임을 볼 수 있어요.</p><button className="primary-button" type="button" onClick={() => open('profile')}>로그인 · 회원가입</button></div>}
  </>
}

export function GroupDetail({ db, open, group, onBack }: PageProps & { group: Group; onBack: () => void }) {
  const [tab, setTab] = useState<'records' | 'stats' | 'rank'>('records')
  const [ascending, setAscending] = useState(false)
  const [query, setQuery] = useState('')
  const role = roleIn(db, db.activeUserId, group.id)
  if (!role) return null

  const owner = role === 'owner'
  const plays = groupPlays(db, db.activeUserId, group.id)
  const roster = currentMembers(db, group.id).map((member) => ({
    member,
    nickname: findUser(db, member.userId)?.nickname,
    count: plays.filter((play) => play.participants.some((person) => person.userId === member.userId)).length,
  }))
  const filtered = plays.filter((play) => matches(query, findWork(db, play.workId)?.title ?? '', play.date, formatDate(play.date)))
  if (ascending) filtered.reverse()
  return <>
    <PageHeader title="모임 상세" onBack={onBack}><button type="button" className="icon-button" aria-label="모임 옵션" onClick={() => open('groupSettings', group.id)}><Ellipsis size={22} /></button></PageHeader>
    <div className="group-hero"><Art name="group" /><h2>{group.name}</h2>{group.description && <p>{group.description}</p>}<span className="badge">{roleLabels[role]}</span></div>
    <div className="group-actions">
      <button className="card" type="button" onClick={() => open('members', group.id)}><UsersRound size={19} />{owner ? '구성원 관리' : '구성원'}</button>
      <button className="card" type="button" onClick={() => open('permissions', group.id)}><ShieldCheck size={19} />기록 관리자</button>
      <button className="card" type="button" onClick={() => open('groupSettings', group.id)}><Settings size={19} />모임 설정</button>
    </div>
    <Choices className="underline-choices" label="모임 정보" value={tab} onChange={setTab} options={[{ value: 'records', label: `플레이 기록 (${plays.length})` }, { value: 'stats', label: '통계' }, { value: 'rank', label: '랭킹' }]} />
    {tab === 'records' && <>
      {canManageRecords(db, db.activeUserId, group.id) && <AddRecord open={open} groupId={group.id} />}
      <section className="group-records"><SectionTitle title="플레이 기록"><button className="text-button" type="button" onClick={() => setAscending(!ascending)}>{ascending ? '오래된순' : '최신순'} <ChevronRight size={15} className="rotate-down" /></button></SectionTitle>
        <div className="search-line"><SearchBox value={query} onChange={setQuery} placeholder="작품명, 날짜로 검색" /></div>
        <div className="rows">{filtered.map((play) => <PlayRow db={db} play={play} inGroup key={play.id} />)}{!filtered.length && <p className="empty card">{plays.length ? '조건에 맞는 플레이 기록이 없어요.' : '등록된 플레이 기록이 없어요.'}</p>}</div>
      </section>
    </>}
    {tab === 'stats' && <>
      <dl className="record-facts card"><div><dt>누적 플레이</dt><dd>{plays.length}회</dd></div><div><dt>진행한 작품</dt><dd>{new Set(plays.map((play) => play.workId)).size}개</dd></div></dl>
      <section className="block-section"><SectionTitle title="현재 구성원별 참여 횟수" /><ul className="member-list card">{roster.map(({ member, nickname, count }) => <li key={member.userId}><strong>{nickname}</strong><span className="badge">{count}회</span></li>)}</ul></section>
    </>}
    {tab === 'rank' && <section><SectionTitle title="플레이 횟수 랭킹" /><ol className="member-list card">{roster.sort((a, b) => b.count - a.count).map(({ member, nickname, count }, index, sorted) => <li key={member.userId}><span className="avatar">{index === 0 || count !== sorted[index - 1].count ? index + 1 : sorted.findIndex((entry) => entry.count === count) + 1}</span><strong>{nickname}</strong><span className="badge">{count}회 참여</span></li>)}</ol></section>}
  </>
}

export function Works({ db, open, filters }: PageProps & { filters: WorkFilters }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'played' | 'unplayed'>('all')
  const [showInfo, setShowInfo] = useState(true)
  const selectedGroup = roleIn(db, db.activeUserId, filters.groupId) ? findGroup(db, filters.groupId) : undefined
  const mine = new Set(personalPlays(db, db.activeUserId).map((play) => play.workId))
  const visible = db.works.filter((work) => matches(query, work.title, work.author) && work.maxPlayers >= filters.minimum && (filter === 'all' || mine.has(work.id) === (filter === 'played')))

  return <>
    <PageHeader title="작품">{db.activeUserId && <button className="icon-button soft" type="button" aria-label="작품 등록" onClick={() => open('newWork')}><Plus size={21} /></button>}</PageHeader>
    <SearchBox value={query} onChange={setQuery} placeholder="작품명, 작가명으로 검색" />
    <div className="search-line works-filters">
      {db.activeUserId && <Choices label="내 플레이 여부" value={filter} onChange={setFilter} options={[{ value: 'all', label: '전체' }, { value: 'played', label: '내가 플레이함' }, { value: 'unplayed', label: '미플레이' }]} />}
      <button type="button" className="icon-button soft" aria-label="작품 필터" aria-pressed={filters.minimum > 0 || !!selectedGroup} onClick={() => open('workFilters')}><Funnel size={19} /></button>
    </div>
    {showInfo && selectedGroup && <div className="info-banner"><UsersRound size={22} /><p><strong>{selectedGroup.name}</strong>의 플레이 기록에서 중복 여부를 확인할 수 있어요.</p><button className="icon-button" type="button" aria-label="안내 닫기" onClick={() => setShowInfo(false)}><X size={16} /></button></div>}
    <div className="rows">{visible.map((work) => {
      const count = selectedGroup ? duplicatePlayers(db, work.id, selectedGroup.id).length : 0
      return <button className="item-row card work-row" key={work.id} type="button" onClick={() => open('work', work.id)}>
        <Art name={work.id} /><div className="row-content"><h3>{work.title}</h3><p>{playerRange(work)} · {work.genre}</p>{selectedGroup && <p><UsersRound size={15} />{count ? `모임 구성원 ${count}명이 플레이함` : '아직 플레이한 구성원이 없어요'}</p>}</div>
        <div className="work-action">{db.activeUserId && <span className={`badge ${mine.has(work.id) ? 'badge--warm' : ''}`}>{mine.has(work.id) ? '플레이 완료 ✓' : '미플레이'}</span>}<ChevronRight className="row-arrow" size={17} /></div>
      </button>
    })}{!visible.length && <p className="empty card">조건에 맞는 작품이 없어요.</p>}</div>
  </>
}

export function RecordDetail({ db, play, open, inGroup, onBack }: PageProps & { play: Play; inGroup: boolean; onBack: () => void }) {
  const [tab, setTab] = useState<'info' | 'spoilers'>('info')
  const [revealed, setRevealed] = useState(false)
  const work = findWork(db, play.workId)
  const group = findGroup(db, play.groupId)
  const allowed = canReadDetails(play, db.activeUserId)
  if (!work || !group) return null
  const member = roleIn(db, db.activeUserId, group.id)
  const scores = play.participants.flatMap(({ score }) => score === null ? [] : [score])

  return <>
    <PageHeader title="플레이 기록" onBack={onBack}>{inGroup && canManageRecords(db, db.activeUserId, play.groupId) && <button type="button" className="icon-button" aria-label="기록 옵션" onClick={() => open('recordMenu', play.id)}><Ellipsis size={22} /></button>}</PageHeader>
    <div className="detail-overview card"><Art name={work.id} /><div className="row-content"><h2>{work.title}</h2><p><CalendarDays size={16} />{formatDate(play.date)}</p><p><UsersRound size={16} />{group.name}</p><span className="badge badge--warm"><LockKeyhole size={13} />참여자만 상세 정보 열람 가능</span></div></div>
    <Choices label="기록 상세 탭" className="detail-choices" value={tab} onChange={(next) => { setTab(next); setRevealed(false) }} options={[{ value: 'info', label: '기록 정보' }, { value: 'spoilers', label: '상세 기록 (스포일러)' }]} />
    {tab === 'info' && <>
      <dl className="record-facts card">
        <div><dt>작품 정보</dt><dd><button type="button" className="text-button" onClick={() => open('work', work.id)}>{work.title}<ChevronRight size={15} /></button></dd></div>
        <div><dt>플레이 일자</dt><dd>{formatDate(play.date)}</dd></div>
        <div><dt>모임</dt><dd>{member ? <a className="text-button" href={`#/group/${group.id}`}>{group.name}<ChevronRight size={15} /></a> : group.name}</dd></div>
        <div><dt>참여 인원</dt><dd>{play.participants.length}명</dd></div>
      </dl>
      <section className="participant-section"><SectionTitle title={`참여자 (${play.participants.length})`} /><ul className="member-list card">{play.participants.map(({ userId }) => <li key={userId}><span className="avatar"><UserRound size={16} /></span><strong>{findUser(db, userId)?.nickname}{userId === db.activeUserId && <small> (나)</small>}</strong></li>)}</ul></section>
    </>}
    {(!revealed || !allowed) && <div className="lock-card"><LockKeyhole size={25} /><strong>스포일러가 포함된 상세 기록입니다.</strong><p>{allowed && tab === 'spoilers' ? '열람하면 배역과 사건 결과를 확인할 수 있어요.' : '이 플레이의 참여자만 상세 기록을 확인할 수 있습니다.'}</p>{allowed && tab === 'spoilers' && <button type="button" className="primary-button" onClick={() => setRevealed(true)}>스포일러 보기</button>}</div>}
    {tab === 'spoilers' && allowed && revealed && <>
      <div className="card revealed"><h2>사건 결과</h2><p><strong>범인</strong> · {play.result.culprit || '미기록'}</p>{play.result.notes && <p className="record-notes">{play.result.notes}</p>}<button className="text-button" type="button" onClick={() => setRevealed(false)}>다시 가리기</button></div>
      <section className="block-section"><SectionTitle title="참여자별 결과" /><div className="rows">{play.participants.map((person) => <article key={person.userId} className="card result-person">
        <h3>{findUser(db, person.userId)?.nickname}{person.userId === db.activeUserId && ' (나)'}</h3><p>배역 {person.character || '미기록'} · {person.score === null ? '승점 미기록' : `${person.score}점 · ${1 + scores.filter((score) => score > Number(person.score)).length}위`}</p>
        <div className="result-tags"><span className="badge">{person.won ? '승리' : '미승리'}</span><span className="badge">개인 목표 {person.goal ? '달성' : '미달성'}</span><span className="badge">범인 추리 {person.solved ? '성공' : '미성공'}</span>{person.culprit && <span className="badge badge--warm">범인 역할</span>}</div>
      </article>)}</div></section>
    </>}
  </>
}
