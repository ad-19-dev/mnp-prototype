// Compound receiver input: pick a type on the left, find or type the receiver on the right.
// Shared by the send flow (receivers) and the Audience Group editor (members).
import * as React from 'react'
import { Button, Input, Popover, PopoverAnchor, PopoverContent, Select, cn } from '@qijenchen/design-system'
import { Building2, ChevronDown, ChevronRight, CircleAlert, Globe, Mail, Phone, Plus, Search, Smartphone, Users, BookUser } from 'lucide-react'
import {
  DOMAIN, EMAIL_RE, ORGS, PEOPLE, PMAP, fmtExtPhone, membersFor, phoneDigits, plural, type Group, type Person,
} from '../lib/data'
import { PAvatar, Two } from './ui'
import { L, P } from '../lib/i18n'

export type RiType = 'person' | 'org' | 'group' | 'phone' | 'email' | 'mvpn'
export interface RiState { type: RiType; q: string; open: boolean; exp: string | null }
export type RiItem = { kind: 'person' | 'org' | 'group'; id: string } | { kind: 'ext'; value: string }
export function riKey(it: RiItem) { return it.kind === 'ext' ? 'e:' + it.value : (it.kind === 'person' ? 'p:' : it.kind === 'org' ? 'o:' : 'g:') + it.id }

const RI_KEYS: RiType[] = ['person', 'org', 'group', 'phone', 'email', 'mvpn']
function riType(k: RiType) {
  return {
    person: { label: L('Person', '人員'), ph: L('Name, NT account or employee ID', '姓名、NT 帳號或工號') },
    org: { label: L('Org', '組織'), ph: L('Org code or name', '組織代碼或名稱') },
    group: { label: L('Group', '群組'), ph: L('Group name', '群組名稱') },
    phone: { label: L('Phone', '電話'), ph: L('Mobile number, e.g. 0912-345-678', '手機號碼，例如 0912-345-678') },
    email: { label: 'Email', ph: L('Email address, e.g. name@vendor.com', 'Email，例如 name@vendor.com') },
    mvpn: { label: 'MVPN', ph: L('5-digit MVPN', '5 碼 MVPN') },
  }[k]
}

interface Opt { item: RiItem; av?: Person; icon?: typeof Users; name: string; sub: string; meta: string; group?: Group; added?: boolean }

// options for the dropdown, plus a format error when the typed value isn't valid
function riOptions(ri: RiState, groups: Group[], excludeGroup: string | undefined, isAdded: (it: RiItem) => boolean) {
  const q = ri.q.trim(), low = q.toLowerCase(), out = { opts: [] as Opt[], err: '', tip: '' }
  const person = (p: Person, meta?: string): Opt => ({ item: { kind: 'person', id: p.id }, av: p, name: p.zh + ' ' + p.en, sub: [p.org, p.nt, p.emp].filter(Boolean).join(' · '), meta: meta || '' })
  const ext = (v: string): Opt => ({ item: { kind: 'ext', value: v }, icon: v.indexOf('@') < 0 ? Phone : Mail, name: v, sub: v.indexOf('@') < 0 ? L('External · SMS only', '外部 · 只收 SMS') : L('External · Email only', '外部 · 只收 Email'), meta: L('External', '外部') })
  if (ri.type === 'person') {
    if (!q) out.tip = ''
    else out.opts = PEOPLE.filter(p => [p.zh, p.en, p.nt, p.emp].some(v => v.toLowerCase().indexOf(low) >= 0)).slice(0, 8).map(p => person(p))
  } else if (ri.type === 'org') {
    out.opts = ORGS.filter(x => !q || x.code.toLowerCase().indexOf(low) >= 0 || x.no.toLowerCase().indexOf(low) >= 0 || x.name.toLowerCase().indexOf(low) >= 0).map(x => ({ item: { kind: 'org', id: x.code }, icon: Building2, name: x.code, sub: x.no, meta: P(x.count, 'member', '人') }))
  } else if (ri.type === 'group') {
    out.opts = groups.filter(g => g.id !== excludeGroup && (!q || (g.name + ' ' + g.desc).toLowerCase().indexOf(low) >= 0)).map(g => ({ item: { kind: 'group', id: g.id }, icon: Users, name: g.name, sub: g.desc, meta: P(g.count, 'member', '人'), group: g }))
  } else if (ri.type === 'mvpn') {
    const d = q.replace(/\D/g, '')
    if (!q) out.tip = ''
    else if (!/^\d{1,5}$/.test(q)) out.err = L('MVPN is up to 5 digits.', 'MVPN 最多 5 碼。')
    else out.opts = PEOPLE.filter(p => p.mvpn && p.mvpn.indexOf(d) === 0).slice(0, 8).map(p => person(p, 'MVPN ' + p.mvpn))
    if (q && !out.err && !out.opts.length) out.err = L('No one has this MVPN.', '沒有人用這個 MVPN。')
  } else if (ri.type === 'phone') {
    const d = phoneDigits(q)
    if (!q) out.tip = L('For contractors. Employee numbers add the employee.', '給外包人員用。輸入員工的號碼會加入該員工。')
    else if (!d) out.err = L('Enter 8–15 digits.', '請輸入 8–15 碼數字。')
    else {
      const p = PEOPLE.find(x => x.co === d || x.pp === d)
      out.opts.push(p ? person(p, p.co === d ? L('Company mobile', '公務手機') : L('Personal phone', '私人手機')) : ext(fmtExtPhone(d)))
    }
  } else if (ri.type === 'email') {
    if (!q) out.tip = L('For contractors. Company addresses add the employee.', '給外包人員用。輸入公司信箱會加入該員工。')
    else if (!EMAIL_RE.test(q)) out.err = L('Enter a full email address.', '請輸入完整的 Email。')
    else if (low.split('@')[1] === DOMAIN) {
      const p = PEOPLE.find(x => x.nt === low.split('@')[0])
      if (p) out.opts.push(person(p, L('Company email', '公司信箱'))); else out.err = L('No employee has this address.', '沒有員工用這個信箱。')
    } else out.opts.push(ext(low))
  }
  out.opts.forEach(x => { x.added = isAdded(x.item) })
  return out
}

function GroupPeek({ g }: { g: Group }) {
  const ms = membersFor(g).map(x => PMAP[x.pid]).filter(Boolean), show = ms.slice(0, 6)
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-neutral-1 px-3 py-2 pl-12">
      {show.map(p => <span key={p.id} className="inline-flex items-center gap-1 text-caption text-fg-secondary"><PAvatar p={p} size={16} />{p.extKind ? p.value : p.en}</span>)}
      {ms.length > show.length ? <span className="text-caption text-fg-muted">{L('+' + (ms.length - show.length) + ' more', '還有 ' + (ms.length - show.length) + ' 人')}</span> : null}
    </div>
  )
}

export function RecvInput({ id, ri, setRi, groups, excludeGroup, bad, isAdded, onAdd, extra }: {
  id: string; ri: RiState; setRi: (r: RiState) => void; groups: Group[]; excludeGroup?: string; bad?: boolean
  isAdded: (it: RiItem) => boolean; onAdd: (it: RiItem) => void; extra?: React.ReactNode
}) {
  const T = riType(ri.type), r = riOptions(ri, groups, excludeGroup, isAdded)
  const set = (p: Partial<RiState>) => setRi({ ...ri, ...p })
  const add = (it: RiItem) => { onAdd(it); set({ q: '', open: ri.type === 'group' || ri.type === 'org', exp: null }) }
  const first = r.opts.find(x => !x.added)
  const typed = ri.type === 'phone' || ri.type === 'email'
  const open = ri.open && (r.opts.length > 0 || !!ri.q.trim())
  const anchor = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const icon = ri.type === 'phone' ? Smartphone : ri.type === 'email' ? Mail : Search
  const showErr = !!(r.err && ri.q.trim() && !open)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-start gap-2">
        <div className="w-32 shrink-0">
          <Select
            aria-label={L('Audience type', '收件人類型')}
            value={ri.type}
            options={RI_KEYS.map(k => ({ value: k, label: riType(k).label }))}
            onChange={v => { set({ type: v as RiType, q: '', open: true, exp: null }); setTimeout(() => inputRef.current?.focus(), 60) }}
          />
        </div>
        <Popover open={open} onOpenChange={o => { if (!o) set({ open: false }) }}>
          <PopoverAnchor asChild>
            <div ref={anchor} className="min-w-60 flex-1">
              <Input
                ref={inputRef} id={id} startIcon={icon} autoComplete="off" placeholder={T.ph} aria-label={L('Add by ', '依') + T.label + L('', '新增')}
                aria-expanded={open} error={!!bad || showErr} value={ri.q}
                onChange={e => set({ q: e.target.value, open: true })}
                onFocus={() => { if (!ri.open) set({ open: true }) }}
                onClick={() => { if (!ri.open) set({ open: true }) }}
                onKeyDown={e => { if (e.key === 'Escape') set({ open: false }); if (e.key === 'Enter') { e.preventDefault(); if (first) add(first.item) } }}
              />
            </div>
          </PopoverAnchor>
          <PopoverContent
            align="start" sideOffset={4}
            className="max-h-96 w-[var(--radix-popover-trigger-width)] overflow-auto p-1"
            onOpenAutoFocus={e => e.preventDefault()}
            onInteractOutside={e => { if (anchor.current && anchor.current.contains(e.target as Node)) e.preventDefault() }}
          >
            {ri.type === 'group' && !ri.q.trim() ? <div className="px-3 pb-1 pt-2 text-caption font-medium text-fg-secondary">{L('Your groups', '你可用的群組')}</div> : null}
            {r.opts.map(x => (
              <React.Fragment key={riKey(x.item)}>
                <div className="flex items-center gap-1">
                  <button type="button" disabled={x.added} onClick={() => add(x.item)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-neutral-hover focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent">
                    {x.av ? <PAvatar p={x.av} size={28} /> : x.icon ? <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-2 text-fg-secondary"><x.icon className="size-4" aria-hidden /></span> : null}
                    <Two a={x.name} b={x.sub} strong className="flex-1" />
                    <span className="shrink-0 text-caption text-fg-muted">{x.added ? L('Added', '已加入') : x.meta}</span>
                  </button>
                </div>
              </React.Fragment>
            ))}
            {r.err ? <div className="flex items-center gap-1 px-3 py-3 text-body text-error-text"><CircleAlert className="size-4" aria-hidden />{r.err}</div> : null}
            {!r.opts.length && !r.err && ri.q.trim() ? <div className="px-3 py-3 text-body text-fg-secondary">{L('No match for “' + ri.q.trim() + '”.', '找不到「' + ri.q.trim() + '」。')}{ri.type === 'person' ? L(' Contractors? Switch to Phone or Email.', '外包人員請改選電話或 Email。') : ''}</div> : null}
          </PopoverContent>
        </Popover>
        {typed ? <Button variant="primary" startIcon={Plus} disabled={!first} onClick={() => first && add(first.item)}>{L('Add', '新增')}</Button> : null}
        {extra}
      </div>
      {showErr ? <span className="text-caption text-error-text">{r.err}</span> : null}
    </div>
  )
}
