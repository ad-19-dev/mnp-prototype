// Batch import lookups, shared by the tag study (spec/importtags) and the prototype's Batch import (components/BatchImport,
// 2026-11-23): what an entry of each data type is (a person, a number, an org, an outside contact, or why not), the
// suggestions while typing, and the format check done in the browser at once.
import * as React from 'react'
import { cn } from '@qijenchen/design-system'
import { Building2, Mail, Phone } from 'lucide-react'
import { REGIONS, type Region } from './RecvInput'
import { PAvatar, pname } from './ui'
import { DOMAIN, ORGS, PEOPLE, PMAP, fmtExtPhone, matchAs, type ListKind, type Person, type Tag as RTag } from '../lib/data'

// label: the person's name (or the org, the number); val: the value as entered, formatted; who: shown on hover;
// tag: what is added to the audience (a person, an org, or an outside contact: the number or address itself)
export type Ok = { key: string; label: string; val: string; who?: string; p?: string; icon?: typeof Mail; shared?: string[]; tag: RTag }
// the prototype's channels: outside addresses need Email, outside numbers need SMS fallback (the study allows both)
export type LookOpts = { noExtEmail?: boolean; noExtPhone?: boolean }
const NO_EXT_PHONE = 'SMS fallback isn’t a selected channel'

// ---------- numbers: who they belong to ----------
// A person can have several company mobiles or MVPNs; one number can belong to several people (an on-call phone).
// The prototype's people have one of each, so this demo adds: a second company mobile for Jimmy Chen, and an ESH
// on-call mobile and MVPN shared by three people.
const EXTRA_CO: Record<string, string[]> = { p02: ['0918555210'] }
const SHARED_CO: Record<string, string[]> = { '0919000119': ['p13', 'p19', 'p07'] }
const EXTRA_MVPN: Record<string, string[]> = { p02: ['8860218'] }
const SHARED_MVPN: Record<string, string[]> = { '8861119': ['p13', 'p19', 'p07'] }
export type Num = { n: string; what: 'co' | 'pp' | 'mvpn'; owners: string[] }
export const STAFF = PEOPLE.filter(p => !p.extKind && !p.gen)
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
export const PHONES = dir('phone'), MVPNS = dir('mvpn')
const showNum = (x: Num) => (x.what === 'mvpn' ? 'MVPN ' + x.n : fmtExtPhone(x.n))
const whatName = (x: Num) => (x.what === 'co' ? 'Company mobile' : x.what === 'pp' ? 'Personal phone' : 'MVPN')
// one owner: that person, with SMS going to this number. Several: the number itself (one SMS to the shared
// phone), unless a person was picked from the dropdown.
function byNumber(x: Num, pin?: string, opts?: LookOpts): Ok | string {
  const one = pin && pin !== '#' && x.owners.indexOf(pin) >= 0 ? pin : x.owners.length === 1 ? x.owners[0] : null
  const val = x.what === 'mvpn' ? x.n : fmtExtPhone(x.n)
  // keyed by the number: two numbers of one person are two entries, an SMS to each (2026-11-19)
  if (one) { const p = PMAP[one]; return { key: 'n:' + x.n, label: pname(p) + ' · ' + showNum(x), val, who: pname(p) + ' · ' + p.org + ' · ' + whatName(x) + (x.owners.length > 1 ? ' (shared)' : ''), p: one, tag: { key: 'p:' + one, type: 'person', id: one } } }
  // the shared number itself: an outside-style number (SMS only)
  if (opts && opts.noExtPhone) return NO_EXT_PHONE
  return { tag: { key: 'e:' + showNum(x), type: 'ext', email: showNum(x) }, key: 'n:' + x.n, label: showNum(x) + ' · Shared by ' + x.owners.length, val, who: 'Shared by ' + x.owners.map(id => pname(PMAP[id])).join(', ') + '. One SMS goes to this number.', icon: Phone, shared: x.owners }
}

// phone numbers: by the chosen region, or by their own +code
function matchPhone(v: string, region: Region, pin?: string, opts?: LookOpts): Ok | string {
  const t = v.trim(), d = t.replace(/\D/g, '')
  const byCode = t.startsWith('+') ? REGIONS.find(r => d.startsWith(r.code.slice(1))) : undefined
  if (t.startsWith('+') && !byCode) return 'Only TW, US, JP and CN numbers'
  const R = byCode || REGIONS.find(r => r.v === region)!, n = R.norm(byCode ? d.slice(R.code.length - 1) : d)
  if (!n) return R.err.replace(/\.$/, '')
  if (R.v === 'TW') { const x = PHONES.find(y => y.n === n); if (x) return byNumber(x, pin, opts) }
  if (opts && opts.noExtPhone) return NO_EXT_PHONE
  const shown = R.v === 'TW' ? fmtExtPhone(n) : n
  return { tag: { key: 'e:' + shown, type: 'ext', email: shown }, key: 'e:' + shown, label: shown, val: shown, who: 'Outside number', icon: Phone }
}
export function look(kind: ListKind, region: Region, v: string, pin?: string, opts?: LookOpts): Ok | string {
  if (kind === 'phone') return matchPhone(v, region, pin, opts)
  if (kind === 'mvpn') { const d = v.trim(); const x = MVPNS.find(y => y.n === d); return x ? byNumber(x, pin, opts) : /^\d+$/.test(d) ? 'No one uses this MVPN' : 'Not an MVPN' }
  const mm = matchAs(v, kind, { allowExt: true, noExtEmail: opts && opts.noExtEmail })
  if (mm.kind === 'one') return { tag: { key: 'p:' + mm.p.id, type: 'person', id: mm.p.id }, key: 'p:' + mm.p.id, label: pname(mm.p), val: v.trim(), who: pname(mm.p) + ' · ' + mm.p.org, p: mm.p.id }
  if (mm.kind === 'org') return { tag: { key: 'o:' + mm.org.code, type: 'org', id: mm.org.code }, key: 'o:' + mm.org.code, label: mm.org.code, val: mm.org.code, who: mm.org.name + ' · ' + mm.org.count + ' people', icon: Building2 }
  if (mm.kind === 'ext') return { tag: { key: 'e:' + mm.email, type: 'ext', email: mm.email }, key: 'e:' + mm.email, label: mm.email, val: mm.email, who: 'Outside email', icon: Mail }
  return mm.kind === 'miss' ? mm.why : 'More than one match'
}

// suggestions while typing (2026-11-19): the people (or orgs) the typed text could be, for the data types that point
// at someone. Picking one adds the value of that data type (an NT account, an employee ID…), not the name.
//   NT accounts: NT account starts with it, or the name has it · Employee IDs: starts with it (2+ digits)
//   Emails: company addresses only (the part before @) · Org IDs: orgs (code or name)
//   Phone numbers (TW, 4+ digits) / MVPN (2+ digits): every number that has it; a number with one owner is that
//   person; a shared one is offered as the number itself first, then each person on it
export type Sug = { value: string; pin?: string; p?: Person; org?: typeof ORGS[number]; shared?: string[]; sub: string }
export function suggest(kind: ListKind, region: Region, q: string, taken: (v: string, pin?: string) => boolean): Sug[] {
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


export function fmtErr(kind: ListKind | null, v: string): string {
  const t = v.trim(), d = t.replace(/\D/g, '')
  if (kind === 'nt') return /^[a-z][a-z0-9]{1,19}$/i.test(t) ? '' : 'Not an NT account format'
  if (kind === 'emp') return /^\d{6}$/.test(t) ? '' : 'An employee ID is 6 digits'
  if (kind === 'email') return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t) ? '' : 'Not an email address'
  if (kind === 'mvpn') return /^\d{7}$/.test(t) ? '' : 'An MVPN is 7 digits'
  if (kind === 'org') return /^[a-z0-9]{2,8}$/i.test(t) ? '' : 'Not an Org ID format'
  if (kind === 'phone') return (t.startsWith('+') ? d.length >= 8 && d.length <= 15 : /^(09\d{8}|8869\d{8}|9\d{8})$/.test(d)) ? '' : 'Not a mobile number format'
  return ''
}

// the dropdown under the field being typed in (the list's input, or a tag being edited)
export function SugList({ sugs, hi, setHi, onPick }: { sugs: Sug[]; hi: number; setHi: (i: number) => void; onPick: (x: Sug) => void }) {
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
