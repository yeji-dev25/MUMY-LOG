import { useLayoutEffect, useRef, useState } from 'react'
import { Check, Clipboard, UserRound } from 'lucide-react'
import { demoUserIds } from './mocks'
import { blankParticipant, canManageRecords, canReadDetails, changeRole, currentMembers, findGroup, findUser, findWork, formatDate, joinedGroups, joinGroup, leaveGroup, makeCredential, matches, normalize, playerRange, roleIn, roleLabels, savePlay, today } from './model'
import type { Database, Group, Participant, Play, PlayInput, User } from './model'
import { Choices, SearchBox } from './ui'

export type UpdateDatabase = (next: Database, notice?: string) => void
type EditorProps = { db: Database; update: UpdateDatabase }

export function AccountPanel({ db, update, onClose }: EditorProps & { onClose: () => void }) {
  const user = db.activeUserId ? findUser(db, db.activeUserId) : undefined
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const demoUsers = demoUserIds.flatMap((id) => findUser(db, id) ?? [])
  function selectAccount(userId: string | null) {
    update({ ...db, activeUserId: userId }, userId ? '로그인했어요.' : '로그아웃했어요.')
    onClose()
  }

  return <>
    {user ? <form className="form" onSubmit={(event) => {
      event.preventDefault()
      const nickname = String(new FormData(event.currentTarget).get('nickname')).trim()
      if (nickname.length < 2) { setError('닉네임을 2자 이상 입력해 주세요.'); return }
      if (db.users.some((other) => other.id !== user.id && normalize(other.nickname) === normalize(nickname))) { setError('이미 사용 중인 닉네임이에요.'); return }
      update({ ...db, users: db.users.map((entry) => entry.id === user.id ? { ...entry, nickname } : entry) }, '닉네임을 저장했어요.')
      onClose()
    }}>
      <div className="panel-profile"><span className="avatar"><UserRound size={23} /></span><div><strong>{user.nickname}</strong><p>{user.email}</p></div></div>
      <label>닉네임<input name="nickname" required minLength={2} maxLength={24} defaultValue={user.nickname} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="button-row"><button className="primary-button" type="submit">닉네임 저장</button><button className="secondary-button" type="button" onClick={() => selectAccount(null)}>로그아웃</button></div>
    </form> : <>
      <Choices label="계정 메뉴" value={mode} onChange={(value) => { setMode(value); setError('') }} options={[{ value: 'login', label: '로그인' }, { value: 'signup', label: '회원가입' }]} />
      <form key={mode} className="form" onSubmit={async (event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const email = normalize(String(data.get('email')))
        const nickname = String(data.get('nickname') ?? '').trim()
        const password = String(data.get('password'))
        const existing = db.users.find((entry) => entry.email === email)
        if (mode === 'signup' && (existing || nickname.length < 2 || db.users.some((entry) => normalize(entry.nickname) === normalize(nickname)))) {
          setError(existing ? '이미 등록된 이메일이에요.' : nickname.length < 2 ? '닉네임을 2자 이상 입력해 주세요.' : '이미 사용 중인 닉네임이에요.')
          return
        }
        setBusy(true)
        setError('')
        try {
          if (mode === 'login') {
            if (!existing || await makeCredential(password, existing.credential.split(':')[0]) !== existing.credential) {
              setError('이메일 또는 비밀번호를 확인해 주세요.')
            } else selectAccount(existing.id)
          } else {
            const entry: User = { id: crypto.randomUUID(), nickname, email, credential: await makeCredential(password) }
            update({ ...db, users: [...db.users, entry], activeUserId: entry.id }, '계정을 만들었어요.')
            onClose()
          }
        } catch {
          setError('계정을 처리하지 못했어요. HTTPS 또는 localhost에서 다시 시도해 주세요.')
        } finally {
          setBusy(false)
        }
      }}>
        <p>이 브라우저에서 사용할 테스트 계정이에요. 테스트용 비밀번호를 사용하세요.</p>
        {mode === 'signup' && <label>닉네임<input name="nickname" required minLength={2} maxLength={24} autoComplete="nickname" /></label>}
        <label>이메일<input name="email" required type="email" autoComplete="username" /></label>
        <label>비밀번호<input name="password" type="password" required minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={busy}>{mode === 'login' ? '로그인하기' : '계정 만들기'}</button>
      </form>
    </>}
    <section className="block-section">
      <h3 className="panel-subtitle">데모 계정으로 체험</h3>
      <div className="demo-accounts">{demoUsers.map((entry) => {
        const role = roleIn(db, entry.id, 'friday')
        return <button className="secondary-button" type="button" key={entry.id} disabled={busy || entry.id === db.activeUserId} onClick={() => selectAccount(entry.id)}>
          <strong>{entry.nickname}</strong><small>{role ? roleLabels[role] : '모임 미가입'}</small>
        </button>
      })}</div>
    </section>
  </>
}

export function GroupEditor({ db, group, update, onDone }: EditorProps & { group?: Group; onDone: (id: string) => void }) {
  const [error, setError] = useState('')
  return <form className="form" onSubmit={(event) => {
    event.preventDefault()
    const actor = db.activeUserId
    if (!actor || (group && roleIn(db, actor, group.id) !== 'owner')) return
    const values = new FormData(event.currentTarget)
    const name = String(values.get('name')).trim()
    if (!name) { setError('모임 이름을 입력해 주세요.'); return }
    const description = String(values.get('description')).trim()
    const id = group?.id ?? crypto.randomUUID()
    const entry: Group = { id, name, description, inviteCode: group?.inviteCode ?? id.replaceAll('-', '').toUpperCase() }
    const next: Database = group
      ? { ...db, groups: db.groups.map((item) => item.id === id ? entry : item) }
      : { ...db, groups: [...db.groups, entry], memberships: [...db.memberships, { groupId: id, userId: actor, role: 'owner', joinedAt: new Date().toISOString() }] }
    update(next, group ? '모임 정보를 저장했어요.' : '모임을 만들었어요.')
    onDone(id)
  }}>
    <label>모임 이름<input name="name" required maxLength={30} defaultValue={group?.name} /></label>
    <label>모임 소개<textarea name="description" rows={2} maxLength={140} defaultValue={group?.description} /></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="primary-button" type="submit">{group ? '모임 정보 저장' : '모임 만들기'}</button>
  </form>
}

export function JoinPanel({ db, update, onDone }: EditorProps & { onDone: (groupId: string) => void }) {
  const [error, setError] = useState('')
  return <form className="form" onSubmit={(event) => {
    event.preventDefault()
    if (!db.activeUserId) return
    const code = String(new FormData(event.currentTarget).get('code')).trim().toUpperCase()
    const group = db.groups.find((entry) => entry.inviteCode === code)
    if (!group) { setError('일치하는 초대 코드를 찾을 수 없어요.'); return }
    if (roleIn(db, db.activeUserId, group.id)) { setError('이미 가입한 모임이에요.'); return }
    update(joinGroup(db, group.id, db.activeUserId), '모임에 가입했어요.')
    onDone(group.id)
  }}><label>초대 코드<input name="code" required autoComplete="off" /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" type="submit">모임 가입하기</button></form>
}

export function InviteCode({ db, group }: { db: Database; group: Group }) {
  const [copied, setCopied] = useState(false)
  if (!canManageRecords(db, db.activeUserId, group.id)) return null

  return <div className="invite-code"><div><small>모임 초대 코드</small><code>{group.inviteCode}</code></div>
    {navigator.clipboard && <button className="icon-button" type="button" aria-label={copied ? '복사 완료' : '초대 코드 복사'} onClick={async () => {
      try { await navigator.clipboard.writeText(group.inviteCode); setCopied(true) } catch { setCopied(false) }
    }}>{copied ? <Check size={19} /> : <Clipboard size={19} />}</button>}
  </div>
}

export function MemberPanel({ db, group, update, permissions }: EditorProps & { group: Group; permissions: boolean }) {
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState<{ userId: string; action: 'remove' | 'transfer' } | null>(null)
  const actor = db.activeUserId
  const owner = roleIn(db, actor, group.id) === 'owner'
  const roster = currentMembers(db, group.id)
  const people = roster.flatMap((member) => {
    const user = findUser(db, member.userId)
    return user && matches(query, user.nickname) && (!permissions || owner || member.role !== 'member') ? [{ ...member, user }] : []
  })
  const invitees = owner && !permissions && query.trim() ? db.users.filter((user) => !roster.some((entry) => entry.userId === user.id) && matches(query, user.nickname)) : []

  return <>
    {!permissions && <InviteCode db={db} group={group} />}
    <SearchBox value={query} onChange={setQuery} placeholder="닉네임으로 검색" />
    <ul className="member-list plain management-list">{people.map(({ user, role }) => <li key={user.id}>
      <div className="management-person"><strong>{user.nickname}{user.id === actor && ' (나)'}</strong><span className="badge">{roleLabels[role]}</span></div>
      {owner && actor && actor !== user.id && (permissions
        ? <button className="text-button" type="button" onClick={() => update(changeRole(db, actor, group.id, user.id, role === 'manager' ? 'member' : 'manager'), role === 'manager' ? '기록 관리자 권한을 회수했어요.' : '기록 관리자로 지정했어요.')}>{role === 'manager' ? '권한 회수' : '관리자로 지정'}</button>
        : <div className="management-actions"><button className="text-button" type="button" onClick={() => setPending({ userId: user.id, action: 'transfer' })}>모임장 위임</button><button className="text-button" type="button" onClick={() => setPending({ userId: user.id, action: 'remove' })}>제외</button></div>)}
    </li>)}</ul>
    {!people.length && <p className="empty">일치하는 구성원이 없어요.</p>}
    {!!invitees.length && <section className="block-section"><h3 className="panel-subtitle">가입하지 않은 사용자</h3><ul className="member-list plain management-list">{invitees.map((user) => <li key={user.id}><strong>{user.nickname}</strong><button className="text-button" type="button" onClick={() => update(joinGroup(db, group.id, user.id), '구성원을 추가했어요.')}>구성원 추가</button></li>)}</ul></section>}
    {pending && actor && owner && <div className="confirmation card">
      <p>{findUser(db, pending.userId)?.nickname} 님{pending.action === 'remove' ? '을 모임에서 제외할까요? 기존 플레이 이력은 유지됩니다.' : '에게 모임장을 위임할까요? 본인의 역할은 일반 구성원으로 바뀝니다.'}</p>
      <div className="button-row"><button className="secondary-button" type="button" onClick={() => setPending(null)}>취소</button><button className="primary-button" type="button" onClick={() => {
        update(pending.action === 'remove' ? leaveGroup(db, group.id, pending.userId) : changeRole(db, actor, group.id, pending.userId, 'owner'), pending.action === 'remove' ? '구성원을 제외했어요.' : '모임장을 위임했어요.')
        setPending(null)
      }}>확인</button></div>
    </div>}
  </>
}

export function WorkEditor({ db, update, onDone }: EditorProps & { onDone: (workId: string) => void }) {
  const [error, setError] = useState('')
  return <form className="form" onSubmit={(event) => {
    event.preventDefault()
    if (!db.activeUserId) return
    const data = new FormData(event.currentTarget)
    const title = String(data.get('title')).trim()
    const author = String(data.get('author')).trim()
    const minPlayers = Number(data.get('min'))
    const maxPlayers = Number(data.get('max'))
    if (!title || minPlayers > maxPlayers || db.works.some((work) => normalize(work.title) === normalize(title))) {
      setError(!title ? '작품명을 입력해 주세요.' : minPlayers > maxPlayers ? '최대 인원은 최소 인원 이상이어야 해요.' : '같은 이름의 작품이 이미 있어요.')
      return
    }
    const id = crypto.randomUUID()
    update({ ...db, works: [...db.works, { id, title, author, minPlayers, maxPlayers, duration: Number(data.get('duration')), genre: String(data.get('genre')).trim() || '머더미스터리', description: String(data.get('description')).trim() }] }, '작품을 등록했어요.')
    onDone(id)
  }}>
    <label>작품명<input name="title" required maxLength={60} /></label><label>작가명<input name="author" maxLength={30} /></label>
    <div className="field-pair"><label>최소 인원<input name="min" type="number" required min={1} max={99} defaultValue={4} /></label><label>최대 인원<input name="max" type="number" required min={1} max={99} defaultValue={6} /></label></div>
    <label>예상 플레이 시간 (분)<input name="duration" type="number" required min={1} max={1440} defaultValue={120} /></label><label>장르<input name="genre" maxLength={30} /></label><label>작품 소개<textarea name="description" rows={3} maxLength={320} /></label>
    {error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" type="submit">작품 저장</button>
  </form>
}

export function RecordEditor({ db, update, original, initialGroup, initialWork, onDone }: EditorProps & { original?: Play; initialGroup?: string; initialWork?: string; onDone: () => void }) {
  const actor = db.activeUserId
  const groups = joinedGroups(db, actor).filter((group) => canManageRecords(db, actor, group.id))
  const canPrefill = !original || canReadDetails(original, actor)
  const [step, setStep] = useState(0)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [overwriteDetails, setOverwriteDetails] = useState(false)
  const form = useRef<HTMLFormElement>(null)
  const [draft, setDraft] = useState<PlayInput>(() => ({
    groupId: original?.groupId ?? groups.find(({ id }) => id === initialGroup)?.id ?? groups[0]?.id ?? '',
    workId: original?.workId ?? initialWork ?? db.works[0]?.id ?? '',
    date: original?.date ?? today(),
    participants: original?.participants.map((person) => canPrefill ? person : blankParticipant(person.userId)) ?? [],
    result: original && canPrefill ? original.result : { culprit: '', notes: '' },
  }))
  const work = findWork(db, draft.workId)
  const eligible = [...new Set([...currentMembers(db, draft.groupId).map((member) => member.userId), ...(original?.participants.map((person) => person.userId) ?? [])])]
  const allowResults = canPrefill || overwriteDetails

  useLayoutEffect(() => {
    form.current?.closest('dialog')?.scrollTo(0, 0)
  }, [step])

  if (!actor || !groups.length || (original && !canManageRecords(db, actor, original.groupId))) return <p className="empty">기록 등록 및 수정 권한이 있는 모임이 없어요.</p>

  function changeParticipant(userId: string, change: Partial<Participant>) {
    setDraft((previous) => ({ ...previous, participants: previous.participants.map((person) => person.userId === userId ? { ...person, ...change } : person) }))
  }

  return <form ref={form} className="form" onSubmit={(event) => {
    event.preventDefault()
    setError('')
    if (step === 0 && !draft.participants.length) { setError('실제 플레이한 참여자를 한 명 이상 선택해 주세요.'); return }
    if (step < 2) { setStep(step + 1); return }
    const next = savePlay(db, actor, draft, original?.id, overwriteDetails)
    if (next === db) { setError('기록을 저장하지 못했어요. 모임 권한과 입력 내용을 확인해 주세요.'); return }
    update(next, original ? '공동 기록을 수정했어요.' : '참여자들의 개인 이력에 기록을 추가했어요.')
    onDone()
  }}>
    <ol className="record-steps" aria-label="기록 입력 단계">{['기본 정보', '플레이 결과', '확인'].map((label, index) => <li key={label} aria-current={index === step ? 'step' : undefined}>{label}</li>)}</ol>
    {step === 0 && <>
      <label>모임<select value={draft.groupId} disabled={!!original} onChange={(event) => { setDraft({ ...draft, groupId: event.target.value, participants: [] }); setQuery('') }}>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
      <label>작품<select value={draft.workId} onChange={(event) => setDraft({ ...draft, workId: event.target.value })}>{db.works.map((work) => <option key={work.id} value={work.id}>{work.title}</option>)}</select></label>
      <label>플레이 날짜<input type="date" required value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label>
      <fieldset className="form-fieldset"><legend>참여자 ({draft.participants.length}명)</legend>{work && <p>권장 인원 {playerRange(work)}</p>}<SearchBox value={query} onChange={setQuery} placeholder="참여자 닉네임 검색" />
        <div className="participant-picker">{eligible.flatMap((id) => {
          const person = findUser(db, id)
          if (!person || !matches(query, person.nickname)) return []
          return <label className="checkbox-label" key={id}><input type="checkbox" checked={draft.participants.some((entry) => entry.userId === id)} onChange={(event) => {
            setDraft({ ...draft, participants: event.target.checked ? [...draft.participants, (canPrefill ? original?.participants.find((entry) => entry.userId === id) : undefined) ?? blankParticipant(id)] : draft.participants.filter((entry) => entry.userId !== id) })
          }} /> {person.nickname}{!roleIn(db, id, draft.groupId) && <small>탈퇴한 참여자</small>}</label>
        })}</div>
      </fieldset>
    </>}
    {step === 1 && <>
      {!canPrefill && <>
        <p>참여자가 아니므로 기존 상세 결과는 표시되지 않아요. 참여자만 정정하면 남은 참여자의 상세 결과는 유지됩니다.</p>
        <label className="checkbox-label"><input type="checkbox" checked={overwriteDetails} onChange={(event) => setOverwriteDetails(event.target.checked)} />새 결과를 입력해 기존 상세 결과 덮어쓰기</label>
      </>}
      {allowResults && <>
        {draft.participants.map((person) => <fieldset className="form-fieldset" key={person.userId}><legend>{findUser(db, person.userId)?.nickname}</legend>
          <div className="field-pair"><label>배역<input maxLength={40} value={person.character} onChange={(event) => changeParticipant(person.userId, { character: event.target.value })} /></label><label>승점 (선택)<input type="number" step="any" value={person.score ?? ''} onChange={(event) => changeParticipant(person.userId, { score: event.target.value === '' ? null : event.target.valueAsNumber })} /></label></div>
          <div className="checkbox-grid">{([{ field: 'won', label: '승리' }, { field: 'goal', label: '개인 목표 달성' }, { field: 'solved', label: '범인 추리 성공' }, { field: 'culprit', label: '범인 역할' }] as const).map(({ field, label }) => <label className="checkbox-label" key={field}><input type="checkbox" checked={person[field]} onChange={(event) => changeParticipant(person.userId, { [field]: event.target.checked })} />{label}</label>)}</div>
        </fieldset>)}
        <label>범인 정보<input maxLength={100} value={draft.result.culprit} onChange={(event) => setDraft({ ...draft, result: { ...draft.result, culprit: event.target.value } })} /></label>
        <label>기타 상세 기록<textarea rows={3} maxLength={1000} value={draft.result.notes} onChange={(event) => setDraft({ ...draft, result: { ...draft.result, notes: event.target.value } })} /></label>
      </>}
    </>}
    {step === 2 && <>
      <dl className="record-facts card"><div><dt>모임</dt><dd>{findGroup(db, draft.groupId)?.name}</dd></div><div><dt>작품</dt><dd>{work?.title}</dd></div><div><dt>플레이 날짜</dt><dd>{formatDate(draft.date)}</dd></div><div><dt>참여자</dt><dd>{draft.participants.map((person) => findUser(db, person.userId)?.nickname).join(', ')}</dd></div></dl>
      {allowResults && <details className="review-results card">
        <summary>입력한 상세 결과 확인</summary>
        <ul className="member-list plain">{draft.participants.map((person) => <li key={person.userId}>
          <strong>{findUser(db, person.userId)?.nickname}</strong><span>{[person.character, person.score === null ? '' : `${person.score}점`, person.won ? '승리' : '', person.goal ? '목표 달성' : '', person.solved ? '추리 성공' : '', person.culprit ? '범인 역할' : ''].filter(Boolean).join(' · ') || '미기록'}</span>
        </li>)}</ul>
        {draft.result.culprit && <p>범인 · {draft.result.culprit}</p>}
        {draft.result.notes && <p className="record-notes">{draft.result.notes}</p>}
      </details>}
      <p>저장하면 선택한 참여자의 개인 이력과 상세 열람 권한에 반영됩니다.</p>
      {overwriteDetails && <p className="form-error">입력한 내용으로 기존 상세 결과 전체를 덮어씁니다.</p>}
    </>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="button-row">{step > 0 && <button className="secondary-button" type="button" onClick={() => { setError(''); setStep(step - 1) }}>이전</button>}<button className="primary-button" type="submit">{step === 0 ? '결과 입력으로' : step === 1 ? '등록 내용 확인' : original ? '수정 저장' : '기록 저장'}</button></div>
  </form>
}
