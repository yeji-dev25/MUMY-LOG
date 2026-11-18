import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { ArrowLeft, CalendarDays, ChevronRight, Search, UsersRound, X } from 'lucide-react'
import { findGroup, findWork, formatDate } from './model'
import type { Database, Play } from './model'

export function Art({ name, className = '' }: { name: string; className?: string }) {
  return <span aria-hidden="true" className={`art art--${name} ${className}`} />
}

export function Brand() {
  return (
    <a className="brand" href="#/" aria-label="머미록 홈">
      <Art name="hat" />
      <span><strong>머미록</strong><small>MUMY LOG</small></span>
    </a>
  )
}

export function PageHeader({ title, children, onBack }: { title: string; children?: ReactNode; onBack?: () => void }) {
  return (
    <header className="page-header">
      {onBack && <button className="icon-button" type="button" aria-label="뒤로가기" onClick={onBack}><ArrowLeft size={21} /></button>}
      <h1 tabIndex={-1}>{title}</h1>
      {children}
    </header>
  )
}

export function SectionTitle({ title, href, children }: { title: string; href?: string; children?: ReactNode }) {
  return <div className="section-heading"><h2>{title}</h2>{href && <a href={href}>전체보기 <ChevronRight size={15} /></a>}{children}</div>
}

export function PlayRow({ db, play, inGroup = false }: { db: Database; play: Play; inGroup?: boolean }) {
  const work = findWork(db, play.workId)
  const group = findGroup(db, play.groupId)
  if (!work) return null
  const href = inGroup ? `#/group/${play.groupId}/records/${play.id}` : `#/records/${play.id}`

  return (
    <a className={`item-row card ${inGroup ? 'item-row--compact' : ''}`} href={href}>
      <Art name={work.id} />
      <div className="row-content">
        <h3>{work.title}</h3>
        <p><CalendarDays size={15} />{formatDate(play.date)}{inGroup && <span>· 참여 {play.participants.length}명</span>}</p>
        {!inGroup && <p><UsersRound size={15} />{group?.name ?? '모임'}</p>}
      </div>
      <ChevronRight className="row-arrow" size={19} />
    </a>
  )
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="search-box">
      <Search size={19} aria-hidden="true" />
      <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} />
      {value && <button className="icon-button" type="button" aria-label="검색어 지우기" onClick={() => onChange('')}><X size={16} /></button>}
    </div>
  )
}

export function Choices<T extends string>({ options, value, onChange, label, className = '' }: {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
  className?: string
}) {
  return (
    <div className={`choices ${className}`} role="group" aria-label={label}>
      {options.map((option) => <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}
    </div>
  )
}

export function Sheet({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const node = dialog.current
    node?.showModal()
    return () => node?.close()
  }, [])

  return (
    <dialog ref={dialog} className="sheet" aria-labelledby="sheet-title" onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="sheet-body">
        <header><h2 id="sheet-title">{title}</h2><button type="button" className="icon-button" aria-label="닫기" onClick={onClose}><X size={21} /></button></header>
        {children}
      </div>
    </dialog>
  )
}
