// Compound receiver input: pick a type on the left, find or type the receiver on the right.
// Shared by the send flow (receivers) and the Audience Group editor (members).
import * as React from 'react'
import { Button, Input, Popover, PopoverAnchor, PopoverContent, Select, cn } from '@qijenchen/design-system'
import { Building2, ChevronDown, ChevronRight, CircleAlert, Globe, Mail, Phone, Plus, Search, Smartphone, Users } from 'lucide-react'
import {
  DOMAIN, EMAIL_RE, ORGS, PEOPLE, PMAP, fmtExtPhone, membersFor, phoneDigits, plural, type Group, type Person,
} from '../lib/data'
import { PAvatar, Two } from './ui'

export type RiType = 'person' | 'org' | 'group' | 'phone' | 'email' | 'mvpn'
export interface RiState { type: RiType; q: string; open: boolean; exp: string | null }
export type RiItem = { kind: 'person' | 'org' | 'group'; id: string } | { kind: 'ext'; value: string }
export function riKey(it: RiItem) { return it.kind === 'ext' ? 'e:' + it.value : (it.kind === 'person' ? 'p:' : it.kind === 'org' ? 'o:' : 'g:') + it.id }

const RI_TYPES: Record<RiType, { label: string; ph: string }> = {
  person: { label: 'Person', ph: 'Search by name, NT account or employee ID' },
  org: { label: 'Org', ph: 'Search by org code or name' },
  group: { label: 'Group', ph: 'Search your audience groups' },
  phone: { label: 'Phone', ph: 'Type any mobile number, like 0912-345-678 or +65 9123 4567' },
  email: { label: 'Email', ph: 'Type any email address, like name@vendor.com' },
  mvpn: { label: 'MVPN', ph: 'Type a 5-digit MVPN extension' },
}

interface Opt { item: RiItem; av?: Person; icon?: typeof Users; name: string; sub: string; meta: string; group?: Group; added?: boolean }

// options for the dropdown, plus a format error when the typed value isn't valid
function riOptions(ri: RiState, groups: Group[], excludeGroup: string | undefined, isAdded: (it: RiItem) => boolean) {
  const q = ri.q.trim(), low = q.toLowerCase(), out = { opts: [] as Opt[], err: '', tip: '' }
  const person = (p: Person, meta?: string): Opt => ({ item: { kind: 'person', id: p.id }, av: p, name: p.zh + ' ' + p.en, sub: p.title + ' · ' + p.org + ' · ' + p.emp, meta: meta || p.nt })
  const ext = (v: string): Opt => ({ item: { kind: 'ext', value: v }, icon: v.indexOf('@') < 0 ? Phone : Globe, name: v, sub: v.indexOf('@') < 0 ? 'External phone number · gets the SMS fallback only' : 'External email · gets Email only', meta: 'Add as external' })
  if (ri.type === 'person') {
    if (!q) out.tip = 'Type a name, NT account or employee ID.'
    else out.opts = PEOPLE.filter(p => [p.zh, p.en, p.nt, p.emp].some(v => v.toLowerCase().indexOf(low) >= 0)).slice(0, 8).map(p => person(p))
  } else if (ri.type === 'org') {
    out.opts = ORGS.filter(x => !q || x.code.toLowerCase().indexOf(low) >= 0 || x.name.toLowerCase().indexOf(low) >= 0).map(x => ({ item: { kind: 'org', id: x.code }, icon: Building2, name: x.code, sub: x.name, meta: plural(x.count, 'member') }))
  } else if (ri.type === 'group') {
    out.opts = groups.filter(g => g.id !== excludeGroup && (!q || (g.name + ' ' + g.desc).toLowerCase().indexOf(low) >= 0)).map(g => ({ item: { kind: 'group', id: g.id }, icon: Users, name: g.name, sub: g.desc, meta: plural(g.count, 'member'), group: g }))
  } else if (ri.type === 'mvpn') {
    const d = q.replace(/\D/g, '')
    if (!q) out.tip = 'MVPN extensions belong to employees, so this adds the person.'
    else if (!/^\d{1,5}$/.test(q)) out.err = 'MVPN is up to 5 digits.'
    else out.opts = PEOPLE.filter(p => p.mvpn && p.mvpn.indexOf(d) === 0).slice(0, 8).map(p => person(p, 'MVPN ' + p.mvpn))
    if (q && !out.err && !out.opts.length) out.err = 'No employee uses this MVPN.'
  } else if (ri.type === 'phone') {
    const d = phoneDigits(q)
    if (!q) out.tip = 'Use this for contractors and anyone without the app. Employees’ numbers are matched to the person.'
    else if (!d) out.err = 'Enter a mobile number with 8 to 15 digits, like 0912-345-678 or +65 9123 4567.'
    else {
      const p = PEOPLE.find(x => x.co === d || x.pp === d)
      out.opts.push(p ? person(p, p.co === d ? 'Company mobile' : 'Personal phone') : ext(fmtExtPhone(d)))
    }
  } else if (ri.type === 'email') {
    if (!q) out.tip = 'Use this for contractors. Company addresses are matched to the person.'
    else if (!EMAIL_RE.test(q)) out.err = 'Enter a full email address, like name@vendor.com.'
    else if (low.split('@')[1] === DOMAIN) {
      const p = PEOPLE.find(x => x.nt === low.split('@')[0])
      if (p) out.opts.push(person(p, 'Company email')); else out.err = 'No employee uses this ' + DOMAIN + ' address.'
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
      {ms.length > show.length ? <span className="text-caption text-fg-muted">and {plural(ms.length - show.length, 'more member', 'more members')}</span> : null}
    </div>
  )
}

export function RecvInput({ id, ri, setRi, groups, excludeGroup, bad, isAdded, onAdd, extra }: {
  id: string; ri: RiState; setRi: (r: RiState) => void; groups: Group[]; excludeGroup?: string; bad?: boolean
  isAdded: (it: RiItem) => boolean; onAdd: (it: RiItem) => void; extra?: React.ReactNode
}) {
  const T = RI_TYPES[ri.type], r = riOptions(ri, groups, excludeGroup, isAdded)
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
            aria-label="Receiver type"
            value={ri.type}
            options={(Object.keys(RI_TYPES) as RiType[]).map(k => ({ value: k, label: RI_TYPES[k].label }))}
            onChange={v => { set({ type: v as RiType, q: '', open: true, exp: null }); setTimeout(() => inputRef.current?.focus(), 60) }}
          />
        </div>
        <Popover open={open} onOpenChange={o => { if (!o) set({ open: false }) }}>
          <PopoverAnchor asChild>
            <div ref={anchor} className="min-w-60 flex-1">
              <Input
                ref={inputRef} id={id} startIcon={icon} autoComplete="off" placeholder={T.ph} aria-label={'Add by ' + T.label}
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
            {ri.type === 'group' && !ri.q.trim() ? <div className="px-3 pb-1 pt-2 text-caption font-medium text-fg-secondary">Audience groups you can use</div> : null}
            {r.opts.map(x => (
              <React.Fragment key={riKey(x.item)}>
                <div className="flex items-center gap-1">
                  <button type="button" disabled={x.added} onClick={() => add(x.item)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-neutral-hover focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent">
                    {x.av ? <PAvatar p={x.av} size={28} /> : x.icon ? <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-2 text-fg-secondary"><x.icon className="size-4" aria-hidden /></span> : null}
                    <Two a={x.name} b={x.sub} strong className="flex-1" />
                    <span className="shrink-0 text-caption text-fg-muted">{x.added ? 'Added' : x.meta}</span>
                  </button>
                  {x.group ? (
                    <Button variant="text" size="sm" iconOnly startIcon={ri.exp === x.group.id ? ChevronDown : ChevronRight}
                      aria-label={(ri.exp === x.group.id ? 'Hide' : 'Show') + ' members of ' + x.name} aria-expanded={ri.exp === x.group.id}
                      onClick={() => set({ exp: ri.exp === x.group!.id ? null : x.group!.id })} />
                  ) : null}
                </div>
                {x.group && ri.exp === x.group.id ? <GroupPeek g={x.group} /> : null}
              </React.Fragment>
            ))}
            {r.err ? <div className="flex items-center gap-1 px-3 py-3 text-body text-error-text"><CircleAlert className="size-4" aria-hidden />{r.err}</div> : null}
            {!r.opts.length && !r.err && ri.q.trim() ? <div className="px-3 py-3 text-body text-fg-secondary">Nothing matches “{ri.q.trim()}”.{ri.type === 'person' ? ' For contractors, switch the type to Phone or Email.' : ''}</div> : null}
          </PopoverContent>
        </Popover>
        {typed ? <Button variant="primary" startIcon={Plus} disabled={!first} onClick={() => first && add(first.item)}>Add</Button> : null}
        {extra}
      </div>
      <span className={cn('text-caption', showErr ? 'text-error-text' : 'text-fg-secondary')}>
        {showErr ? r.err : r.tip || (typed ? 'Checks the format before adding.' : 'Press Enter to add the first match.')}
      </span>
    </div>
  )
}
