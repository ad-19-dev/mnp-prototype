// Batch import: how a tag is edited, and where a tag goes once it's fixed (2026-11-19). Live demos side by side,
// with the prototype's sample people and matching; nothing here changes the prototype.
//   Now: a click swaps the tag for a small DS Input (a field inside the field); red tags are always sorted first, so
//        a fixed one jumps to the gray ones at once.
//   A (suggested until 2026-11-20): a click turns the tag back into plain text in the same spot; the order is set only when entries
//        come in, and a fixed tag stays where it is, turning gray with a short green flash. Entries that come in later
//        don't move the tags already there: new red ones go first, new gray ones last (2026-11-19).
//   B: the order you typed is kept; the hint counts what's left to fix, and Next to fix jumps to the next red tag.
//   C: A, plus Enter on a fixed tag moves straight to the next red one (for long lists).
//   D (suggested since 2026-11-20): the order you typed is kept, no sorting; the hint says how many aren't found, with Show only invalid
//        (only the red tags; the ones fixed there stay until Show all). 2026-11-20: "n valid · m invalid (click a tag to
//        edit it)"; "m invalid" in red, nothing else colored; clicking "m invalid" shows only the invalid ones (it was a separate
//        Show only invalid link, too loud next to the count); no Remove all.
// Phone numbers get a region (TW / US / JP / CN) next to the data type; numbers starting with + keep their own code.
import * as React from 'react'
import { Button, CircularProgress, Popover, PopoverAnchor, PopoverContent, SegmentedControl, SegmentedControlItem, Select, Tag, Tooltip, TooltipContent, TooltipTrigger, cn } from '@qijenchen/design-system'
import { Building2, Mail, Phone } from 'lucide-react'
import { Notes, Section, SpecTable } from '../parts'
import { Banner, ConfirmDialog, FormField, ListKindField, PAvatar, listKindExample, listKindName, pname } from '../../components/ui'
import { REGIONS, type Region } from '../../components/RecvInput'
import { DOMAIN, ORGS, PEOPLE, PMAP, fmtExtPhone, matchAs, splitTokens, type ListKind, type Person } from '../../lib/data'

type Mode = 'now' | 'A' | 'B' | 'C' | 'D' | 'E'
// pin: picked from the dropdown for a number several people share: a person's id, or '#' for the number itself
type Item = { id: number; v: string; pin?: string }
// label: the person's name (or the org, the number); val: the value as entered, formatted; who: shown on hover
type Ok = { key: string; label: string; val: string; who?: string; p?: string; icon?: typeof Mail; shared?: string[] }
// type (suggested): names for NT accounts and Employee IDs (codes nobody can read; every match is a person),
// the entered value for the rest
export type Show = 'type' | 'value' | 'name'
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
  // keyed by the number: two numbers of one person are two entries, an SMS to each (2026-11-19)
  if (one) { const p = PMAP[one]; return { key: 'n:' + x.n, label: pname(p) + ' · ' + showNum(x), val, who: pname(p) + ' · ' + p.org + ' · ' + whatName(x) + (x.owners.length > 1 ? ' (shared)' : ''), p: one } }
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

// D's hint: the parts with a dot between them
function DHint({ parts }: { parts: React.ReactNode[] }) {
  const l = parts.filter(Boolean)
  return (
    <span className="flex flex-wrap items-center gap-x-1">
      {l.map((x, i) => <React.Fragment key={i}>{i ? <span aria-hidden>·</span> : null}<span className="inline-flex items-center">{x}</span></React.Fragment>)}
    </span>
  )
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
// a second batch: two not found, one new person, one already in the list
const MORE: Record<string, string> = {
  nt: 'kylln, thliu, a20001, psyang',
  phone: '0918120113, 0918777, 0912337415',
}

// also used live at the top of the why page (teams/tagwhy.html)
// slow (2026-11-20): a simulated slow check for D. Pasted entries show at once as faded tags that can't be used yet,
// a few at a time turn into their results (top first), the hint says "Checking x of y…", and Proceed waits for it.
const SLOW_STEP = 3, SLOW_MS = 700

// E (2026-11-23): two steps. While typing or pasting only the format is checked (in the browser, at once: red right
// away); Proceed sends the rest to the server, in the same field, and what it can't find turns red in place. The field
// stays fully editable after that: anything changed or added is only format-checked again, and the next Proceed checks
// just those. Text left in the input without a comma is taken in on Proceed (and on leaving the input).
function fmtErr(kind: ListKind | null, v: string): string {
  const t = v.trim(), d = t.replace(/\D/g, '')
  if (kind === 'nt') return /^[a-z][a-z0-9]{1,19}$/i.test(t) ? '' : 'Not an NT account format'
  if (kind === 'emp') return /^\d{6}$/.test(t) ? '' : 'An employee ID is 6 digits'
  if (kind === 'email') return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t) ? '' : 'Not an email address'
  if (kind === 'mvpn') return /^\d{7}$/.test(t) ? '' : 'An MVPN is 7 digits'
  if (kind === 'org') return /^[a-z0-9]{2,8}$/i.test(t) ? '' : 'Not an Org ID format'
  if (kind === 'phone') return (t.startsWith('+') ? d.length >= 8 && d.length <= 15 : /^(09\d{8}|8869\d{8}|9\d{8})$/.test(d)) ? '' : 'Not a mobile number format'
  return ''
}
export function Demo({ mode, show, slow }: { mode: Mode; show: Show; slow?: boolean }) {
  const mid = slow ? 'S' : mode   // ids on the page: the slow demo is a second D
  const [pendingIds, setPendingIds] = React.useState<number[]>([]), [proceeded, setProceeded] = React.useState('')
  // E: what the server has checked, by entry: the value it checked (an edit makes it unchecked again)
  const [mustFix, setMustFix] = React.useState(true)   // 2026-11-23: fix first is the default
  // E: the order after the last check: the invalid ones moved to the end (2026-11-23); entries added since go after it
  const [eOrder, setEOrder] = React.useState<number[]>([])   // E: may invalid entries be left out, or must they be fixed first
  const [checked, setChecked] = React.useState<Record<number, string>>({}), runN = React.useRef(0), ran = React.useRef(false), itemsRef = React.useRef<Item[]>([])
  // E: Proceed was pressed at least once (it may have had nothing to send, e.g. only wrong formats); tick reruns the end of a check
  const [ranOnce, setRanOnce] = React.useState(false), [tick, setTick] = React.useState(0)
  const step = mode === 'E' ? 6 : SLOW_STEP, ms = mode === 'E' ? 450 : SLOW_MS
  React.useEffect(() => {
    if (!pendingIds.length) return
    const t = setTimeout(() => {
      const done = pendingIds.slice(0, step)
      setChecked(c => { const n = { ...c }; done.forEach(id => { const it = itemsRef.current.find(x => x.id === id); if (it) n[id] = it.v }); return n })
      setPendingIds(l => l.slice(step))
    }, ms)
    return () => clearTimeout(t)
  }, [pendingIds])
  const [kind, setKind] = React.useState<ListKind | null>('nt'), [region, setRegion] = React.useState<Region>('TW')
  const [items, setItems] = React.useState<Item[]>([]), [draft, setDraft] = React.useState('')
  const [seq, setSeq] = React.useState<number[]>([])        // A, C: the order, set when entries come in
  const [edit, setEdit] = React.useState<{ id: number; v: string } | null>(null)
  const [hi, setHi] = React.useState(0), [sugOpen, setSugOpen] = React.useState(false)
  const [pend, setPend] = React.useState<ListKind | null>(null)
  const [flash, setFlash] = React.useState<number | null>(null)
  const [only, setOnly] = React.useState<number[] | null>(null)  // D: the red tags shown by Show only invalid
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
    : mode === 'E' ? eOrder.map(id => byId[id]).filter(Boolean).concat(hits.filter(h => eOrder.indexOf(h.id) < 0))
    : mode === 'D' ? (only ? hits.filter(h => only.indexOf(h.id) >= 0) : hits)
    : seq.map(id => byId[id]).filter(Boolean).concat(hits.filter(h => seq.indexOf(h.id) < 0))
  const isPending = (h: Hit) => pendingIds.indexOf(h.id) >= 0, checking = hits.some(isPending)
  itemsRef.current = items
  const E = mode === 'E', fmtBad = (h: Hit) => E && !!fmtErr(kind, h.v), isChecked = (h: Hit) => !E || checked[h.id] === h.v
  const bad = hits.filter(h => fmtBad(h) || (h.why && !isPending(h) && isChecked(h))), good = hits.filter(h => h.ok && !isPending(h) && !fmtBad(h) && isChecked(h))
  const unchecked = E ? hits.filter(h => !fmtBad(h) && !isPending(h) && !isChecked(h)) : [], hasChecked = E && (ranOnce || Object.keys(checked).length > 0)

  // entries come in: A and C place only the new ones (red first, gray last); the tags already there keep their order
  const take = (t: string, pin?: string) => {
    const l = splitTokens(t).map(x => x.trim()).filter(Boolean)
    setDraft('')
    if (!l.length) return
    const add = l.map(v => ({ id: nextId.current++, v, pin })), all = itemsRef.current.concat(add)
    setItems(all); itemsRef.current = all
    setOnly(null); setProceeded('')
    if (slow) setPendingIds(l => l.concat(add.map(x => x.id)))
    if (mode === 'D' || E) setTimeout(() => { if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight }, 0)
    if (mode === 'A' || mode === 'C') {
      const ids = new Set(add.map(x => x.id)), fresh = hitsOf(all).filter(h => ids.has(h.id))
      setSeq(fresh.filter(h => h.why).map(h => h.id).concat(seq, fresh.filter(h => h.ok).map(h => h.id)))
      // new red tags at the top: bring them into view
      if (fresh.some(h => h.why)) setTimeout(() => { if (boxRef.current) boxRef.current.scrollTop = 0 }, 0)
    }
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
    if (!E && was && was.why && now && now.ok) blink(edit.id)
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
  React.useEffect(() => { setItems([]); setSeq([]); setEdit(null); setOnly(null); setPendingIds([]); setChecked({}); setEOrder([]); setRanOnce(false) }, [kind])
  // E: Proceed takes in what's left in the input, then sends what isn't checked yet (with a right format) to the server
  const proceedE = () => {
    if (draft.trim()) take(draft)
    const all = itemsRef.current
    const todo = hitsOf(all).filter(h => !fmtErr(kind, h.v) && checked[h.id] !== h.v).map(h => h.id)
    setProceeded(''); setOnly(null); setRanOnce(true)
    // nothing to send (only wrong formats, or all checked already): end the check at once, so the invalid ones still gather at the end (2026-11-23)
    if (!todo.length) { ran.current = true; setTick(t => t + 1); return }
    runN.current = todo.length; ran.current = true; setPendingIds(todo)
  }
  // E: when a check ends: with nothing invalid and nothing left to check, the list is added and the dialog closes;
  // otherwise the invalid ones (wrong format included) move to the end, next to the input, and the list scrolls there
  React.useEffect(() => {
    if (!E || checking || !ran.current) return
    ran.current = false
    if (!bad.length && !unchecked.length) { setProceeded('示範：全部有效，加入 ' + n + ' 筆，關閉對話框'); return }
    const isBad = (h: Hit) => bad.indexOf(h) >= 0
    setEOrder(shown.filter(h => !isBad(h)).concat(shown.filter(isBad)).map(h => h.id))
    setTimeout(() => { if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight }, 0)
  }, [checking, tick])
  // D: show only the red tags
  const showOnly = () => { setEdit(null); setOnly(bad.map(h => h.id)); setTimeout(() => { if (boxRef.current) boxRef.current.scrollTop = 0 }, 0) }

  const byNameOf = () => show === 'name' || (show === 'type' && (kind === 'nt' || kind === 'emp'))
  // keyboard (2026-11-20), as in a mail recipient field: the tags are one stop with the input (Tab leaves the field);
  // ← at the start of the input goes to the last tag, ←/→ move between tags (→ past the last one is the input again),
  // Enter edits, Backspace/Delete removes and moves to the tag beside it, typing goes back to the input, Esc too.
  // Backspace in an empty input only goes to the last tag; a second Backspace removes it.
  const focusTag = (id: number | undefined) => {
    const el = id == null ? null : boxRef.current?.querySelector<HTMLElement>('[data-tagid="' + id + '"]')
    if (el) { el.focus(); el.scrollIntoView({ block: 'nearest' }) } else inputRef.current?.focus()
  }
  // the × inside each tag isn't a Tab stop either (it stays clickable; Backspace/Delete do it from the keyboard)
  React.useEffect(() => { boxRef.current?.querySelectorAll<HTMLElement>('[data-tagid] button').forEach(b => { b.tabIndex = -1 }) })
  const tagKeys = (h: Hit) => (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return
    const i = shown.findIndex(x => x.id === h.id), prev = shown[i - 1], next = shown[i + 1]
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'F2') { e.preventDefault(); openEdit(h) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); if (prev) focusTag(prev.id) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); focusTag(next?.id) }
    else if (e.key === 'Home') { e.preventDefault(); focusTag(shown[0]?.id) }
    else if (e.key === 'End' || e.key === 'Escape') { e.preventDefault(); inputRef.current?.focus() }
    else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault(); const to = e.key === 'Backspace' ? (prev || next) : (next || prev)
      drop(h.id); setTimeout(() => focusTag(to?.id), 0)
    }
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); setDraft(d => d + e.key); setSugOpen(true); inputRef.current?.focus() }
  }
  const editable = (h: Hit) => ({
    role: 'button', tabIndex: -1, className: 'cursor-text', 'data-tagid': h.id,
    'aria-label': 'Edit ' + (h.ok ? (byNameOf() ? h.ok.label : h.ok.val) : h.v) + (h.why ? ': ' + h.why : ''),
    onClick: (e: React.MouseEvent) => { if (!(e.target as HTMLElement).closest('button')) openEdit(h) },
    onKeyDown: tagKeys(h),
  })
  const redTag = (h: Hit, why: string) => (
    <Tooltip key={h.id}>
      <TooltipTrigger asChild><Tag color="red" {...editable(h)} onRemove={() => drop(h.id)} removeAriaLabel={h.v}>{h.v}</Tag></TooltipTrigger>
      <TooltipContent side="bottom" align="start">{why}</TooltipContent>
    </Tooltip>
  )
  const tag = (h: Hit) => {
    // E: a wrong format is red at once; one not checked by the server yet shows what was entered, plain gray
    if (E && fmtErr(kind, h.v)) return redTag(h, fmtErr(kind, h.v))
    // still being checked: what was entered, faded, not usable yet (no edit, no ×)
    if (isPending(h)) return <Tag key={h.id} data-tagid={h.id} aria-disabled className="opacity-50">{h.v}</Tag>
    if (!isChecked(h)) return <Tag key={h.id} {...editable(h)} onRemove={() => drop(h.id)} removeAriaLabel={h.v}>{h.v}</Tag>
    const fl = flash === h.id
    if (h.ok) {
      // value: what was entered (formatted), no avatar or icon; name: the person's name with their avatar
      const p = h.ok.p ? PMAP[h.ok.p] : null, byName = byNameOf(), text = byName ? h.ok.label : h.ok.val
      const t = <Tag key={h.id} unbounded avatar={byName && p ? <PAvatar p={p} size={16} /> : undefined} icon={byName && !p ? h.ok.icon : undefined} {...editable(h)}
        className={cn('cursor-text transition-shadow duration-300', fl && 'ring-1 ring-[var(--color-green-6,#22a06b)]')} onRemove={() => drop(h.id)} removeAriaLabel={text}>{text}</Tag>
      // hover: who it is (value), or who shares the number (both)
      // by name: hover shows the value and the org (a shared number: who shares it); by value: who it is
      // 2026-11-20: phone numbers, MVPN and emails show what was entered, so no hover (shared numbers included); a hover
      // only where the tag doesn't show what was typed (names for codes) or a code needs its name (Org IDs)
      const tip = byName ? (p ? h.ok.val + ' · ' + p.org : h.ok.shared ? h.ok.who : null)
        : kind === 'phone' || kind === 'mvpn' || kind === 'email' ? null : h.ok.who
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
  // E, "fix first" only (2026-11-23): one click removes the invalid ones; with "may skip", Proceed leaves them out anyway
  const removeInvalid = () => { const gone = bad.map(h => h.id); setItems(l => l.filter(x => gone.indexOf(x.id) < 0)); setEOrder(o => o.filter(id => gone.indexOf(id) < 0)) }
  // E's help text (2026-11-23): before a check only how many entries; after one, n valid · m invalid with what to do,
  // in the help text itself (no banner); m invalid is plain red text (no "show only"); no "click a tag to edit it"
  const errNow = E && hasChecked && !checking && !unchecked.length && !draft.trim() && bad.length > 0
  // 2026-11-23: "22 valid, 3 invalid. Fix or remove invalid to proceed. Remove invalid" (commas; Remove invalid right after
  // the sentence, "fix first" only)
  // before a check (2026-11-23): wrong formats are known at once, so they are counted at once ("25 entries, 1 invalid"),
  // with Remove invalid in "fix first"; Proceed stays usable: it checks the rest, then gathers all the invalid ones at the end
  const rmLink = <Button variant="link" size="sm" className="!inline !h-auto !min-w-0 !p-0 align-baseline [&>span]:!px-0" onClick={removeInvalid}>Remove invalid</Button>
  const EHint = () => !hasChecked
    ? <span>{hits.length} {hits.length === 1 ? 'entry' : 'entries'}{bad.length ? <>, <span className="text-error-text">{bad.length} invalid</span>{mustFix ? <>. {rmLink}</> : null}</> : null}</span>
    : <span>
        {n} valid
        {bad.length ? <>, <span className="text-error-text">{bad.length} invalid</span></> : null}
        {unchecked.length ? ', ' + unchecked.length + ' not checked yet' : null}
        {errNow ? <>. <span className={mustFix ? 'text-error-text' : undefined}>{mustFix ? 'Fix or remove invalid to proceed.' : 'Fix or remove them, or proceed with the valid ones.'}</span></> : null}
        {errNow && mustFix ? <> {rmLink}</> : null}
      </span>
  const hintNode = (!hits.length ? 'Separate with commas or new lines.'
            : mode === 'B' ? <span className="flex flex-wrap items-center gap-x-2">{n} valid audiences{bad.length ? <> · <span className="text-error-text">{bad.length} to fix</span> <Button variant="link" size="sm" className="!h-auto !min-w-0 !p-0" onClick={goNextToFix}>Next to fix</Button></> : null}. Click a tag to edit it.</span>
            : mode === 'C' ? n + ' valid audiences. Click a tag to edit it; Enter goes on to the next red one.'
            : E && !checking ? <EHint />
            : (mode === 'D' || E) && checking ? <span className="inline-flex items-center gap-1.5"><CircularProgress size={14} aria-hidden />Checking {(E ? runN.current : hits.length) - hits.filter(isPending).length} of {E ? runN.current : hits.length}…</span>
            : mode === 'D' || E ? <DHint parts={[
                only ? <>{bad.length ? <span className="text-error-text">{bad.length} invalid</span> : 'All fixed'}&nbsp;(showing {shown.length} of {hits.length})</>
                  : E && !hasChecked ? <>{hits.length} {hits.length === 1 ? 'entry' : 'entries'}</> : <>{n} valid</>,
                // "m invalid" is itself the way to show only the invalid ones (2026-11-20): styled like "n not sent" in the
                // list, red with an underline on hover only, so it's found by those who need it without competing with the count
                !only && bad.length ? <span className="inline-flex items-center">
                  <Tooltip><TooltipTrigger asChild><Button variant="link" size="sm" className="!h-auto !min-w-0 !p-0 !text-error-text hover:!text-error-text hover:underline [&>span]:!px-0" onClick={showOnly}>{bad.length} invalid</Button></TooltipTrigger><TooltipContent>Show only invalid</TooltipContent></Tooltip>
                  &nbsp;(click a tag to edit it)</span> : null,
                !only && hasChecked && unchecked.length ? <>{unchecked.length} not checked yet</> : null,
                only ? <Button variant="link" size="sm" className="!h-auto !min-w-0 !p-0" onClick={() => setOnly(null)}>Show all</Button> : null,
              ]} />
            : n + ' valid audiences. Click a tag to edit it.')
  return (
    <div className="flex flex-col gap-2" data-demo={mid}>
      <div className="flex flex-col gap-[var(--layout-space-tight)] rounded-lg border border-divider bg-surface p-[var(--layout-space-loose)]">
        <div className="flex flex-wrap items-end gap-2">
          {/* changing the data type clears the list (the entries can't be looked up as another type): asked first when the
              list isn't empty (2026-11-19) */}
          <div className="w-56"><ListKindField id={'k-' + mid} value={kind} onChange={k => { if (k === kind) return; if (items.length) setPend(k); else setKind(k) }} /></div>
          {kind === 'phone' ? <div className="w-36"><FormField id={'r-' + mid} label="Region"><Select aria-label="Region" value={region} onChange={v => setRegion(v as Region)} options={REGIONS.map(x => ({ value: x.v, label: x.code + ' (' + x.v + ')' }))} /></FormField></div> : null}
        </div>
        <FormField id={'t-' + mid} label="List" hint={hintNode}>
          <div ref={boxRef} className={cn(errNow && mustFix && '!border-error', 'flex h-56 w-full flex-wrap content-start items-center gap-1 overflow-y-auto rounded-md border px-[var(--field-px)] py-[var(--field-control-py-md)]',
            kind ? 'cursor-text border-border bg-surface hover:border-border-hover focus-within:!border-primary' : 'cursor-not-allowed border-transparent bg-disabled')}
            onClick={e => { if (e.target === e.currentTarget) inputRef.current?.focus() }}>
            {shown.map(h => (edit && edit.id === h.id ? editor(h) : tag(h)))}
            <Popover open={showSug} onOpenChange={o => { if (!o) setSugOpen(false) }}>
              <PopoverAnchor asChild>
                <span className="flex min-w-[160px] flex-1">
                  <input ref={inputRef} id={'t-' + mid} disabled={!kind} className="w-full bg-transparent py-0.5 text-body outline-none placeholder:text-fg-muted" autoComplete="off"
                    role="combobox" aria-expanded={showSug} aria-autocomplete="list"
                    placeholder={!kind ? 'Choose a data type first' : items.length ? '' : 'e.g. ' + (kind === 'phone' ? REGIONS.find(r => r.v === region)!.ph : listKindExample(kind))}
                    value={draft} onChange={e => { setHi(0); setSugOpen(true); if (/[\n,，;；]/.test(e.target.value)) take(e.target.value); else setDraft(e.target.value) }}
                    onKeyDown={e => {
                      if (showSug && e.key === 'ArrowDown') { e.preventDefault(); setHi(i => Math.min(i + 1, sugs.length - 1)) }
                      else if (showSug && e.key === 'ArrowUp') { e.preventDefault(); setHi(i => Math.max(i - 1, 0)) }
                      else if (e.key === 'Escape' && showSug) { e.stopPropagation(); setSugOpen(false) }
                      else if (e.key === 'Enter') { e.preventDefault(); if (showSug) pick(sugs[Math.min(hi, sugs.length - 1)]); else take(draft) }
                      else if (e.key === 'Backspace' && !draft && shown.length) { e.preventDefault(); focusTag(shown[shown.length - 1].id) }
                      else if (e.key === 'ArrowLeft' && !showSug && shown.length && e.currentTarget.selectionStart === 0 && e.currentTarget.selectionEnd === 0) { e.preventDefault(); focusTag(shown[shown.length - 1].id) }
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
        {E ? (
          // E's footer: Proceed checks what isn't checked yet; with invalid ones left after a check, it adds the valid ones
          <div className="flex items-center justify-end gap-2 border-t border-divider pt-3">
            {proceeded ? <span className="mr-auto text-caption text-fg-secondary">{proceeded}</span> : null}
            <Button variant="tertiary" onClick={() => { setItems([]); setPendingIds([]); setChecked({}); setEOrder([]); setRanOnce(false); setOnly(null); setEdit(null); setProceeded('') }}>Cancel</Button>
            {checking ? (
              <Tooltip><TooltipTrigger asChild><span tabIndex={0}><Button variant="primary" disabled>Proceed</Button></span></TooltipTrigger><TooltipContent>Checking the list…</TooltipContent></Tooltip>
            ) : unchecked.length || draft.trim() || !hasChecked ? (
              <Button variant="primary" disabled={!hits.length && !draft.trim()} onClick={proceedE}>Proceed</Button>
            ) : bad.length && mustFix ? (
              <Tooltip><TooltipTrigger asChild><span tabIndex={0}><Button variant="primary" disabled>Proceed</Button></span></TooltipTrigger><TooltipContent>Fix or remove the invalid entries first</TooltipContent></Tooltip>
            ) : bad.length ? (
              <Button variant="primary" disabled={!n} onClick={() => setProceeded('示範：加入 ' + n + ' 筆有效的，略過 ' + bad.length + ' 筆，關閉對話框')}>Proceed</Button>
            ) : <Button variant="primary" disabled={!n} onClick={() => setProceeded('示範：加入 ' + n + ' 筆，關閉對話框')}>Proceed</Button>}
          </div>
        ) : null}
        {slow ? (
          // the dialog's footer: Proceed waits for the check
          <div className="flex items-center justify-end gap-2 border-t border-divider pt-3">
            {proceeded ? <span className="mr-auto text-caption text-fg-secondary">{proceeded}</span> : null}
            <Button variant="tertiary" onClick={() => { setItems([]); setPendingIds([]); setOnly(null); setEdit(null); setProceeded('') }}>Cancel</Button>
            {checking ? (
              <Tooltip><TooltipTrigger asChild><span tabIndex={0}><Button variant="primary" disabled>Proceed</Button></span></TooltipTrigger><TooltipContent>Checking the list…</TooltipContent></Tooltip>
            ) : <Button variant="primary" disabled={!good.length} onClick={() => setProceeded('示範：回到 Audience，加入 ' + good.length + ' 筆')}>Proceed</Button>}
          </div>
        ) : null}
        <ConfirmDialog onClose={() => setPend(null)} cf={pend ? {
          title: 'Change the data type?',
          text: 'Changing to ' + listKindName(pend) + ' clears the list. The ' + hits.length + (hits.length === 1 ? ' entry' : ' entries') + ' you added can’t be looked up as another type.',
          cancel: 'Cancel', ok: 'Clear and change', danger: true, run: () => { setKind(pend); setPend(null) },
        } : null} />
      </div>
      {/* demo controls: only for trying the proposal, not part of the design (2026-11-20: moved out of the card) */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border px-3 py-2">
        <span className="text-caption font-medium text-fg-secondary">示範用</span>
        <Button variant="secondary" size="sm" disabled={!kind || !SAMPLE[kind]} onClick={() => take(SAMPLE[kind!])}>Paste a sample list</Button>
        <Button variant="secondary" size="sm" disabled={!kind || !MORE[kind] || !items.length} onClick={() => take(MORE[kind!])}>Paste more</Button>
        <Button variant="tertiary" size="sm" disabled={!items.length} onClick={() => { setItems([]); setSeq([]); setEdit(null); setOnly(null); setPendingIds([]); setChecked({}); setEOrder([]); setRanOnce(false); setProceeded('') }}>Clear</Button>
        {E ? (
          <SegmentedControl size="sm" value={mustFix ? 'fix' : 'skip'} onValueChange={v => v && setMustFix(v === 'fix')} aria-label="With invalid entries">
            <SegmentedControlItem value="fix">一定要先改完（建議）</SegmentedControlItem>
            <SegmentedControlItem value="skip">可略過無效的</SegmentedControlItem>
          </SegmentedControl>
        ) : null}
        <span className="text-caption text-fg-secondary">{E ? '試試：Paste a sample list（cm.chen 格式錯，馬上變紅）→ Proceed → 無效的移到最後 → 改好或再加人 → Proceed 只驗改過的。' : slow ? '試試：按 Paste a sample list，看標籤一批一批確認完，Proceed 才能按；確認中可以再貼一批。' : mode === 'D' ? '試試：點「3 invalid」，把 a19999 改成 ytchang，再按 Show all。' : '試試：把紅色的 a19999 改成 ytchang，看它去哪；再按 Paste more。'}</span>
      </div>
    </div>
  )
}

export default function ImportTags() {
  // what a found tag shows (2026-11-19): the value as entered (suggested), or the person's name
  const [show, setShow] = React.useState<Show>('type')
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
          <span className="text-caption text-fg-secondary">2026/11/19（D 為 11/20 加）· 五個版本都可以直接操作（按 Paste a sample list 貼上 26 筆，其中 3 筆找不到；把 a19999 改成 ytchang，再按 Paste more 貼第二批試試），用的是原型的範例資料與比對規則；不影響原型。</span>
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
              <SegmentedControlItem value="type">依資料類型（建議）</SegmentedControlItem>
              <SegmentedControlItem value="value">都是輸入的值</SegmentedControlItem>
              <SegmentedControlItem value="name">都是姓名</SegmentedControlItem>
            </SegmentedControl>
            <span className="text-caption text-fg-secondary">五個示範一起切換</span>
          </div>
          <div className="grid gap-[var(--layout-space-loose)] xl:grid-cols-2">
            {col('now', '現在', <Tag size="sm" color="neutral">原型目前的做法</Tag>, '點標籤換成有外框的輸入框；紅色永遠排最前面，修好就跳到灰色區。')}
            {col('A', 'A：變回文字、原地變色', <Tag size="sm" color="neutral">11/19 的建議</Tag>, '點標籤變回純文字（游標在字裡）；只有加入名單時把紅色排到前面，修好的標籤留在原地變灰色，閃一下綠框。')}
            {col('B', 'B：照輸入順序，用 Next 找下一筆', <Tag size="sm" color="neutral">替代</Tag>, '不排序；說明文字寫「n to fix」與 Next to fix，按了直接打開下一個紅色標籤。')}
            {col('C', 'C：A 加上 Enter 接著改下一筆', <Tag size="sm" color="neutral">A 的加強</Tag>, '和 A 相同；改好按 Enter 會直接打開下一個紅色標籤，不用再找。')}
            {col('D', 'D：照輸入順序，只看有問題的', <Tag size="sm" color="neutral">11/20 的建議</Tag>, '不排序；說明文字寫「n valid · m invalid (click a tag to edit it)」，只有「m invalid」是紅色；點它，名單只顯示紅色標籤，在這裡改。')}
          </div>
        </Section>

        <Section eyebrow="Checking" title="確認要一段時間時（D，模擬）" lead="2026-11-20。工程說一次貼幾千筆時，確認可能要一段時間。這裡用 26 筆模擬：每 0.7 秒確認 3 筆。">
          <div className="max-w-[880px]"><Demo mode="D" show={show} slow /></div>
          <Notes items={[
            { title: '確認中', body: '貼上的值馬上變成標籤，但是淡的、還不能點（像停用），顯示貼上的原值。說明文字寫 Checking x of y…，前面一個轉圈圖示；Proceed 停用，滑過提示 Checking the list…。Cancel 隨時可按。' },
            { title: '一批一批出結果', body: '由上而下，確認完的那幾個換成結果：找到的變成姓名（灰色），有問題的變紅色。全部確認完，說明文字回到 n valid · m invalid，Proceed 可以按。' },
            { title: '確認中還能做的事', body: '已經確認完的標籤可以改、可以刪；可以再貼一批，新的接在最後一起排隊確認。' },
            { title: '還要決定', body: '格式明顯不對的值（例如 Email 沒有 @）可以不等伺服器、貼上當下就變紅；確認中要不要先顯示目前的 valid／invalid 數字；幾千筆實際要幾秒（決定要不要換成進度條）。' },
          ]} cols />
        </Section>

        <Section eyebrow="E" title="E：輸入時查格式，按 Proceed 才完整驗證（建議，11/23）" lead="從 D 改良。有些錯誤前端驗不到（格式正確但查無此人、離職、號碼沒人用），所以分兩步：輸入或貼上時只查格式，按 Proceed 才送後端驗證；驗證結果留在同一個欄位，之後照樣自由編輯。範例裡 cm.chen 格式錯，a19999、gywuu 格式對但後端查不到。">
          <div className="max-w-[880px]"><Demo mode="E" show={show} /></div>
          <SpecTable head={['時機', '做什麼', '畫面']} nowrap={[0]} rows={[
            ['輸入、貼上', '只查格式（瀏覽器裡，馬上）', '格式錯的立刻變紅（留在原位）；格式對的是灰色、顯示輸入的值。說明文字寫筆數，有格式錯的也馬上算出來：25 entries, 1 invalid. Remove invalid（Remove invalid 只在「一定要先改完」）；Proceed 仍可按，按了驗其餘的，驗完所有無效的（含格式錯的）一起移到最後（2026-11-23）'],
            ['按 Proceed', '輸入框裡還沒打逗號的文字也算一筆；格式對、還沒驗證的送後端', '同一個欄位：標籤變淡、Checking x of y…，Proceed 等驗證完'],
            ['驗證完，全部有效', '直接加入、關閉對話框', '只要按一次 Proceed'],
            ['驗證完，有無效的', '留在原地', '無效的（含格式錯的）變紅並移到名單最後、緊接輸入框，名單捲到那裡；有效的換成姓名、照原順序在前面。說明文字（預設「一定要先改完」）：22 valid, 3 invalid. Fix or remove invalid to proceed. Remove invalid（紅字，Remove invalid 是藍色連結），欄位紅框，Proceed 停用；「可略過」時是 22 valid, 3 invalid. Fix or remove them, or proceed with the valid ones.，Proceed 加入有效的'],
            ['驗證後再改', '欄位不鎖：改、刪、加人、再貼都可以；標籤不移動', '改過或新加的回到灰色（還沒驗證），新加的接在最後；說明文字多一段 , 2 not checked yet；再按 Proceed 只驗這幾筆，驗完無效的再一起移到最後'],
            ['Remove invalid', '只有「一定要先改完」時，緊接在說明文字後面', '一次移除所有無效的，Proceed 就能按；「可略過」時不需要，因為 Proceed 本來就會略過它們'],
          ]} />
          <Notes items={[
            { title: '為什麼不跳新的視窗', body: '驗證結果只讓標籤變色、多一句提醒，使用者還在同一個欄位；不像先前的 verify-on-Add 只能改錯的，加人、減人都受限。和 Gmail 按送出時，有問題的地址在原欄位標紅讓你改，是同一種經驗。' },
            { title: '最後一個值沒打逗號', body: '按 Proceed、或離開輸入框時，輸入框裡剩下的文字也一起加入。' },
            { title: '為什麼不跳確認視窗、也不用橫幅', body: '批次匯入本身就是對話框，再跳一層要先關掉才能改；橫幅和說明文字會講同一件事。所以只用欄位的說明文字：驗證前只寫筆數，驗證後才寫幾筆無效、怎麼處理。按鈕名字不換，避免使用者以為是另一個動作。' },
            { title: '為什麼無效的移到最後、而且只在驗證完移', body: '拿掉「點 n invalid 只看無效的」之後（改好要不要消失、在那裡加人怎麼辦，都很難定），把無效的集中在最後、緊接輸入框，一樣好找。只在驗證結束那一刻移動，編輯時都不動，畫面不會邊改邊跳。' },
            { title: '預設一定要先改完（11/23）', body: '這是發通知的系統，「沒加到誰」要讓使用者自己確認過；Remove invalid 一下就清掉，等於明確表示「我知道這幾筆不會加入」，不用另跳確認視窗。加入 Audience 的名單就是畫面上看到的。示範區可以切換「可略過」比較。' },
            { title: '還要決定', body: '驗證前後的灰色標籤，電話、Email 這類顯示輸入值的類型長得一樣，要不要區分。' },
          ]} cols />
        </Section>

        <Section eyebrow="Order" title="要不要把紅色排到最前面" lead="2026-11-20 重新檢討：「紅色排最前面」只在名單很長、錯的很少、只貼一次時有用，卻帶出三條規則（什麼時候排、修好的去哪、第二批放哪）。D 改從使用者要完成的事出發，不靠位置。">
          <SpecTable head={['使用者要做的事', 'A（排序）怎麼做', 'D（不排序）怎麼做']} nowrap={[0]} rows={[
            ['知道有沒有錯、錯幾筆', '紅色在最前面，看位置猜', '說明文字直接寫 3 invalid（紅色）'],
            ['到每一筆錯的', '名單短時一眼看到；很長時紅色還是要捲動', '點「3 invalid」：名單只剩紅色標籤，再長都一眼看完'],
            ['知道為什麼錯', '滑過紅色標籤看原因', '同 A'],
            ['對回原始清單（Excel、Email）', '順序被打亂，要自己找', '和原始清單同一個順序'],
            ['處理：打錯字', '點標籤改，打字時有選單', '同 A；在只看 invalid 的畫面裡改，改好的留在原地變灰，按 Show all 回到完整名單'],
            ['處理：查無此人（離職、外部）', '一筆一筆按 ×', '在只看 invalid 的畫面裡一筆一筆按 ×（紅色都在一起，很快）'],
            ['再貼一批', '新的紅色放最前面、新的灰色放最後（另一條規則）', '接在最後，不需要規則；貼上時回到完整名單'],
          ]} />
          <Notes items={[
            { title: '試試', body: '在 D 按 Paste a sample list → 點說明文字裡的「3 invalid」→ 把 a19999 改成 ytchang（留在畫面上變灰）→ Show all，看它回到原本的位置。' },
            { title: '說明文字', body: '2026-11-20 簡化：n valid · m invalid (click a tag to edit it)。點「m invalid」只看有問題的（原本是另一個 Show only invalid 連結，比數字還顯眼，所以拿掉；「m invalid」和列表上的「n not sent」一樣是紅字、滑過才有底線，需要的人自然會發現，滑過也有提示 Show only invalid）。只有「m invalid」是紅色（要處理的只有它；n 是正常狀態，不上色），其他字維持說明文字的灰色；m 是 0 時只寫 n valid。用 invalid 不用 not found：紅色不一定是查無此人，也可能是格式不對或少打一個字。' },
            { title: '和之前拿掉的總結的差別', body: '2026-11-18 拿掉過總結標籤與「n to fix」。D 只有一行說明文字和一個連結，沒有標籤。' },
            { title: '為什麼沒有 Remove all', body: '一行裡多一個連結太複雜；在只看 invalid 的畫面裡，紅色都在一起，逐一按 × 也很快。' },
          ]} cols />
        </Section>

        <Section eyebrow="Keyboard" title="鍵盤操作" lead="2026-11-20 加，五個示範都有。整個欄位只佔一個 Tab 位置，在欄位裡用左右鍵在標籤之間移動，和 Gmail、Outlook 的收件人欄一樣。">
          <SpecTable head={['在哪裡', '按鍵', '結果']} nowrap={[0, 1]} rows={[
            ['名單最後的輸入框', '←（游標在最前面或輸入框是空的）', '移到最後一個標籤'],
            ['名單最後的輸入框', 'Backspace（輸入框是空的）', '只移到最後一個標籤，不刪；再按一次才刪，避免誤刪'],
            ['標籤上', '← / →', '移到前一個或後一個標籤；最後一個再按 → 回到輸入框'],
            ['標籤上', 'Home / End', '第一個標籤 / 回到輸入框'],
            ['標籤上', 'Enter（或空白鍵、F2）', '開始修改，和點一下一樣'],
            ['標籤上', 'Backspace / Delete', '刪掉這個標籤，焦點移到旁邊那一個（Backspace 往前、Delete 往後）'],
            ['標籤上', '直接打字、Esc', '回到輸入框，打的字接在最後'],
            ['欄位裡任何地方', 'Tab', '直接離開這個欄位，不會一個一個經過標籤和 ×'],
          ]} />
        </Section>

        <Section eyebrow="Suggest" title="輸入時比對到人：跳出選單" lead="每個示範都有：在名單欄位打字時，以及修改標籤時（2026-11-19 加），比對得到的人（或組織）出現在游標下方的選單，最多 6 筆；↑↓ 選、Enter 或點一下加入，Esc 關閉。加入的是這個資料類型的值（例如 NT 帳號），標籤上顯示姓名。已經在名單裡的人不再出現。">
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
            ['一個號碼屬於多個人（值班機）', '0919000119、MVPN 8861119（ESH 值班，三個人）', '預設加入「這支號碼」：只寄一封 SMS 到這支，不加入這三個人（不會收到 App 推播）', '灰色：0919-000-119（「都是姓名」時：電話圖示、0919-000-119 · Shared by 3）'],
            ['共用號碼但要寄給某一個人', '在選單裡選那個人', '加入那個人；SMS 寄到這支共用號碼', '灰色：姓名 · 0919-000-119'],
            ['不屬於任何員工', '0987654321；MVPN 8899999', 'Phone numbers：外部號碼；MVPN：紅色，No one uses this MVPN', '電話圖示加號碼；或紅色'],
          ]} />
          <SpecTable head={['選單', '規格']} nowrap={[0]} rows={[
            ['一個人的號碼', '大頭照、姓名；下一行號碼 · Company mobile／Personal phone／MVPN'],
            ['共用號碼', '第一項是號碼本身：電話圖示、號碼（shared）；下一行 Shared by 三個人的名字。接著每個人各一項（縮排）：姓名；下一行號碼 · only this person'],
            ['同一個人的兩個號碼都在名單裡', '兩個都保留，兩支都寄（例如他的兩個 MVPN）；只有完全相同的號碼才算重複（2026-11-19）'],
            ['直接打完按 Enter（不選）', '一個人的號碼 → 那個人；共用號碼 → 號碼本身（同選單第一項）'],
          ]} />
          <Notes items={[
            { title: '要和工程確認', body: '「用號碼加入的人，SMS 寄到那支號碼」需要後端能記住每位收件人指定的號碼。舊系統選人時是隨機挑一支公務手機；如果後端做不到指定，退而求其次是：一個人的號碼照樣加入那個人（但 SMS 可能寄到他另一支公務手機，標籤就不顯示號碼），共用號碼仍當成一支號碼。' },
            { title: '為什麼共用號碼不展開成人', body: '值班機掛在誰身上會輪替，寄給「掛著的每個人」會讓不在值班的人也收到 App 推播與 SMS；使用者給的是號碼，意思通常是「打給值班的那一支」。' },
            { title: '試試', body: 'Data type 選 Phone numbers 打 0919 或 0918；選 MVPN 打 8861 或 88602；也可以按 Paste a sample list。' },
          ]} cols />
        </Section>

        <Section eyebrow="Label" title="找到的標籤顯示什麼" lead="2026-11-19：原本找到人就把標籤換成姓名，但 Phone numbers、MVPN 會變成「姓名 · 號碼」很長，名單裡又混著人名、號碼、Email（外部的仍是號碼或 Email），反而干擾。建議依資料類型決定：NT accounts、Employee IDs 顯示姓名，其他顯示輸入的值。">
          <SpecTable head={['資料類型', '找到的標籤顯示', '滑過顯示', '為什麼']} nowrap={[0]} rows={[
            ['NT accounts', '大頭照、英文名 中文名', 'NT 帳號 · 組織', '帳號、工號是代碼，看不出對不對；找到的一定是人，名單不會混雜'],
            ['Employee IDs', '大頭照、英文名 中文名', '工號 · 組織', '同上'],
            ['Emails', '輸入的 Email', '不顯示（11/20）', 'Email 本身看得懂；名單裡有員工也有外部信箱，都顯示 Email 比較一致'],
            ['Phone numbers', '輸入的號碼（整理成同一種格式）', '不顯示（11/20），共用號碼也是', '號碼本身就是要寄的地方；名單裡有員工、外部號碼、共用號碼'],
            ['MVPN', '輸入的 MVPN', '不顯示（11/20）', '同 Phone numbers'],
            ['Org IDs', '組織代號', '組織名稱 · 人數', '代號就是組織的名字'],
          ]} />
          <Notes items={[
            { title: '打字時的選單', body: '不論哪種類型，選單都有大頭照與姓名，幫使用者挑對人；選了之後，標籤照上表顯示。' },
            { title: '加入之後', body: '收件人表格照常顯示人名與大頭照。' },
            { title: '比較', body: '上方的切換可以把五個示範一起換成「都是輸入的值」或「都是姓名」比較。' },
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
            ['A（11/19 的建議）', '變回純文字', '新加入的紅色排到最前面', '原地變灰色、閃一下綠框', '要處理的在最前面；已經在畫面上的不動'],
            ['B', '變回純文字', '照輸入順序（散在各處）', '原地變灰色、閃一下綠框', '靠 Next to fix 跳到下一筆'],
            ['C', '變回純文字', '同 A', '同 A；Enter 直接改下一筆', '同 A，鍵盤可以一路改完'],
            ['D（11/20 的建議）', '變回純文字', '照輸入順序；說明文字寫幾筆 invalid', '原地變灰色、閃一下綠框', '點「m invalid」只看紅色'],
            ['E（建議，11/23）', '變回純文字', '照輸入順序；格式錯的馬上紅，後端查不到的按 Proceed 後才紅', '同 D', '同 D；驗證後改過的只重驗那幾筆'],
          ]} />
          <Notes items={[
            { title: '建議 D（2026-11-20）', body: '不排序，標籤和使用者的原始清單同一個順序；說明文字直接寫幾筆 invalid，名單長時點「m invalid」只看有問題的。修好的留在原地、再貼一批接在最後，都不需要另外的規則。見上面「要不要把紅色排到最前面」。' },
            { title: 'A（11/19 的建議）', body: '保留「要處理的在最前面」，又不會讓剛改好的標籤消失：排序只發生在名單「進來」的那一刻（貼上、按 Enter、輸入逗號），修改不會觸發排序。修好的標籤在原地變灰並閃一下綠框，使用者看得到結果。之後再貼上一批，也只安排新進來的：新的紅色放最前面、新的灰色接在最後，已經在畫面上的標籤順序不變。' },
            { title: '要不要加 C', body: 'C 的 Enter 接著改下一筆，對一次要修十幾筆的人很快；但只改一兩筆的人可能會被突然打開的下一筆嚇到。可以先上 D，看使用者測試再決定要不要加。' },
            { title: 'B 的取捨', body: 'B 完全不動順序，最容易預期；但紅色散在名單各處，名單很長時要靠 Next to fix，多一個要學的東西，也會讓「n to fix」的數字回到畫面上（之前拿掉過總結標籤）。' },
          ]} />
        </Section>

        <Section eyebrow="Spec" title="A 的規格（若採用）">
          <SpecTable head={['項目', '規格']} nowrap={[0]} rows={[
            ['修改', '點任何標籤（或聚焦後 Enter／Space），標籤變回純文字：沒有外框、沒有底色，字的大小、位置和標籤裡的字相同，游標在字的最後面，寬度跟著字變長。內容是原本輸入的值（例如 NT 帳號，不是姓名）。'],
            ['結束修改', 'Enter 或點別處：重新比對，變回標籤；Esc：取消修改；把字刪光再結束：移除這一筆。'],
            ['順序', '貼上、Enter、逗號把新的值加進來時，只安排新進來的：找不到的（紅色）放在名單最前面，找到的（灰色）接在最後，各自保持輸入順序；已經在名單裡的標籤（包括還沒修的紅色和修好的灰色）順序不變。有新的紅色時，名單捲回最上方。修改、移除不重新排序。'],
            ['改成重複的', '改完發現和名單裡已經有的相同（同一個 NT 帳號、工號、同一支號碼）：這一筆移除，名單裡原本那個標籤閃一下綠框，畫面捲到它。'],
            ['修好之後', '標籤留在原地，變成灰色，外圍閃一下細的綠框（不到 1 秒）；游標回到名單最後面但畫面不捲動，標籤上不出現藍色焦點框。改了還是找不到：仍是紅色、留在原地，原因更新。'],
            ['說明文字', '不變：{n} valid audiences. Click a tag to edit it.'],
          ]} />
        </Section>

        <Section eyebrow="Phone" title="Phone numbers 加地區">
          <SpecTable head={['項目', '規格']} nowrap={[0]} rows={[
            ['地區', 'Data type 選 Phone numbers 時，旁邊多一個 Region 選單：+886 (TW)（預設）、+1 (US)、+81 (JP)、+86 (CN)，和收件人搜尋的地區一樣。'],
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
