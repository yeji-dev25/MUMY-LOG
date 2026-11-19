import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BookOpen, ChevronRight, House, Search, UserRound, UsersRound } from 'lucide-react'
import { AccountPanel, GroupEditor, InviteCode, JoinPanel, MemberPanel, RecordEditor, WorkEditor } from './forms'
import { readDatabase, storageKey } from './mocks'
import { canManageRecords, duplicatePlayers, findGroup, findUser, findWork, formatDate, groupPlays, joinedGroups, leaveGroup, personalPlays, playerRange, roleIn, setPlayDeleted } from './model'
import type { Database } from './model'
import { GroupDetail, Groups, Home, PersonalStats, RecordDetail, Records, Works } from './pages'
import type { Panel, WorkFilters } from './pages'
import { Art, Brand, PageHeader, PlayRow, Sheet } from './ui'

const tabs = [
  { path: '/', label: '홈', Icon: House },
  { path: '/records', label: '내 기록', Icon: BookOpen },
  { path: '/works', label: '작품', Icon: Search },
  { path: '/group', label: '모임', Icon: UsersRound },
]

const panelTitles: Record<Panel, string> = {
  register: '기록 등록하기', edit: '공동 기록 수정', notifications: '알림', profile: '마이',
  statistics: '내 플레이 통계', members: '모임 구성원', permissions: '기록 관리자', groupSettings: '모임 설정',
  workFilters: '작품 필터', work: '작품 정보', newWork: '작품 등록', newGroup: '모임 만들기', joinGroup: '모임 가입',
  recordMenu: '기록 옵션', deleteRecord: '공동 기록 삭제', deletedRecords: '삭제된 기록', leaveGroup: '모임 탈퇴',
}
const readPath = () => window.location.hash.slice(1) || '/'

export default function App() {
  const [path, setPath] = useState(readPath)
  const [db, setDb] = useState(readDatabase)
  const [filters, setFilters] = useState<WorkFilters>({ minimum: 0, groupId: 'friday' })
  const [panel, setPanel] = useState<{ type: Panel; id?: string; workId?: string } | null>(null)
  const [notice, setNotice] = useState('')
  const mainRef = useRef<HTMLElement>(null)
  const previousPath = useRef(path)
  const actor = db.activeUserId
  const user = actor ? findUser(db, actor) : undefined
  const myGroups = joinedGroups(db, actor)
  const [, groupId, groupRecordId] = /^\/group\/([^/]+)(?:\/records\/([^/]+))?$/.exec(path) ?? []
  const [, personalRecordId] = /^\/records\/([^/]+)$/.exec(path) ?? []
  const currentGroup = groupId && !groupRecordId && roleIn(db, actor, groupId) ? findGroup(db, groupId) : undefined
  const currentRecord = groupId && groupRecordId
    ? groupPlays(db, actor, groupId).find(({ id }) => id === groupRecordId)
    : personalRecordId ? personalPlays(db, actor).find(({ id }) => id === personalRecordId) : undefined
  const panelGroup = panel?.id ? findGroup(db, panel.id) : undefined
  const panelRole = panelGroup ? roleIn(db, actor, panelGroup.id) : undefined
  const panelRecord = groupRecordId && panel?.id === currentRecord?.id ? currentRecord : undefined
  const panelWork = panel?.id ? findWork(db, panel.id) : undefined
  const duplicateGroup = myGroups.find(({ id }) => id === filters.groupId)
  const activeTab = path.startsWith('/records/') ? '/records' : path.startsWith('/group/') ? '/group' : path

  useEffect(() => {
    const onHashChange = (event: HashChangeEvent) => {
      if (!history.state?.mumy) history.replaceState({ mumy: true, from: new URL(event.oldURL).hash.slice(1) || '/' }, '')
      setPath(readPath())
      setPanel(null)
    }
    history.replaceState({ mumy: true, from: history.state?.from }, '')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    if (previousPath.current !== path) {
      mainRef.current?.querySelector<HTMLHeadingElement>('.page:not([hidden]) h1')?.focus({ preventScroll: true })
      previousPath.current = path
    }
  }, [path])

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(db)) } catch { /* Keep the demo usable when storage is blocked. */ }
  }, [db])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 3000)
    return () => window.clearTimeout(timeout)
  }, [notice])

  function back(fallback: string) {
    if (history.state?.from && history.state.from !== path) history.back()
    else window.location.replace(`#${fallback}`)
  }

  function update(next: Database, message?: string) {
    setDb(next)
    if (message) setNotice(message)
  }

  function open(type: Panel, id?: string) {
    setPanel({ type, id })
  }

  const close = () => setPanel(null)
  const showGroup = (id: string) => { close(); window.location.hash = `/group/${id}` }
  const pageProps = { db, open }

  return (
    <div className="app-shell">
      <aside className="navigation">
        <div className="desktop-brand"><Brand /></div>
        <nav aria-label="주 메뉴">
          {tabs.map(({ path: target, label, Icon }) => <a key={target} href={`#${target}`} aria-current={activeTab === target ? 'page' : undefined}><Icon size={21} /><span>{label}</span></a>)}
          <button type="button" onClick={() => open('profile')}><UserRound size={21} /><span>마이</span></button>
        </nav>
        <button className="sidebar-profile" type="button" onClick={() => open('profile')}><span className="avatar"><UserRound size={18} /></span><span><strong>{user?.nickname ?? '로그인'}</strong><small>{user ? '나의 프로필' : 'MUMY LOG 계정'}</small></span><ChevronRight size={16} /></button>
      </aside>
      <div className="workspace">
        <div className="mobile-brand"><Brand /></div>
        <main className={`main-content ${path === '/' ? 'is-home' : 'inner-page'}`} ref={mainRef}>
          <div className="page" hidden={path !== '/'}><Home {...pageProps} /></div>
          <div className="page" hidden={path !== '/records'}><Records key={actor} {...pageProps} /></div>
          <div className="page" hidden={path !== '/works'}><Works key={actor} {...pageProps} filters={filters} /></div>
          <div className="page" hidden={path !== '/group'}><Groups {...pageProps} /></div>
          {currentGroup && <div className="page" key={`${currentGroup.id}:${actor}`}><GroupDetail {...pageProps} group={currentGroup} onBack={() => back('/group')} /></div>}
          {currentRecord && <div className="page" key={`${path}:${actor}`}><RecordDetail {...pageProps} play={currentRecord} inGroup={Boolean(groupRecordId)} onBack={() => back(groupId ? `/group/${groupId}` : '/records')} /></div>}
          {!tabs.some((tab) => tab.path === path) && !currentRecord && !currentGroup && <div className="page">
            <PageHeader title="화면을 열 수 없어요" />
            <div className="guest-actions card">
              <p>{groupId ? '모임 기록은 현재 모임 구성원에게만 표시됩니다.' : personalRecordId ? '내 기록에는 내가 참여한 플레이가 표시됩니다.' : '주소를 확인하고 다시 시도해 주세요.'}</p>
              {!actor && (groupId || personalRecordId) && <button className="primary-button" type="button" onClick={() => open('profile')}>로그인 · 회원가입</button>}
              <a className="secondary-button" href={groupId ? '#/group' : personalRecordId ? '#/records' : '#/'}>{groupId ? '내 모임으로' : personalRecordId ? '내 기록으로' : '홈으로 돌아가기'}</a>
            </div>
          </div>}
        </main>
      </div>
      {notice && <div className="toast" role="status">{notice}</div>}
      {panel && (
        <Sheet key={`${panel.type}:${panel.id ?? ''}`} title={panelTitles[panel.type]} onClose={close}>
          {panel.type === 'profile' && <AccountPanel db={db} update={update} onClose={close} />}
          {panel.type === 'notifications' && <p className="empty">새로운 알림이 없어요.</p>}
          {panel.type === 'statistics' && <PersonalStats db={db} />}
          {panel.type === 'newGroup' && <GroupEditor db={db} update={update} onDone={showGroup} />}
          {panel.type === 'joinGroup' && <JoinPanel db={db} update={update} onDone={showGroup} />}
          {(panel.type === 'members' || panel.type === 'permissions') && panelGroup && panelRole && <MemberPanel db={db} group={panelGroup} update={update} permissions={panel.type === 'permissions'} />}
          {panel.type === 'groupSettings' && panelGroup && panelRole && <>
            <InviteCode db={db} group={panelGroup} />
            {panelRole === 'owner' ? <div className="form"><GroupEditor db={db} group={panelGroup} update={update} onDone={close} /><button className="secondary-button" type="button" onClick={() => open('deletedRecords', panelGroup.id)}>삭제된 기록 보기</button><p>모임에서 탈퇴하려면 구성원 관리에서 모임장을 위임해야 해요.</p></div>
              : <button className="secondary-button danger" type="button" onClick={() => open('leaveGroup', panelGroup.id)}>모임 탈퇴하기</button>}
          </>}
          {panel.type === 'leaveGroup' && panelGroup && panelRole && panelRole !== 'owner' && actor && <div className="form"><p>{panelGroup.name}에서 탈퇴할까요? 참여한 플레이는 내 기록에 남고 상세 결과를 계속 볼 수 있어요.</p><button className="secondary-button danger" type="button" onClick={() => {
            update(leaveGroup(db, panelGroup.id, actor), '모임에서 탈퇴했어요.')
            close()
            window.location.replace('#/group')
          }}>탈퇴하기</button></div>}
          {panel.type === 'deletedRecords' && panelGroup && panelRole === 'owner' && actor && <DeletedRecords db={db} groupId={panelGroup.id} onRestore={(id) => update(setPlayDeleted(db, actor, id, false), '공동 기록을 복구했어요.')} />}
          {panel.type === 'newWork' && <WorkEditor db={db} update={update} onDone={(id) => open('work', id)} />}
          {panel.type === 'workFilters' && <form className="form" onSubmit={(event) => {
            event.preventDefault()
            const values = new FormData(event.currentTarget)
            setFilters({ minimum: Number(values.get('minimum')), groupId: String(values.get('group')) })
            close()
          }}>
            <label>참여 인원<select name="minimum" defaultValue={filters.minimum}><option value="0">모든 작품</option><option value="5">5인 이상 가능</option><option value="6">6인 이상 가능</option><option value="7">7인 이상 가능</option></select></label>
            <label>중복 플레이를 확인할 모임<select name="group" defaultValue={duplicateGroup?.id ?? ''}><option value="">선택 안 함</option>{myGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
            <button type="submit" className="primary-button">필터 적용하기</button>
          </form>}
          {panel.type === 'work' && panelWork && <div className="work-panel">
            <div className="panel-profile"><Art name={panelWork.id} /><div><strong>{panelWork.title}</strong><p>{[panelWork.author, panelWork.genre].filter(Boolean).join(' · ')}</p></div></div>
            <dl className="record-facts card"><div><dt>권장 인원</dt><dd>{playerRange(panelWork)}</dd></div><div><dt>예상 플레이 시간</dt><dd>{panelWork.duration}분</dd></div></dl>
            {panelWork.description && <p>{panelWork.description}</p>}
            {duplicateGroup && <div className="confirmation card"><strong>{duplicateGroup.name}의 중복 플레이 확인</strong><p>{duplicatePlayers(db, panelWork.id, duplicateGroup.id).map(({ nickname }) => nickname).join(', ') || '아직 플레이한 구성원이 없어요.'}</p></div>}
            <WorkHistory db={db} workId={panelWork.id} />
            {myGroups.some((group) => canManageRecords(db, actor, group.id)) && <button className="primary-button" type="button" onClick={() => setPanel({ type: 'register', workId: panelWork.id })}>이 작품으로 기록 등록하기</button>}
          </div>}
          {panel.type === 'register' && <RecordEditor db={db} update={update} initialGroup={panel.id} initialWork={panel.workId} onDone={close} />}
          {panel.type === 'edit' && panelRecord && <RecordEditor db={db} update={update} original={panelRecord} onDone={close} />}
          {panel.type === 'recordMenu' && panelRecord && canManageRecords(db, actor, panelRecord.groupId) && <div className="form">
            <button type="button" className="primary-button" onClick={() => open('edit', panelRecord.id)}>공동 기록 수정하기</button>
            {roleIn(db, actor, panelRecord.groupId) === 'owner' && <button type="button" className="secondary-button danger" onClick={() => open('deleteRecord', panelRecord.id)}>공동 기록 삭제하기</button>}
          </div>}
          {panel.type === 'deleteRecord' && panelRecord && actor && roleIn(db, actor, panelRecord.groupId) === 'owner' && <div className="form">
            <p>이 공동 기록을 삭제할까요? 참여자의 개인 이력과 통계에서 제외되며 모임 설정에서 복구할 수 있어요.</p>
            <button type="button" className="secondary-button danger" onClick={() => {
              update(setPlayDeleted(db, actor, panelRecord.id, true), '공동 기록을 삭제했어요.')
              close()
              window.location.replace(`#/group/${panelRecord.groupId}`)
            }}>삭제하기</button>
          </div>}
        </Sheet>
      )}
    </div>
  )
}

function WorkHistory({ db, workId }: { db: Database; workId: string }) {
  if (!db.activeUserId) return null
  const plays = personalPlays(db, db.activeUserId).filter((play) => play.workId === workId)
  return <section><h3 className="panel-subtitle">내 플레이 이력</h3><div className="rows">{plays.map((play) => <PlayRow db={db} play={play} key={play.id} />)}{!plays.length && <p>이 작품에 참여한 기록이 없어요.</p>}</div></section>
}

function DeletedRecords({ db, groupId, onRestore }: { db: Database; groupId: string; onRestore: (id: string) => void }) {
  const plays = db.plays.filter((play) => play.groupId === groupId && play.deletedAt)
  if (!plays.length) return <p className="empty">삭제된 기록이 없어요.</p>
  return <ul className="member-list plain management-list">{plays.map((play) => <li key={play.id}><div className="management-person"><strong>{findWork(db, play.workId)?.title}</strong><span>{formatDate(play.date)}</span></div><button className="text-button" type="button" onClick={() => onRestore(play.id)}>복구하기</button></li>)}</ul>
}
