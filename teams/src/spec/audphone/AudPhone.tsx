// Audience by phone number, email or MVPN (2026-11-20): what the dropdown offers and what the Audience table shows for
// each case: an employee's number, one person with two numbers, a number several people share (an on-call phone), an
// outside number, a company or outside email, an MVPN. A live demo with the prototype's sample people, plus a few
// numbers added for the cases (Jimmy Chen's second company mobile; an ESH on-call mobile and MVPN shared by three).
// Nothing here changes the prototype.
import * as React from 'react'
import { Button, DataTable, Input, PersonDisplay, Popover, PopoverAnchor, PopoverContent, Select, Tag, cn } from '@qijenchen/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { Mail, Phone, Smartphone, X } from 'lucide-react'
import { Notes, Section, SpecTable } from '../parts'
import { NO_HIDE, PAvatar, personVal, pname } from '../../components/ui'
import { DOMAIN, PEOPLE, PMAP, fmtExtPhone, type Person } from '../../lib/data'

// ---------- who each number belongs to ----------
const STAFF = PEOPLE.filter(p => !p.extKind && !p.gen)
const EXTRA_CO: Record<string, string[]> = { p02: ['0918555210'] }
const SHARED_CO: Record<string, string[]> = { '0919000119': ['p13', 'p19', 'p07'] }
const SHARED_MVPN: Record<string, string[]> = { '8861119': ['p13', 'p19', 'p07'] }
type What = 'co' | 'pp' | 'mvpn'
type Num = { n: string; what: What; owners: string[] }
function dir(kind: 'phone' | 'mvpn'): Record<string, Num> {
  const m: Record<string, Num> = {}
  const add = (n: string, what: What, pid: string) => { if (n) (m[n] = m[n] || { n, what, owners: [] }).owners.push(pid) }
  STAFF.forEach(p => {
    if (kind === 'phone') { add(p.co, 'co', p.id); add(p.pp, 'pp', p.id); (EXTRA_CO[p.id] || []).forEach(n => add(n, 'co', p.id)) }
    else add(p.mvpn, 'mvpn', p.id)
  })
  Object.entries(kind === 'phone' ? SHARED_CO : SHARED_MVPN).forEach(([n, ps]) => ps.forEach(pid => add(n, kind === 'phone' ? 'co' : 'mvpn', pid)))
  return m
}
const PHONES = dir('phone'), MVPNS = dir('mvpn')
const whatName = (w: What) => (w === 'co' ? 'Company mobile' : w === 'pp' ? 'Personal phone' : 'MVPN')
const showNum = (n: string, w: What) => (w === 'mvpn' ? 'MVPN ' + n : fmtExtPhone(n))

// ---------- what gets added ----------
type Kind = 'phone' | 'email' | 'mvpn'
// a row in the Audience table: a person, a shared number itself, or an outside number / email
type Row = { key: string; pid?: string; shared?: string[]; ext?: 'phone' | 'email'; label: string; via: string; viaNote: string }
type Opt = { row: Row; p?: Person; title: string; sub: string; indent?: boolean }

function options(kind: Kind, q: string): { opts: Opt[]; err: string } {
  const t = q.trim(), low = t.toLowerCase()
  if (!t) return { opts: [], err: '' }
  const person = (pid: string, via: string, viaNote: string, sub: string, indent?: boolean): Opt =>
    ({ row: { key: 'p:' + pid + ':' + via, pid, label: pname(PMAP[pid]), via, viaNote }, p: PMAP[pid], title: pname(PMAP[pid]), sub, indent })
  const byNum = (x: Num): Opt[] => {
    const v = showNum(x.n, x.what)
    if (x.owners.length === 1) return [person(x.owners[0], v, whatName(x.what), v + ' · ' + whatName(x.what))]
    const names = x.owners.map(id => PMAP[id].en).join(', ')
    return ([{ row: { key: 'n:' + x.n, shared: x.owners, label: v, via: v, viaNote: 'Shared by ' + x.owners.length }, title: v + ' (shared)', sub: 'Shared by ' + names }] as Opt[])
      .concat(x.owners.map(id => person(id, v, whatName(x.what) + ' (shared)', v + ' · only this person', true)))
  }
  if (kind === 'phone') {
    let d = t.replace(/\D/g, ''); if (d.startsWith('886')) d = '0' + d.slice(3)
    if (!/^09\d{8}$/.test(d)) return { opts: [], err: 'Enter a full Taiwan mobile number, e.g. 0918-226-588.' }
    const x = PHONES[d]
    if (x) return { opts: byNum(x), err: '' }
    const v = fmtExtPhone(d)
    return { opts: [{ row: { key: 'x:' + d, ext: 'phone', label: v, via: v, viaNote: 'Outside number' }, title: v, sub: 'Outside number · SMS only' }], err: '' }
  }
  if (kind === 'mvpn') {
    if (!/^\d{7}$/.test(t)) return { opts: [], err: 'Enter a 7-digit MVPN.' }
    const x = MVPNS[t]
    return x ? { opts: byNum(x), err: '' } : { opts: [], err: 'No one uses this MVPN.' }
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t)) return { opts: [], err: 'Enter a full email address.' }
  const [a, b] = low.split('@')
  if (b === DOMAIN) {
    const p = STAFF.find(x => x.nt === a)
    return p ? { opts: [person(p.id, low, 'Company email', low + ' · Company email')], err: '' } : { opts: [], err: 'No employee has this address.' }
  }
  return { opts: [{ row: { key: 'e:' + low, ext: 'email', label: low, via: low, viaNote: 'Outside email' }, title: low, sub: 'Outside email · Email only' }], err: '' }
}

const KINDS: { v: Kind; label: string; ph: string }[] = [
  { v: 'phone', label: 'Phone', ph: 'e.g. 0918-226-588' },
  { v: 'email', label: 'Email', ph: 'e.g. gywu@tsmc.com' },
  { v: 'mvpn', label: 'MVPN', ph: 'e.g. 8861119' },
]

const col = createColumnHelper<Row>()

// the live demo: type, input with the dropdown, and the Audience table
function Demo({ preset }: { preset: { kind: Kind; q: string; n: number } | null }) {
  const [kind, setKind] = React.useState<Kind>('phone'), [q, setQ] = React.useState(''), [hi, setHi] = React.useState(0), [open, setOpen] = React.useState(false)
  const [rows, setRows] = React.useState<Row[]>([])
  const [mem, setMem] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => { if (preset) { setKind(preset.kind); setQ(preset.q); setHi(0); setOpen(true); setTimeout(() => inputRef.current?.focus(), 0) } }, [preset])
  const { opts, err } = options(kind, q)
  const added = (r: Row) => rows.some(x => x.key === r.key)
  const add = (o: Opt) => { if (added(o.row)) return; setRows(l => l.concat(o.row)); setQ(''); setOpen(false); inputRef.current?.focus() }

  const cols = React.useMemo(() => [
    col.display({ id: 'who', header: 'Audience', meta: { width: 320 }, cell: i => {
      const r = i.row.original
      if (r.pid) return <PersonDisplay value={personVal(PMAP[r.pid])} />
      return (
        <span className="flex min-w-0 items-center gap-2">
          <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">{r.ext === 'email' ? <Mail className="size-3.5 text-fg-secondary" aria-hidden /> : <Phone className="size-3.5 text-fg-secondary" aria-hidden />}</span>
          <span className="truncate text-body">{r.label}</span>
          <Tag size="sm" color="neutral">{r.ext === 'email' ? 'Email' : r.shared ? 'Shared phone' : 'Phone'}</Tag>
          {r.shared ? (
            <Popover open={mem === r.key} onOpenChange={o => setMem(o ? r.key : null)}>
              <PopoverAnchor asChild><Button variant="link" size="sm" className="!h-auto !min-w-0 shrink-0 !p-0" onClick={() => setMem(mem === r.key ? null : r.key)}>{r.shared.length} people</Button></PopoverAnchor>
              <PopoverContent align="start" className="w-72 p-2">
                <div className="flex flex-col gap-2">{r.shared.map(id => <PersonDisplay key={id} value={personVal(PMAP[id])} />)}</div>
              </PopoverContent>
            </Popover>
          ) : null}
        </span>
      )
    } }),
    col.display({ id: 'via', header: 'Added with', meta: { width: 260 }, cell: i => {
      const r = i.row.original
      return <span className="flex min-w-0 items-baseline gap-2"><span className="truncate text-body">{r.via}</span><span className="shrink-0 text-caption text-fg-secondary">{r.viaNote}</span></span>
    } }),
  ], [mem])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-[var(--layout-space-tight)] rounded-lg border border-divider bg-surface p-[var(--layout-space-loose)]">
        <span className="text-body font-medium">Audience</span>
        <div className="flex flex-wrap items-start gap-2">
          <div className="w-32 shrink-0"><Select aria-label="Audience type" value={kind} options={KINDS.map(k => ({ value: k.v, label: k.label }))} onChange={v => { setKind(v as Kind); setQ(''); setTimeout(() => inputRef.current?.focus(), 0) }} /></div>
          <Popover open={open && !!q.trim() && (opts.length > 0 || !!err)} onOpenChange={o => { if (!o) setOpen(false) }}>
            <PopoverAnchor asChild>
              <div className="min-w-0 flex-1">
                <Input ref={inputRef} startIcon={kind === 'email' ? Mail : Smartphone} value={q} placeholder={KINDS.find(k => k.v === kind)!.ph} aria-label="Add audience"
                  onChange={e => { setQ(e.target.value); setHi(0); setOpen(true) }} onFocus={() => setOpen(true)}
                  onKeyDown={e => {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(i => Math.min(i + 1, opts.length - 1)) }
                    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(i => Math.max(i - 1, 0)) }
                    else if (e.key === 'Enter' && opts.length) { e.preventDefault(); add(opts[Math.min(hi, opts.length - 1)]) }
                    else if (e.key === 'Escape') setOpen(false)
                  }} />
              </div>
            </PopoverAnchor>
            <PopoverContent align="start" sideOffset={6} className="w-[var(--radix-popover-trigger-width)] min-w-96 p-1" onOpenAutoFocus={e => e.preventDefault()}>
              {err ? <div className="px-2 py-1.5 text-body text-error-text">{err}</div> : (
                <div role="listbox" aria-label="Matches">
                  {opts.map((o, i) => (
                    <button key={o.row.key} type="button" role="option" aria-selected={i === hi} disabled={added(o.row)} onMouseDown={e => e.preventDefault()} onMouseEnter={() => setHi(i)} onClick={() => add(o)}
                      className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left disabled:opacity-50', i === hi && 'bg-neutral-hover', o.indent && 'pl-6')}>
                      {o.p ? <PAvatar p={o.p} size={24} /> : <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">{o.row.ext === 'email' ? <Mail className="size-3.5 text-fg-secondary" aria-hidden /> : <Phone className="size-3.5 text-fg-secondary" aria-hidden />}</span>}
                      <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-body">{o.title}</span><span className="truncate text-caption text-fg-secondary">{o.sub}</span></span>
                      {added(o.row) ? <span className="text-caption text-fg-secondary">Added</span> : null}
                    </button>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
        {rows.length ? (
          <DataTable tableOptions={NO_HIDE} columns={cols as any} data={rows} bordered getRowId={x => x.key}
            rowActions={(r: Row) => <Button variant="text" size="xs" iconOnly startIcon={X} aria-label={'Remove ' + r.label} onClick={() => setRows(l => l.filter(x => x.key !== r.key))} />} />
        ) : <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-body text-fg-secondary">No audience yet</div>}
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border px-3 py-2">
        <span className="text-caption font-medium text-fg-secondary">示範用</span>
        <Button variant="tertiary" size="sm" disabled={!rows.length} onClick={() => setRows([])}>Clear</Button>
        <span className="text-caption text-fg-secondary">點下表的例子會填進輸入框；按 Enter 加入第一個選項，或用 ↑↓ 選別的。</span>
      </div>
    </div>
  )
}

export default function AudPhone() {
  const [preset, setPreset] = React.useState<{ kind: Kind; q: string; n: number } | null>(null), n = React.useRef(0)
  const ex = (kind: Kind, q: string) => <Button variant="link" size="sm" className="!h-auto !min-w-0 !p-0" onClick={() => { setPreset({ kind, q, n: ++n.current }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>{q}</Button>
  return (
    <div className="tw">
      <div className="spec-top">
        <div className="spec-wrap flex flex-col gap-1 pt-4 pb-3">
          <span className="spec-eyebrow">MNP · New message · Audience</span>
          <h1 className="spec-h1">用電話、Email、MVPN 加收件人</h1>
          <span className="tw-sub">2026/11/20 · 範例，用原型的範例資料；不影響原型</span>
        </div>
      </div>
      <main className="spec-wrap spec-main">
        <Section eyebrow="Try" title="先試試">
          <Demo preset={preset} />
        </Section>

        <Section eyebrow="Answer" title="打員工的手機，出現的是他還是號碼？">
          <div className="spec-callout">出現<b>他</b>：選單和表格都是大頭照與姓名，旁邊的 Added with 顯示你打的號碼，SMS 寄到這支。只有多人共用的號碼和外部號碼，才以號碼本身出現。</div>
          <Notes cols items={[
            { title: '為什麼是人', body: '加入的是這個人：他也會收到 App 推播、Desktop、Email，不只是 SMS。表格其他地方（組織、人數、各通道涵蓋）也都以人計算。' },
            { title: '為什麼還要顯示號碼', body: '使用者給的是號碼，就是要寄到這一支，不是系統預設的那支；一個人有兩支時，也看得出加的是哪一支。' },
          ]} />
        </Section>

        <Section eyebrow="Cases" title="各種情況" lead="點例子會填進上面的輸入框。">
          <SpecTable head={['情況', '例子', '選單', '表格', '寄到']} nowrap={[0, 1]} rows={[
            ['員工的公務手機', ex('phone', '0918-226-588'), 'Grace Wu（0918-226-588 · Company mobile）', 'Grace Wu；Added with 0918-226-588', 'SMS 寄到這支'],
            ['員工的私人手機', ex('phone', '0912-337-415'), 'Grace Wu（Personal phone）', 'Grace Wu；Added with 0912-337-415', 'SMS 寄到這支'],
            ['一人兩支', <span className="flex flex-col">{ex('phone', '0918-103-217')}{ex('phone', '0918-555-210')}</span>, '各自是 Jimmy Chen', '兩列 Jimmy Chen，各自的號碼', '兩支都寄'],
            ['多人共用（值班機）', ex('phone', '0919-000-119'), '第一項是號碼本身（Shared by 3），下面是三個人', '預設：一列號碼本身，標 Shared phone，點 3 people 看是誰', '只寄一封到這支'],
            ['共用號碼，只要某一人', ex('phone', '0919-000-119'), '用 ↓ 選其中一人', '那個人；Added with 0919-000-119（shared）', 'SMS 寄到這支'],
            ['外部號碼', ex('phone', '0987-654-321'), '號碼本身（Outside number）', '一列號碼，標 Phone', 'SMS 寄到這支'],
            ['公司 Email', ex('email', 'gywu@tsmc.com'), 'Grace Wu（Company email）', 'Grace Wu；Added with gywu@tsmc.com', '和選人相同'],
            ['外部 Email', ex('email', 'partner@vendor.com'), 'Email 本身（Outside email）', '一列 Email，標 Email', 'Email 寄到這個信箱'],
            ['共用 MVPN', ex('mvpn', '8861119'), '同共用號碼', '同共用號碼', '同共用號碼'],
          ]} />
          <Notes cols items={[
            { title: '同一個人加兩次', body: '用不同號碼加，就是兩列，兩支都寄；用同一支號碼再加一次，選單顯示 Added，不能再加。' },
            { title: '待工程確認', body: '「用號碼加入就寄到那一支」需要後端記住每位收件人指定的號碼；舊系統是從公務手機中挑一支。' },
          ]} />
        </Section>
      </main>
    </div>
  )
}
