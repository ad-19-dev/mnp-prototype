// Batch import: how a tag is edited, and where a tag goes once it's fixed (2026-11-19). Live demos side by side,
// with the prototype's sample people and matching; nothing here changes the prototype.
//   Now: a click swaps the tag for a small DS Input (a field inside the field); red tags are always sorted first, so
//        a fixed one jumps to the gray ones at once.
//   A (suggested): a click turns the tag back into plain text in the same spot; the order is set only when entries
//        come in (red first then), and a fixed tag stays where it is, turning gray with a short green flash.
//   B: the order you typed is kept; the hint counts what's left to fix, and Next to fix jumps to the next red tag.
//   C: A, plus Enter on a fixed tag moves straight to the next red one (for long lists).
// Phone numbers get a region (TW / US / JP / CN) next to the data type; numbers starting with + keep their own code.
import * as React from 'react'
import { Button, Popover, PopoverAnchor, PopoverContent, SegmentedControl, SegmentedControlItem, Select, Tag, Tooltip, TooltipContent, TooltipTrigger, cn } from '@qijenchen/design-system'
import { Building2, Mail, Phone } from 'lucide-react'
import { Notes, Section, SpecTable } from '../parts'
import { ConfirmDialog, FormField, ListKindField, PAvatar, listKindExample, listKindName, pname } from '../../components/ui'
import { REGIONS, type Region } from '../../components/RecvInput'
import { DOMAIN, ORGS, PEOPLE, PMAP, fmtExtPhone, matchAs, splitTokens, type ListKind, type Person } from '../../lib/data'

type Mode = 'now' | 'A' | 'B' | 'C'
// pin: picked from the dropdown for a number several people share: a person's id, or '#' for the number itself
type Item = { id: number; v: string; pin?: string }
// label: the person's name (or the org, the number); val: the value as entered, formatted; who: shown on hover
type Ok = { key: string; label: string; val: string; who?: string; p?: string; icon?: typeof Mail; shared?: string[] }
type Show = 'value' | 'name'
type Hit = { id: number; v: string; ok?: Ok; why?: string }

// ---------- numbers: who they belong to ----------
// A person can have several company mobiles or MVPNs; one number can belong to several people (an on-call phone).
// The prototype's people have one of each, so this demo adds: a second company mobile for Jimmy Chen, and an ESH
// on-call mobile and MVPN shared by three people.
const EXTRA_CO: Record<string, string[]> = { p02: ['0918555210'] }
const SHARED_CO: Record<string, string[]> = { '0919000119': ['p13', 'p19', 'p07'] }
const EXTRA_MVPN: Record<string, string[]> = { p02: ['8860218'] }
const SHARED_MVPN: Record<string, string[]> = { '8861119': ['p13', 'p19', 'p07'] }
type Num = { n: string; what: 'co' | 'pp' | 'mvpn'; owners: string[] }
const STAFF = PEOPLE.filter(p => !p.extKind && !p.gen)
function dir(kind: 'phone' | 'mvpn'): Num[] {
  const m: Record<string, Num> = {}
  const add = (n: string, what: Num['what'], pid: string) => { if (!n) return; (m[n] = m[n] || { n, what, owners: [] }).owners.push(pid) }
  STAFF.forEach(p => {
    if (kind === 'phone') { add(p.co, 'co', p.id); add(p.pp, 'pp', p.id); (EXTRA_CO[p.id] || []).forEach(n => add(n, 'co', p.id)) }
    else { add(p.mvpn, 'mvpn', p.id); (EXTRA_MVPN[p.id] || []).forEach(n => add(n, 'mvpn', p.id)) }
  })
  Object.entries(kind === 'phone' ? SHARED_CO : SHARED_MVPN).forEach(([n, ps]) => ps.forEach(pid => add(n, kind === 'phone' ? 'co' : 'mvpn', pid)))
  return Object.values(m)
}
const PHONES = dir('phone'), MVPNS = dir('mvpn')
const showNum = (x: Num) => (x.what === 'mvpn' ? 'MVPN ' + x.n : fmtExtPhone(x.n))
const whatName = (x: Num) => (x.what === 'co' ? 'Company mobile' : x.what === 'pp' ? 'Personal phone' : 'MVPN')
// one owner: that person, with SMS going to this number. Several: the number itself (one SMS to the shared
// phone), unless a person was picked from the dropdown.
function byNumber(x: Num, pin?: string): Ok {
  const one = pin && pin !== '#' && x.owners.indexOf(pin) >= 0 ? pin : x.owners.length === 1 ? x.owners[0] : null
  const val = x.what === 'mvpn' ? x.n : fmtExtPhone(x.n)
  if (one) { const p = PMAP[one]; return { key: 'p:' + one, label: pname(p) + ' · ' + showNum(x), val, who: pname(p) + ' · ' + p.org + ' · ' + whatName(x) + (x.owners.length > 1 ? ' (shared)' : ''), p: one } }
  return { key: 'n:' + x.n, label: showNum(x) + ' · Shared by ' + x.owners.length, val, who: 'Shared by ' + x.owners.map(id => pname(PMAP[id])).join(', ') + '. One SMS goes to this number.', icon: Phone, shared: x.owners }
}

// phone numbers: by the chosen region, or by their own +code
function matchPhone(v: string, region: Region, pin?: string): Ok | string {
  const t = v.trim(), d = t.replace(/\D/g, '')
  const byCode = t.startsWith('+') ? REGIONS.find(r => d.startsWith(r.code.slice(1))) : undefined
  if (t.startsWith('+') && !byCode) return 'Only TW, US, JP and CN numbers'
  const R = byCode || REGIONS.find(r => r.v === region)!, n = R.norm(byCode ? d.slice(R.code.length - 1) : d)
  if (!n) return R.err.replace(/\.$/, '')
  if (R.v === 'TW') { const x = PHONES.find(y => y.n === n); if (x) return byNumber(x, pin) }
  const shown = R.v === 'TW' ? fmtExtPhone(n) : n
  return { key: 'e:' + shown, label: shown, val: shown, who: 'Outside number', icon: Phone }
}
function look(kind: ListKind, region: Region, v: string, pin?: string): Ok | string {
  if (kind === 'phone') return matchPhone(v, region, pin)
  if (kind === 'mvpn') { const d = v.trim(); const x = MVPNS.find(y => y.n === d); return x ? byNumber(x, pin) : /^\d+$/.test(d) ? 'No one uses this MVPN' : 'Not an MVPN' }
  const mm = matchAs(v, kind, { allowExt: true })
  if (mm.kind === 'one') return { key: 'p:' + mm.p.id, label: pname(mm.p), val: v.trim(), who: pname(mm.p) + ' · ' + mm.p.org, p: mm.p.id }
  if (mm.kind === 'org') return { key: 'o:' + mm.org.code, label: mm.org.code, val: mm.org.code, who: mm.org.name + ' · ' + mm.org.count + ' people', icon: Building2 }
  if (mm.kind === 'ext') return { key: 'e:' + mm.email, label: mm.email, val: mm.email, who: 'Outside email', icon: Mail }
  return mm.kind === 'miss' ? mm.why : 'More than one match'
}

// suggestions while typing (2026-11-19): the people (or orgs) the typed text could be, for the data types that point
// at someone. Picking one adds the value of that data type (an NT account, an employee ID…), not the name.
//   NT accounts: NT account starts with it, or the name has it · Employee IDs: starts with it (2+ digits)
//   Emails: company addresses only (the part before @) · Org IDs: orgs (code or name)
//   Phone numbers (TW, 4+ digits) / MVPN (2+ digits): every number that has it; a number with one owner is that
//   person; a shared one is offered as the number itself first, then each person on it
type Sug = { value: string; pin?: string; p?: Person; org?: typeof ORGS[number]; shared?: string[]; sub: string }
function suggest(kind: ListKind, region: Region, q: string, taken: (v: string, pin?: string) => boolean): Sug[] {
  const t = q.trim(), low = t.toLowerCase(), d = t.replace(/\D/g, '')
  const ppl = STAFF
  let out: Sug[] = []
  const nums = (list: Num[], hit: (x: Num) => boolean): Sug[] => list.filter(hit).flatMap((x): Sug[] => x.owners.length === 1
    ? [{ value: x.n, pin: x.owners[0], p: PMAP[x.owners[0]], sub: showNum(x) + ' · ' + whatName(x) }]
    : ([{ value: x.n, pin: '#', shared: x.owners, sub: 'Shared by ' + x.owners.map(id => PMAP[id].en).join(', ') }] as Sug[])
      .concat(x.owners.map(id => ({ value: x.n, pin: id, p: PMAP[id], sub: showNum(x) + ' · only this person' })) as Sug[]))
  if (kind === 'nt' && t.length >= 2) out = ppl.filter(p => p.nt.startsWith(low) || (p.en + ' ' + p.zh).toLowerCase().includes(low)).map(p => ({ value: p.nt, p, sub: p.nt + ' · ' + p.org }))
  else if (kind === 'emp' && d.length >= 2 && d === t) out = ppl.filter(p => p.emp.startsWith(d)).map(p => ({ value: p.emp, p, sub: p.emp + ' · ' + p.org }))
  else if (kind === 'mvpn' && d.length >= 2 && d === t) out = nums(MVPNS, x => x.n.startsWith(d))
  else if (kind === 'email' && t.length >= 2) { const [a, b] = low.split('@'); if (b === undefined || DOMAIN.startsWith(b)) out = ppl.filter(p => p.nt.startsWith(a)).map(p => ({ value: p.nt + '@' + DOMAIN, p, sub: p.nt + '@' + DOMAIN })) }
  else if (kind === 'phone' && region === 'TW' && !t.startsWith('+') && d.length >= 4) out = nums(PHONES, x => x.n.includes(d.replace(/^886/, '0')))
  else if (kind === 'org' && t.length >= 1) out = ORGS.filter(o => o.code.toLowerCase().startsWith(low) || o.name.toLowerCase().includes(low)).map(o => ({ value: o.code, org: o, sub: o.name + ' · ' + o.count + ' people' }))
  return out.filter(x => !taken(x.value, x.pin)).slice(0, 8)
}

// the dropdown under the field being typed in (the list's input, or a tag being edited)
function SugList({ sugs, hi, setHi, onPick }: { sugs: Sug[]; hi: number; setHi: (i: number) => void; onPick: (x: Sug) => void }) {
  return (
    <div role="listbox" aria-label="Matches">
      {sugs.map((x, i) => (
        <button key={x.value + (x.pin || '')} type="button" role="option" aria-selected={i === hi} onMouseDown={e => e.preventDefault()} onMouseEnter={() => setHi(i)} onClick={() => onPick(x)}
          className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left', i === hi && 'bg-neutral-hover', x.p && x.pin && x.pin !== '#' && sugs.some(y => y.pin === '#' && y.value === x.value) && 'pl-6')}>
          {x.p ? <PAvatar p={x.p} size={24} /> : <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">{x.org ? <Building2 className="size-3.5 text-fg-secondary" aria-hidden /> : <Phone className="size-3.5 text-fg-secondary" aria-hidden />}</span>}
          <span className="flex min-w-0 flex-col"><span className="truncate text-body">{x.p ? pname(x.p) : x.org ? x.org.code : (x.sub.startsWith('Shared') && MVPNS.some(m => m.n === x.value) ? 'MVPN ' + x.value : fmtExtPhone(x.value)) + ' (shared)'}</span><span className="truncate text-caption text-fg-secondary">{x.sub}</span></span>
        </button>
      ))}
    </div>
  )
}

const SAMPLE: Record<string, string> = {
  // ytchang and thliu are left out, so fixing a red tag to them gives a new person (not a repeat)
  nt: 'gywu, cmchen, kylin, chlinb, ycchenz, ycchenq, a19999, ycchenm, bhhuang, celee, sywangd, thtsai, gywuu, psyang, chhsu, shcheng, ythsieh, hykuo, prhung, cm.chen, yttseng, chchiu, ycliao, shlai, cnchou, cmchen',
  // 0918555210: Jimmy Chen's second company mobile · 0919000119: the ESH on-call mobile, shared by three people
  phone: '0918226588, 0912337415, 0918555210, 0919000119, 0987654321, 091234, +1 415 555 0123, +81 90 1234 5678, +86 138 0013 8000, +44 20 7946 0958',
  mvpn: '8861588, 8860217, 8860218, 8861119, 8899999',
}

function Demo({ mode, show }: { mode: Mode; show: Show }) {
  const [kind, setKind] = React.useState<ListKind | null>('nt'), [region, setRegion] = React.useState<Region>('TW')
  const [items, setItems] = React.useState<Item[]>([]), [draft, setDraft] = React.useState('')
  const [seq, setSeq] = React.useState<number[]>([])        // A, C: the order, set when entries come in
  const [edit, setEdit] = React.useState<{ id: number; v: string } | null>(null)
  const [hi, setHi] = React.useState(0), [sugOpen, setSugOpen] = React.useState(false)
  const [pend, setPend] = React.useState<ListKind | null>(null)
  const [flash, setFlash] = React.useState<number | null>(null)
  const nextId = React.useRef(1), inputRef = React.useRef<HTMLInputElement>(null), boxRef = React.useRef<HTMLDivElement>(null)

  // look every entry up; repeats drop out (they aren't shown)
  const hitsOf = (list: Item[]): Hit[] => {
    if (!kind) return []
    const seen: Record<string, boolean> = {}, out: Hit[] = []
    list.forEach(it => {
      const r = look(kind, region, it.v, it.pin)
      if (typeof r === 'string') { const k = 'x:' + it.v.toLowerCase(); if (seen[k]) return; seen[k] = true; out.push({ id: it.id, v: it.v, why: r }) }
      else { if (seen[r.key]) return; seen[r.key] = true; out.push({ id: it.id, v: it.v, ok: r }) }
    })
    return out
  }
  const hits = hitsOf(items), byId = Object.fromEntries(hits.map(h => [h.id, h]))
  const redFirst = (hs: Hit[]) => hs.filter(h => h.why).concat(hs.filter(h => h.ok))
  // what is shown, in which order
  const shown: Hit[] = mode === 'now' ? redFirst(hits)
    : mode === 'B' ? hits
    : seq.map(id => byId[id]).filter(Boolean).concat(hits.filter(h => seq.indexOf(h.id) < 0))
  const bad = hits.filter(h => h.why), good = hits.filter(h => h.ok)

  // entries come in: A and C sort red first now (and only now)
  const take = (t: string, pin?: string) => {
    const l = splitTokens(t).map(x => x.trim()).filter(Boolean)
    setDraft('')
    if (!l.length) return
    const add = l.map(v => ({ id: nextId.current++, v, pin })), all = items.concat(add)
    setItems(all)
    if (mode === 'A' || mode === 'C') setSeq(redFirst(hitsOf(all)).map(h => h.id))
  }
  const drop = (id: number) => { setItems(l => l.filter(x => x.id !== id)); setSeq(s => s.filter(x => x !== id)) }
  const openEdit = (h: Hit) => setEdit({ id: h.id, v: h.v })
  const nextRed = (after: number | null, list: Hit[]) => {
    const reds = list.filter(h => h.why && h.id !== after), i = after == null ? -1 : list.findIndex(h => h.id === after)
    return reds.find(h => list.indexOf(h) > i) || reds[0]
  }
  const saveEdit = (goNext?: boolean, over?: { v: string; pin?: string }) => {
    if (!edit) return
    const was = byId[edit.id], v = (over ? over.v : edit.v).trim()
    if (!v) { drop(edit.id); setEdit(null); return }
    // typing again clears an earlier pick; picking from the dropdown sets it
    const nextItems = items.map(x => (x.id === edit.id ? { ...x, v, pin: over ? over.pin : (v === x.v ? x.pin : undefined) } : x))
    setItems(nextItems)
    const nowHits = hitsOf(nextItems), now = nowHits.find(h => h.id === edit.id)
    const blink = (id: number) => { setFlash(id); setTimeout(() => setFlash(f => (f === id ? null : f)), 900) }
    if (was && was.why && now && now.ok) blink(edit.id)
    // the edit made it a repeat of a tag already in the list (e.g. another number of the same person): drop it and
    // flash the one that's there, so it doesn't just vanish
    if (!now && kind) {
      const r = look(kind, region, v, over ? over.pin : undefined), same = typeof r !== 'string' && nowHits.find(h => h.ok && h.ok.key === r.key)
      if (same) {
        setItems(nextItems.filter(x => x.id !== edit.id)); setSeq(q => q.filter(x => x !== edit.id)); setEdit(null); blink(same.id)
        setTimeout(() => { boxRef.current?.querySelector<HTMLElement>('[data-tagid="' + same.id + '"]')?.scrollIntoView({ block: 'nearest' }); inputRef.current?.focus({ preventScroll: true }) }, 0)
        return
      }
    }
    setEdit(null)
    if (goNext && mode === 'C') {
      const list = seq.map(id => hitsOf(nextItems).find(h => h.id === id)).filter(Boolean) as Hit[]
      const n = nextRed(edit.id, list)
      if (n) { setTimeout(() => setEdit({ id: n.id, v: n.v }), 0); return }
    }
    // Now: back to the input at the end (the box scrolls to the bottom); A/B/C: stay on the tag just edited
    const id = edit.id
    setTimeout(() => {
      const el = mode === 'now' ? null : boxRef.current?.querySelector<HTMLElement>('[data-tagid="' + id + '"]')
      // back to the input at the end without scrolling, and keep the edited tag in view (no focus ring on it)
      if (el) { inputRef.current?.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest' }) } else inputRef.current?.focus()
    }, 0)
  }
  const goNextToFix = () => {
    const n = nextRed(null, shown); if (!n) return
    setEdit({ id: n.id, v: n.v })
    setTimeout(() => { const el = boxRef.current?.querySelector('[data-editing]'); el && el.scrollIntoView({ block: 'nearest' }) }, 0)
  }
  React.useEffect(() => { setItems([]); setSeq([]); setEdit(null) }, [kind])

  const editable = (h: Hit) => ({
    role: 'button', tabIndex: 0, className: 'cursor-text', 'data-tagid': h.id,
    'aria-label': 'Edit ' + (h.ok ? (show === 'name' ? h.ok.label : h.ok.val) : h.v) + (h.why ? ': ' + h.why : ''),
    onClick: (e: React.MouseEvent) => { if (!(e.target as HTMLElement).closest('button')) openEdit(h) },
    onKeyDown: (e: React.KeyboardEvent) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openEdit(h) } },
  })
  const tag = (h: Hit) => {
    const fl = flash === h.id
    if (h.ok) {
      // value: what was entered (formatted), no avatar or icon; name: the person's name with their avatar
      const p = h.ok.p ? PMAP[h.ok.p] : null, byName = show === 'name', text = byName ? h.ok.label : h.ok.val
      const t = <Tag key={h.id} unbounded avatar={byName && p ? <PAvatar p={p} size={16} /> : undefined} icon={byName && !p ? h.ok.icon : undefined} {...editable(h)}
        className={cn('cursor-text transition-shadow duration-300', fl && 'ring-1 ring-[var(--color-green-6,#22a06b)]')} onRemove={() => drop(h.id)} removeAriaLabel={text}>{text}</Tag>
      // hover: who it is (value), or who shares the number (both)
      const tip = byName ? (h.ok.shared ? h.ok.who : null) : h.ok.who
      if (!tip) return t
      return (
        <Tooltip key={h.id}>
          <TooltipTrigger asChild>{t}</TooltipTrigger>
          <TooltipContent side="bottom" align="start">{tip}</TooltipContent>
        </Tooltip>
      )
    }
    return (
      <Tooltip key={h.id}>
        <TooltipTrigger asChild><Tag color="red" {...editable(h)} onRemove={() => drop(h.id)} removeAriaLabel={h.v}>{h.v}</Tag></TooltipTrigger>
        <TooltipContent side="bottom" align="start">{h.why}</TooltipContent>
      </Tooltip>
    )
  }
  // editing: Now = a small DS-looking input; A/B/C = the entry as plain text with a caret, in the same spot
  // editing: Now = a small DS-looking input; A/B/C = the entry as plain text with a caret, in the same spot. Both show
  // the matches under them; ↑↓ and Enter pick one (2026-11-19)
  const editor = (h: Hit) => {
    const keys = (e: React.KeyboardEvent) => {
      const open = esugs.length > 0
      if (open && e.key === 'ArrowDown') { e.preventDefault(); setEhi(i => Math.min(i + 1, esugs.length - 1)) }
      else if (open && e.key === 'ArrowUp') { e.preventDefault(); setEhi(i => Math.max(i - 1, 0)) }
      else if (e.key === 'Escape') { e.stopPropagation(); setEdit(null) }
      else if (e.key === 'Enter' || (e.key === 'Tab' && mode === 'C')) {
        e.preventDefault()
        if (open && e.key === 'Enter') { const x = esugs[Math.min(ehi, esugs.length - 1)]; saveEdit(mode === 'C', { v: x.value, pin: x.pin }) }
        else saveEdit(mode === 'C')
      }
    }
    const input = mode === 'now'
      ? <input data-editing autoFocus aria-label={'Edit ' + h.v} value={edit!.v} onChange={e => { setEhi(0); setEdit({ id: h.id, v: e.target.value }) }}
          onBlur={() => saveEdit()} onKeyDown={keys} className="h-8 w-48 rounded-md border border-primary bg-surface px-2 text-body outline-none" />
      : <input data-editing autoFocus aria-label={'Edit ' + h.v} value={edit!.v} size={Math.max(edit!.v.length, 3)} onChange={e => { setEhi(0); setEdit({ id: h.id, v: e.target.value }) }}
          onBlur={() => saveEdit()} onKeyDown={keys}
          className="h-6 min-w-[2ch] bg-transparent px-0.5 text-body text-foreground outline-none" style={{ fieldSizing: 'content' } as React.CSSProperties} />
    return (
      <Popover key={h.id} open={esugs.length > 0}>
        <PopoverAnchor asChild><span className="inline-flex">{input}</span></PopoverAnchor>
        <PopoverContent align="start" sideOffset={6} className="w-96 p-1" onOpenAutoFocus={e => e.preventDefault()}>
          <SugList sugs={esugs} hi={Math.min(ehi, esugs.length - 1)} setHi={setEhi} onPick={x => saveEdit(mode === 'C', { v: x.value, pin: x.pin })} />
        </PopoverContent>
      </Popover>
    )
  }

  // people (or orgs) the typed text could be; already in the list are left out
  // already in the list (the tag being edited doesn't count): a person by any of their values, or the same number
  const keys = (skip?: number) => hits.filter(h => h.ok && h.id !== skip).map(h => h.ok!.key)
  const takenBy = (skip?: number) => { const ks = keys(skip); return (v: string, pin?: string) => {
    const r = kind ? look(kind, region, v, pin) : ''; if (typeof r !== 'string') return ks.indexOf(r.key) >= 0
    const p = STAFF.find(x => x.nt === v || x.emp === v || x.nt + '@' + DOMAIN === v); return !!p && ks.indexOf('p:' + p.id) >= 0 } }
  const sugs = kind && draft.trim() ? suggest(kind, region, draft, takenBy()) : []
  const showSug = sugOpen && !edit && sugs.length > 0
  const pick = (x: Sug) => { take(x.value, x.pin); setHi(0); setTimeout(() => inputRef.current?.focus(), 0) }
  // editing a tag: the same dropdown under it
  const [ehi, setEhi] = React.useState(0)
  const esugs = kind && edit && edit.v.trim() ? suggest(kind, region, edit.v, takenBy(edit.id)) : []
  const n = good.length
  return (
    <div className="flex flex-col gap-[var(--layout-space-tight)] rounded-lg border border-divider bg-surface p-[var(--layout-space-loose)]">
      <div className="flex flex-wrap items-end gap-2">
        {/* changing the data type clears the list (the entries can't be looked up as another type): asked first when the
            list isn't empty (2026-11-19) */}
        <div className="w-56"><ListKindField id={'k-' + mode} value={kind} onChange={k => { if (k === kind) return; if (items.length) setPend(k); else setKind(k) }} /></div>
        {kind === 'phone' ? <div className="w-36"><FormField id={'r-' + mode} label="Region"><Select aria-label="Region" value={region} onChange={v => setRegion(v as Region)} options={REGIONS.map(x => ({ value: x.v, label: x.v + ' ' + x.code }))} /></FormField></div> : null}
      </div>
      <FormField id={'t-' + mode} label="List" hint={
        !hits.length ? 'Separate with commas or new lines.'
          : mode === 'B' ? <span className="flex flex-wrap items-center gap-x-2">{n} valid audiences{bad.length ? <> · <span className="text-error-text">{bad.length} to fix</span> <Button variant="link" size="sm" className="!h-auto !min-w-0 !p-0" onClick={goNextToFix}>Next to fix</Button></> : null}. Click a tag to edit it.</span>
          : mode === 'C' ? n + ' valid audiences. Click a tag to edit it; Enter goes on to the next red one.'
          : n + ' valid audiences. Click a tag to edit it.'}>
        <div ref={boxRef} className={cn('flex h-56 w-full flex-wrap content-start items-center gap-1 overflow-y-auto rounded-md border px-[var(--field-px)] py-[var(--field-control-py-md)]',
          kind ? 'cursor-text border-border bg-surface hover:border-border-hover focus-within:!border-primary' : 'cursor-not-allowed border-transparent bg-disabled')}
          onClick={e => { if (e.target === e.currentTarget) inputRef.current?.focus() }}>
          {shown.map(h => (edit && edit.id === h.id ? editor(h) : tag(h)))}
          <Popover open={showSug} onOpenChange={o => { if (!o) setSugOpen(false) }}>
            <PopoverAnchor asChild>
              <span className="flex min-w-[160px] flex-1">
                <input ref={inputRef} id={'t-' + mode} disabled={!kind} className="w-full bg-transparent py-0.5 text-body outline-none placeholder:text-fg-muted" autoComplete="off"
                  role="combobox" aria-expanded={showSug} aria-autocomplete="list"
                  placeholder={!kind ? 'Choose a data type first' : items.length ? '' : 'e.g. ' + (kind === 'phone' ? REGIONS.find(r => r.v === region)!.ph : listKindExample(kind))}
                  value={draft} onChange={e => { setHi(0); setSugOpen(true); if (/[\n,，;；]/.test(e.target.value)) take(e.target.value); else setDraft(e.target.value) }}
                  onKeyDown={e => {
                    if (showSug && e.key === 'ArrowDown') { e.preventDefault(); setHi(i => Math.min(i + 1, sugs.length - 1)) }
                    else if (showSug && e.key === 'ArrowUp') { e.preventDefault(); setHi(i => Math.max(i - 1, 0)) }
                    else if (e.key === 'Escape' && showSug) { e.stopPropagation(); setSugOpen(false) }
                    else if (e.key === 'Enter') { e.preventDefault(); if (showSug) pick(sugs[Math.min(hi, sugs.length - 1)]); else take(draft) }
                    else if (e.key === 'Backspace' && !draft && shown.length) drop(shown[shown.length - 1].id)
                  }}
                  onBlur={() => { take(draft); setSugOpen(false) }} onPaste={e => { e.preventDefault(); take(draft + e.clipboardData.getData('text')) }} />
              </span>
            </PopoverAnchor>
            {/* the people (or orgs) it could be: avatar, name, the matched value; Enter or a click adds it */}
            <PopoverContent align="start" sideOffset={6} className="w-96 p-1" onOpenAutoFocus={e => e.preventDefault()}>
              <SugList sugs={sugs} hi={Math.min(hi, sugs.length - 1)} setHi={setHi} onPick={pick} />
            </PopoverContent>
          </Popover>
        </div>
      </FormField>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" disabled={!kind || !SAMPLE[kind]} onClick={() => take(SAMPLE[kind!])}>Paste a sample list</Button>
        <Button variant="tertiary" size="sm" disabled={!items.length} onClick={() => { setItems([]); setSeq([]); setEdit(null) }}>Clear</Button>
        <span className="text-caption text-fg-secondary">Try: fix a red tag (a19999 → ytchang, gywuu → thliu), then look for it.</span>
      </div>
      <ConfirmDialog onClose={() => setPend(null)} cf={pend ? {
        title: 'Change the data type?',
        text: 'Changing to ' + listKindName(pend) + ' clears the list. The ' + hits.length + (hits.length === 1 ? ' entry' : ' entries') + ' you added can’t be looked up as another type.',
        cancel: 'Cancel', ok: 'Clear and change', danger: true, run: () => { setKind(pend); setPend(null) },
      } : null} />
    </div>
  )
}

export default function ImportTags() {
  // what a found tag shows (2026-11-19): the value as entered (suggested), or the person's name
  const [show, setShow] = React.useState<Show>('value')
  const col = (mode: Mode, title: string, badge: React.ReactNode, desc: string) => (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-2"><b className="text-body">{title}</b>{badge}</span>
      <span className="text-caption text-fg-secondary">{desc}</span>
      <Demo mode={mode} show={show} />
    </div>
  )
  return (
    <>
      <div className="spec-top">
        <div className="spec-wrap flex flex-col gap-1 pt-4 pb-3">
          <span className="spec-eyebrow">MNP · Batch import · 標籤的修改與位置</span>
          <h1 className="spec-h1">批次匯入：點標籤怎麼改、改好之後去哪</h1>
          <span className="text-caption text-fg-secondary">2026/11/19 · 四個版本都可以直接操作（按 Paste a sample list 貼上 26 筆，其中 3 筆找不到；把 a19999 改成 ytchang、gywuu 改成 thliu 試試），用的是原型的範例資料與比對規則；不影響原型。</span>
        </div>
      </div>
      <main className="spec-wrap spec-main">
        <Section eyebrow="Problem" title="現在的兩個問題">
          <SpecTable head={['問題', '為什麼']} nowrap={[0]} rows={[
            ['修改時欄位裡又有一個欄位', '點標籤會換成一個有外框的輸入框（DS Input sm），名單欄位本身也是輸入框，看起來像兩層。它也比標籤高，那一行會跳一下。'],
            ['修好的標籤會跳走', '「紅色永遠排最前面」是每次畫面更新都重新排序，所以紅色一改成有效，馬上移到灰色那一區的最後；名單長時，使用者就找不到剛剛改的那一筆，也不確定有沒有改成功。'],
          ]} />
          <Notes items={[
            { title: '紅色排最前面還是有用', body: '貼上幾百筆時，要處理的幾筆一打開就看得到（這是加大對話框時的需求）。要改的不是「排最前面」本身，而是「什麼時候排」。' },
            { title: '常見做法', body: 'Gmail、Outlook 的收件人欄：點一下或雙擊收件人，標籤變回純文字，游標在字裡，改完按 Enter 再變回標籤，位置不變。' },
          ]} cols />
        </Section>

        <Section eyebrow="Try" title="直接試試" lead="每一個都先按 Paste a sample list，再把一個紅色標籤改好，看看它去哪裡。">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-body">找到的標籤顯示</span>
            <SegmentedControl size="sm" value={show} onValueChange={v => v && setShow(v as Show)} aria-label="Tag shows">
              <SegmentedControlItem value="value">輸入的值（建議）</SegmentedControlItem>
              <SegmentedControlItem value="name">姓名</SegmentedControlItem>
            </SegmentedControl>
            <span className="text-caption text-fg-secondary">四個示範一起切換</span>
          </div>
          <div className="grid gap-[var(--layout-space-loose)] xl:grid-cols-2">
            {col('now', '現在', <Tag size="sm" color="neutral">原型目前的做法</Tag>, '點標籤換成有外框的輸入框；紅色永遠排最前面，修好就跳到灰色區。')}
            {col('A', 'A：變回文字、原地變色', <Tag size="sm" color="green">建議</Tag>, '點標籤變回純文字（游標在字裡）；只有加入名單時把紅色排到前面，修好的標籤留在原地變灰色，閃一下綠框。')}
            {col('B', 'B：照輸入順序，用 Next 找下一筆', <Tag size="sm" color="neutral">替代</Tag>, '不排序；說明文字寫「n to fix」與 Next to fix，按了直接打開下一個紅色標籤。')}
            {col('C', 'C：A 加上 Enter 接著改下一筆', <Tag size="sm" color="neutral">A 的加強</Tag>, '和 A 相同；改好按 Enter 會直接打開下一個紅色標籤，不用再找。')}
          </div>
        </Section>

        <Section eyebrow="Suggest" title="輸入時比對到人：跳出選單" lead="四個示範都有：在名單欄位打字時，以及修改標籤時（2026-11-19 加），比對得到的人（或組織）出現在游標下方的選單，最多 6 筆；↑↓ 選、Enter 或點一下加入，Esc 關閉。加入的是這個資料類型的值（例如 NT 帳號），標籤上顯示姓名。已經在名單裡的人不再出現。">
          <SpecTable head={['資料類型', '比對得到人嗎', '怎麼比對', '從第幾個字開始']} nowrap={[0, 3]} rows={[
            ['NT accounts', '可以', 'NT 帳號開頭相符，或英文名、中文名含有輸入的字（例：打 chen 會出現 cmchen、ycchenz…）', '2 個字'],
            ['Employee IDs', '可以', '工號開頭相符（只有數字時）', '2 碼'],
            ['Emails', '只有公司信箱', '@ 前面是 NT 帳號，開頭相符；外部信箱不會對到任何人，不出現選單', '2 個字'],
            ['Phone numbers', '只有台灣員工的手機', '號碼含有輸入的數字；每個號碼一項（一個人有兩支公務手機就是兩項）；多人共用的號碼見下一節。地區不是 TW、或以 + 開頭的外部號碼，不出現選單', '4 碼'],
            ['MVPN', '可以', 'MVPN 開頭相符；同 Phone numbers，一個 MVPN 一項，多人共用的見下一節', '2 碼'],
            ['Org IDs', '對到的是組織', '組織代號開頭相符，或名稱含有輸入的字；選單顯示組織圖示、代號、名稱與人數', '1 個字'],
          ]} />
          <Notes items={[
            { title: '不選也可以', body: '選單只是提示：不選、直接按 Enter 或逗號，就照打的字加入並比對（和現在一樣）。貼上整份名單時不出現選單。' },
            { title: '試試', body: '在任一個示範打 chen、12、ch 或 0918（Phone numbers）。' },
            { title: '正式版', body: '實際上公司超過 10 萬人，選單要向伺服器查詢（輸入停一下才查，例如 300ms），查詢中顯示載入中。' },
          ]} cols />
        </Section>

        <Section eyebrow="Numbers" title="Phone numbers 與 MVPN：一人多號、一號多人" lead="名單是用號碼給的，代表使用者要寄到「這一支」。所以用號碼加入的人，SMS 寄到這個號碼，不走「選人時系統隨機挑一支公務手機」的舊機制；共用號碼（值班機）預設當成一支號碼，只寄一封 SMS 給它。">
          <SpecTable head={['情況', '例子（示範資料）', '變成什麼', '標籤']} nowrap={[0]} rows={[
            ['號碼只屬於一個人', '0918226588（Grace Wu 的公務手機）', '加入這個人；SMS 寄到這個號碼', '灰色：大頭照、姓名 · 0918-226-588'],
            ['一個人有多個號碼', '0918555210（Jimmy Chen 的第二支公務手機）；MVPN 8860218', '同上：用的是哪支，就寄哪支（不隨機）', '灰色：姓名 · 那支號碼'],
            ['一個號碼屬於多個人（值班機）', '0919000119、MVPN 8861119（ESH 值班，三個人）', '預設加入「這支號碼」：只寄一封 SMS 到這支，不加入這三個人（不會收到 App 推播）', '灰色：電話圖示、0919-000-119 · Shared by 3；滑過列出三個人'],
            ['共用號碼但要寄給某一個人', '在選單裡選那個人', '加入那個人；SMS 寄到這支共用號碼', '灰色：姓名 · 0919-000-119'],
            ['不屬於任何員工', '0987654321；MVPN 8899999', 'Phone numbers：外部號碼；MVPN：紅色，No one uses this MVPN', '電話圖示加號碼；或紅色'],
          ]} />
          <SpecTable head={['選單', '規格']} nowrap={[0]} rows={[
            ['一個人的號碼', '大頭照、姓名；下一行號碼 · Company mobile／Personal phone／MVPN'],
            ['共用號碼', '第一項是號碼本身：電話圖示、號碼（shared）；下一行 Shared by 三個人的名字。接著每個人各一項（縮排）：姓名；下一行號碼 · only this person'],
            ['同一個人出現兩次', '例如用他的兩個 MVPN：只加入一次（用第一個號碼），和其他重複的值一樣不顯示'],
            ['直接打完按 Enter（不選）', '一個人的號碼 → 那個人；共用號碼 → 號碼本身（同選單第一項）'],
          ]} />
          <Notes items={[
            { title: '要和工程確認', body: '「用號碼加入的人，SMS 寄到那支號碼」需要後端能記住每位收件人指定的號碼。舊系統選人時是隨機挑一支公務手機；如果後端做不到指定，退而求其次是：一個人的號碼照樣加入那個人（但 SMS 可能寄到他另一支公務手機，標籤就不顯示號碼），共用號碼仍當成一支號碼。' },
            { title: '為什麼共用號碼不展開成人', body: '值班機掛在誰身上會輪替，寄給「掛著的每個人」會讓不在值班的人也收到 App 推播與 SMS；使用者給的是號碼，意思通常是「打給值班的那一支」。' },
            { title: '試試', body: 'Data type 選 Phone numbers 打 0919 或 0918；選 MVPN 打 8861 或 88602；也可以按 Paste a sample list。' },
          ]} cols />
        </Section>

        <Section eyebrow="Label" title="找到的標籤顯示什麼" lead="2026-11-19：原本找到人就把標籤換成姓名，但 Phone numbers、MVPN 會變成「姓名 · 號碼」很長，名單裡又混著人名、號碼、Email（外部的仍是號碼或 Email），反而干擾。建議改成標籤一律顯示輸入的值，是誰放在滑過的提示裡。">
          <SpecTable head={['', '輸入的值（建議）', '姓名（原本）']} nowrap={[0]} rows={[
            ['標籤文字', '使用者輸入的值，整理成同一種格式（號碼加連字號），同一份名單長得都一樣', '人名（號碼類再加「· 號碼」）；外部聯絡人、共用號碼是號碼或 Email'],
            ['圖示、大頭照', '沒有', '人有大頭照；組織、外部、共用號碼有圖示'],
            ['怎麼知道是誰', '滑過：姓名 · 組織（號碼類加 Company mobile／Personal phone／MVPN；共用號碼列出共用的人）', '直接看得到'],
            ['灰色／紅色的意思', '灰色：找到了；紅色：找不到（滑過看原因）', '同左'],
            ['加入之後', '收件人表格照常顯示人名與大頭照', '同左'],
          ]} />
          <Notes items={[
            { title: '為什麼建議顯示值', body: '這一步的工作是「確認名單裡每一筆都對得到」，不是認人；輸入什麼就看到什麼，最容易對照原本的名單（Excel）。要確認是誰，滑過就有；加入後收件人表格也會顯示人名。' },
            { title: '打字時的選單仍顯示人', body: '輸入時跳出的選單照樣有大頭照與姓名，幫使用者挑對人；選了之後，標籤顯示的是那個人的值（例如 NT 帳號）。' },
          ]} cols />
        </Section>

        <Section eyebrow="Guard" title="切換資料類型前先確認" lead="名單裡的值是照資料類型比對的（例如 NT 帳號），換了類型就比對不了，所以切換會清空名單。名單是空的時候直接切換；名單有東西時先問。">
          <SpecTable head={['項目', '規格']} nowrap={[0]} rows={[
            ['對話框', '設計系統 Dialog，寬 480（和其他確認對話框相同），疊在 Batch import 之上。'],
            ['標題', 'Change the data type?'],
            ['說明', 'Changing to <新的類型> clears the list. The <n> entries you added can’t be looked up as another type.'],
            ['按鈕', 'Cancel（tertiary，資料類型維持原本的）、Clear and change（primary danger，清空名單並換成新的類型）。'],
            ['不會問的時候', '名單是空的；選回同一個類型；Phone numbers 換 Region（只會重新比對沒有 + 的號碼，不清空）。'],
          ]} />
          <Notes items={[{ title: '試試', body: '任一個示範先貼上名單，再把 Data type 換成別的。' }]} />
        </Section>

        <Section eyebrow="Compare" title="比較">
          <SpecTable head={['', '修改的樣子', '紅色在哪', '修好之後', '名單很長時']} nowrap={[0]} rows={[
            ['現在', '欄位裡的輸入框', '永遠在最前面', '立刻跳到後面（找不到）', '要處理的在最前面'],
            ['A（建議）', '變回純文字', '加入名單時排到前面', '原地變灰色、閃一下綠框', '要處理的在最前面；修好的不動'],
            ['B', '變回純文字', '照輸入順序（散在各處）', '原地變灰色、閃一下綠框', '靠 Next to fix 跳到下一筆'],
            ['C', '變回純文字', '同 A', '同 A；Enter 直接改下一筆', '同 A，鍵盤可以一路改完'],
          ]} />
          <Notes items={[
            { title: '建議 A', body: '保留「要處理的在最前面」，又不會讓剛改好的標籤消失：排序只發生在名單「進來」的那一刻（貼上、按 Enter、輸入逗號），修改不會觸發排序。修好的標籤在原地變灰並閃一下綠框，使用者看得到結果。下一次再貼上新名單時才重新整理順序。' },
            { title: '要不要加 C', body: 'C 的 Enter 接著改下一筆，對一次要修十幾筆的人很快；但只改一兩筆的人可能會被突然打開的下一筆嚇到。可以先上 A，看使用者測試再決定。' },
            { title: 'B 的取捨', body: 'B 完全不動順序，最容易預期；但紅色散在名單各處，名單很長時要靠 Next to fix，多一個要學的東西，也會讓「n to fix」的數字回到畫面上（之前拿掉過總結標籤）。' },
          ]} />
        </Section>

        <Section eyebrow="Spec" title="A 的規格（若採用）">
          <SpecTable head={['項目', '規格']} nowrap={[0]} rows={[
            ['修改', '點任何標籤（或聚焦後 Enter／Space），標籤變回純文字：沒有外框、沒有底色，字的大小、位置和標籤裡的字相同，游標在字的最後面，寬度跟著字變長。內容是原本輸入的值（例如 NT 帳號，不是姓名）。'],
            ['結束修改', 'Enter 或點別處：重新比對，變回標籤；Esc：取消修改；把字刪光再結束：移除這一筆。'],
            ['順序', '貼上、Enter、逗號把新的值加進來時，整份名單重新整理一次：紅色在前、灰色在後（各自保持輸入順序）。修改、移除不重新整理。'],
            ['改成重複的', '改完發現是名單裡已經有的（例如同一個人的另一支號碼）：這一筆移除，名單裡原本那個標籤閃一下綠框，畫面捲到它。'],
            ['修好之後', '標籤留在原地，變成灰色，外圍閃一下細的綠框（不到 1 秒）；游標回到名單最後面但畫面不捲動，標籤上不出現藍色焦點框。改了還是找不到：仍是紅色、留在原地，原因更新。'],
            ['說明文字', '不變：{n} valid audiences. Click a tag to edit it.'],
          ]} />
        </Section>

        <Section eyebrow="Phone" title="Phone numbers 加地區">
          <SpecTable head={['項目', '規格']} nowrap={[0]} rows={[
            ['地區', 'Data type 選 Phone numbers 時，旁邊多一個 Region 選單：TW +886（預設）、US +1、JP +81、CN +86，和收件人搜尋的地區一樣。'],
            ['沒有 + 的號碼', '照選的地區檢查與存放（TW 0912-345-678；其他寫成 +國碼）。'],
            ['有 + 的號碼', '用號碼自己的國碼，不管選了哪個地區（同一份名單可以混不同地區）；不是這四個國碼的，紅色標籤，原因 Only TW, US, JP and CN numbers。'],
            ['員工號碼', '台灣號碼是員工的公務或私人手機時，加入那位員工（灰色標籤是姓名）。'],
          ]} />
          <Notes items={[{ title: '試試', body: '在任一個示範把 Data type 換成 Phone numbers，再按 Paste a sample list：有台灣員工號碼、外部台灣號碼、美日中各一個、一個太短、一個英國號碼。' }]} />
        </Section>
      </main>
    </>
  )
}
