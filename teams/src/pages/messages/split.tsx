// "One record per channel" version of the messages list and details (build mode `split`, see vite.config.ts).
// The send flow doesn't change: a sender still picks several channels in one go. The list then shows one row
// per channel, each with that channel's own text, status and audience count, so a row never has to merge
// several channels' numbers (and the backend never has to intersect their audiences).
// Actions that change the message itself (edit, delete, reschedule, send now, duplicate) still act on the
// whole message, on every channel; the dialogs say so.
import * as React from 'react'
import {
  Button, DataTable, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Empty, Input,
  DescriptionList, DescriptionItem, PersonDisplay, Accordion, AccordionContent, AccordionItem, AccordionTrigger, Pagination, Tag, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@qijenchen/design-system'
import { createColumnHelper, type SortingState } from '@tanstack/react-table'
import { CalendarClock, ChevronRight, CornerDownRight, CircleAlert, Copy, ExternalLink, Info, MoreVertical, Pencil, Plus, RotateCw, Search, Send, Trash2 } from 'lucide-react'
import {
  CH_ORDER, ICSD, PEOPLE, PMAP, STATUS_ORDER, audToTags, chFailList, fmtN, htmlToText, isExtPhone, reqIdFor, rowChs,
  type Channel, type Row, type Status, type Tag as RTag,
} from '../../lib/data'
import { flash, useApp } from '../../lib/store'
import { Banner, CHN, ChIcons, FilterMenu, personVal, NO_HIDE, PAvatar, PageSize, StatusTag, Tip, Trunc, Two } from '../../components/ui'
import { ShellAside } from '../../components/shell'
import { L, tx } from '../../lib/i18n'
import { type SendCtl } from './ctl'
import { ListLoading, dedupe } from './List'
import './split.css'
import { AudienceList, ChannelText, Part, failCols, reviewer } from './Detail'

// ---------- records ----------
// One record per channel of a message. SMS fallback isn't a record of its own: a message sent with it is one
// "Device Notifications (SMS)" record (k = 'sms'), a message without it a "Device Notifications" record (k = 'push').
// Either way the record holds the Device Notifications numbers (ok / of / unk / pst) and, when SMS fallback was on,
// the fallback's own (fb). st is the one status the list shows for the record.
export interface Part { ok: number; of: number; unk?: boolean; st: Status }
// pst: Device Notifications' own status (st also counts the fallback)
export interface Rec extends Part { id: string; r: Row; k: Channel; fb?: Part; pst: Status }
const recId = (r: Row, k: Channel) => r.id + '~' + k
// the channels as records, in order: Device Notifications (with or without SMS), Desktop OS, Email
export const REC_ORDER: Channel[] = ['push', 'sms', 'desktop', 'email']
export const recKinds = (r: Row): Channel[] => REC_ORDER.filter(k => (k === 'push' ? r.channels.indexOf('push') >= 0 && !r.sms : k === 'sms' ? !!r.sms : r.channels.indexOf(k) >= 0))
export function recordsOf(m: SendCtl, rows: Row[]): Rec[] {
  const out: Rec[] = []
  rows.forEach(r => {
    const part = (k: Channel): Part | null => {
      const x = m.chStats(r).find(y => y.k === k)
      if (!x) return null
      const p: Part = { ok: x.ok, of: x.of, st: r.status }
      // SMS without its own numbers: known only once Device Notifications has finished
      if (k === 'sms' && !(r.byCh && r.byCh.sms)) {
        if (r.status === 'sent') { p.of = Math.max(0, r.total - r.ok); p.ok = p.of } else { p.unk = true; p.ok = 0; p.of = 0 }
      }
      if (r.chSt && r.chSt[k]) p.st = r.chSt[k]!
      else if (r.status === 'progress' && !p.unk && k !== 'sms' && p.ok >= p.of) p.st = 'sent'
      return p
    }
    recKinds(r).forEach(k => {
      const main = part(k === 'sms' ? 'push' : k) || { ok: 0, of: 0, st: r.status } as Part, fb = k === 'sms' ? part('sms') || undefined : undefined
      const all = fb ? [main, fb] : [main]
      // one status for the record: still sending if either part is, failed if either failed, else Device Notifications' own
      const st: Status = all.some(x => x.st === 'progress') ? 'progress' : all.some(x => x.st === 'error') ? 'error' : main.st
      out.push({ id: recId(r, k), r, k, ok: main.ok, of: main.of, unk: main.unk, st, fb, pst: main.st })
    })
  })
  return out
}
// a record from its id ("m154~email"); a bare message id opens its first channel
export function recordById(m: SendCtl, rows: Row[], id: string | null): Rec | null {
  if (!id) return null
  const [mid, k] = id.split('~') as [string, Channel | undefined], r = rows.find(x => x.id === mid)
  if (!r) return null
  const all = recordsOf(m, [r])
  return all.find(x => x.k === k) || all[0] || null
}
// People it failed for: with SMS fallback, only those SMS didn't reach either (it goes to everyone Device Notifications missed)
const done = (st: Status) => st === 'sent' || st === 'error'
const failsOf = (x: Rec) => (x.fb ? (!x.fb.unk && done(x.st) ? Math.max(0, x.fb.of - x.fb.ok) : 0) : !x.unk && done(x.st) ? Math.max(0, x.of - x.ok) : 0)
export const chName = (k: Channel) => CHN[k].name

// the channel's own words: Desktop OS has its own text; Email its subject and body; SMS has no title
export function recText(r: Row, k: Channel) {
  // "Device Notifications (SMS)" shows the Device Notifications text; the SMS text is in its details
  if (k === 'email' && r.email && r.email.mode === 'own') return { title: r.email.subject || r.title, content: htmlToText(r.email.html) || r.content }
  if (k === 'desktop' && r.desk) return { title: r.desk.title, content: r.desk.content }
  return dedupe(r.title, r.content)
}
// only Device Notifications and Desktop OS carry a sender name
const recSender = (r: Row, k: Channel) => (k === 'push' || k === 'sms' ? r.sender : k === 'desktop' ? (r.desk ? r.desk.sender : r.sender) : '')

// the channel as icons only; its name is in the tooltip and the accessible label
function ChCell({ k }: { k: Channel }) {
  const I = CHN[k === 'sms' ? 'push' : k].icon
  return (
    <Tip text={chName(k)}>
      <span tabIndex={0} aria-label={chName(k)} className="inline-flex items-center gap-1 rounded-sm focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]">
        <Tag size="sm" color="neutral" icon={I} aria-hidden className="[&_[data-tag-text]]:hidden" />
        {k === 'sms' ? <Tag size="sm" color="neutral" icon={CHN.sms.icon} aria-hidden className="[&_[data-tag-text]]:hidden" /> : null}
      </span>
    </Tip>
  )
}

// ---------- whole-message actions, worded for every channel ----------
const chList = (r: Row) => recKinds(r).map(chName).join(L(', ', '、'))
const allNote = (r: Row) => (recKinds(r).length > 1 ? L(' This applies to all ' + recKinds(r).length + ' channels: ' + chList(r) + '.', '會套用到全部 ' + recKinds(r).length + ' 個通道：' + chList(r) + '。') : '')
function askDelete(m: SendCtl, r: Row) {
  const n = recKinds(r).length
  m.set({ cf: { title: L('Delete this message?', '要刪除這則訊息嗎？'), text: L('“' + r.title + '” won’t be sent' + (n > 1 ? ' on any of its ' + n + ' channels (' + chList(r) + ')' : '') + ', and ' + (n > 1 ? 'its ' + n + ' records are' : 'it’s') + ' removed from the list. This can’t be undone.', '「' + r.title + '」' + (n > 1 ? '的 ' + n + ' 個通道（' + chList(r) + '）都' : '') + '不會送出，' + (n > 1 ? '這 ' + n + ' 筆紀錄' : '') + '也會從列表移除，無法復原。'), icon: Trash2, tone: 'err', cancel: L('Keep', '保留'), ok: L('Delete', '刪除'), danger: true, run: () => m.deleteRow(r.id) } })
}
function askSendNow(m: SendCtl, r: Row) {
  m.set({ cf: { title: L('Send it now?', '要立即傳送嗎？'), text: (r.sched ? L('It goes out right away instead of at ' + r.sched + '. It’s already approved.', '會立刻送出，不再等原訂的 ' + r.sched + '。這則訊息已經核准。') : L('It goes out right away. It’s already approved.', '會立刻送出。這則訊息已經核准。')) + allNote(r), icon: Send, tone: 'info', cancel: L('Not now', '先不要'), ok: L('Send now', '立即傳送'), run: () => m.sendNow(r.id) } })
}

// lite: a channel row under its message row, where the message row holds the whole-message actions
function RecMenu({ m, x, lite }: { m: SendCtl; x: Rec; lite?: boolean }) {
  const r = x.r
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="text" size="xs" iconOnly startIcon={MoreVertical} aria-label={L('Actions for ', '操作：') + recText(r, x.k).title} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" minWidth={232}>
        <DropdownMenuItem startIcon={Info} onSelect={() => m.set({ det: x.id.endsWith('~msg') ? r.id : x.id })}>{L('View details', '查看詳情')}</DropdownMenuItem>
        {lite ? null : <>
        {r.status === 'expired' || r.status === 'rejected' ? <DropdownMenuItem startIcon={Pencil} onSelect={() => m.startCompose('edit', r)}>{L('Edit', '編輯')}</DropdownMenuItem> : null}
        {r.status === 'expired' || r.status === 'error' ? <>
          <DropdownMenuItem startIcon={Send} onSelect={() => askSendNow(m, r)}>{L('Send now', '立即傳送')}</DropdownMenuItem>
          <DropdownMenuItem startIcon={CalendarClock} onSelect={() => m.openReschedule(r)}>{L('Reschedule', '重新排程')}</DropdownMenuItem>
        </> : null}
        <DropdownMenuItem startIcon={Copy} onSelect={() => m.startCompose('duplicate', r)}>{L('Duplicate to new message', '複製為新訊息')}</DropdownMenuItem>
        {r.status === 'expired' || r.status === 'rejected' || r.status === 'error' ? <>
          <DropdownMenuSeparator />
          <DropdownMenuItem startIcon={Trash2} className="text-error-text" onSelect={() => askDelete(m, r)}>{L('Delete', '刪除')}</DropdownMenuItem>
        </> : null}
        </>}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// the record's count: delivered / audience on this channel only
// Audience: how many people this channel goes to, nothing more (decided with PM 2026-11-05). SMS fallback's
// number is known only once Device Notifications has gone out.
function AudienceN({ x }: { x: Rec }) {
  if (x.unk) return (
    <span className="flex min-w-0 flex-col items-end text-right">
      <span className="text-body tabular-nums">–</span>
      <span className="text-caption text-fg-secondary">{x.r.status === 'rejected' || x.r.status === 'error' ? L('Not sent', '未傳送') : x.r.status === 'progress' ? L('Not known yet', '還不知道人數') : L('Known once sent', '送出後才知道')}</span>
    </span>
  )
  return <span className="text-body tabular-nums">{fmtN(x.of)}</span>
}

// Status, with who it failed for right under it: "Sent · 2 failed" reads as one outcome
function StatusCell({ m, x }: { m: SendCtl; x: Rec }) {
  const fails = failsOf(x)
  return (
    <span className="flex min-w-0 flex-col items-start gap-1">
      <StatusTag s={x.st} />
      {fails ? <Button variant="link" size="xs" className="!h-auto !min-w-0 !justify-start !p-0 !text-error-text hover:!text-error-text hover:underline" onClick={() => m.set({ ns: x.r.id + '|' + x.k })}>{L(fails + ' not sent', fails + ' 人未送出')}</Button> : null}
    </span>
  )
}

// ---------- list ----------
// How a message's records read as one group (design options; the prototype uses 'none'):
//   merge: message-wide cells (template, times, creator) only on its first row; status stays on every row.
//          Marks, one meaning each: blank = same as the message's first row; "—" = no value (first row only);
//          a record with no sender name (Email) shows a dash in Sender, like any other empty value
//   divider: no lines inside a message, a stronger line between messages
//   band: every other message on a tinted background
//   bracket: a bar down the left edge joins a message's rows
//   header: a row for the message (title, status, times, whole-message actions), its channels under it
//   fold: the same header row, folded by default; open it to see the channels
export type GroupStyle = 'none' | 'merge' | 'divider' | 'band' | 'bracket' | 'header' | 'fold'
// a table row: one record, or (header / fold) the message's own row
interface GRow extends Rec { hdr?: boolean; pos: 'solo' | 'first' | 'mid' | 'last'; band: 0 | 1; n: number; open?: boolean }
// design comparison: VITE_DETAIL_UI=info builds the version with an Info toggle button before ⋮ (pressed while its
// panel is open) and no row highlight; the default build highlights the open row
const INFO_BTN = import.meta.env.VITE_DETAIL_UI === 'info'
const Mk = ({ g, on }: { g: GRow; on?: boolean }) => <i hidden data-gpos={g.pos} data-band={g.band} data-hdr={g.hdr ? '' : undefined} data-open={on ? '1' : undefined} />
const col = createColumnHelper<GRow>()
function sortRecs(list: Rec[], sorting: SortingState, m: SendCtl) {
  const s = sorting[0]
  if (!s) return list
  const key = (x: Rec): string | number => s.id === 'sender' ? recSender(x.r, x.k).toLowerCase() : s.id === 'tpl' ? m.tplName(x.r.tpl).toLowerCase() : s.id === 'aud' ? x.of
    : s.id === 'creator' ? (PMAP[x.r.creator]?.en || '') : s.id === 'created' ? x.r.created : s.id === 'sched' ? x.r.sched || x.r.created : ''
  const out = list.slice().sort((a, b) => { const p = key(a), q = key(b); return p < q ? -1 : p > q ? 1 : 0 })
  return s.desc ? out.reverse() : out
}

export function SplitList({ m, intro, group = 'none' }: { m: SendCtl; intro?: React.ReactNode; group?: GroupStyle }) {
  const [per, setPer] = React.useState(20)
  const s = m.s, app = useApp(), vis = React.useMemo(() => recordsOf(m, m.visible()), [m, app.rows, app.space])
  const q = s.q.trim().toLowerCase()
  const rows = vis.filter(x => {
    if (s.fs.length && s.fs.indexOf(x.st) < 0) return false
    if (s.fch.length && s.fch.indexOf(x.k) < 0) return false
    if (!q) return true
    const cr = PMAP[x.r.creator] || ({} as any), t = recText(x.r, x.k)
    return [recSender(x.r, x.k), m.tplName(x.r.tpl), t.title, t.content, cr.en, cr.zh].join(' ').toLowerCase().indexOf(q) >= 0
  })
  const [sorting, setSorting] = React.useState<SortingState>([])
  const sorted = React.useMemo(() => sortRecs(rows, sorting, m), [rows, sorting, m])
  // grouped: a message's records stay together (in the place of its first one) and a page holds whole messages
  const grouped = group !== 'none', hdrs = group === 'header' || group === 'fold'
  const [opened, setOpened] = React.useState<Record<string, boolean>>({})
  const msgs = React.useMemo(() => {
    const order: string[] = [], by: Record<string, Rec[]> = {}
    sorted.forEach(x => { if (!by[x.r.id]) { by[x.r.id] = []; order.push(x.r.id) } by[x.r.id].push(x) })
    return order.map(id => by[id].slice().sort((a, b) => REC_ORDER.indexOf(a.k) - REC_ORDER.indexOf(b.k)))
  }, [sorted])
  const unitN = grouped ? msgs.length : sorted.length
  const pagesN = Math.max(1, Math.ceil(unitN / per)), page = Math.min(s.page, pagesN), st = (page - 1) * per
  const pageRows: GRow[] = React.useMemo(() => {
    if (!grouped) return sorted.slice(st, st + per).map(x => ({ ...x, pos: 'solo' as const, band: 0 as const, n: 1 }))
    const out: GRow[] = []
    msgs.slice(st, st + per).forEach((g, gi) => {
      const band = (gi % 2) as 0 | 1, open = group === 'header' || !!opened[g[0].r.id]
      // a message with one channel needs no message row
      const hr = hdrs && g.length > 1
      if (hr) out.push({ ...g[0], id: g[0].r.id + '~msg', hdr: true, pos: open ? 'first' : 'solo', band, n: g.length, open })
      if (hr && !open) return
      g.forEach((x, i) => {
        const at = hr ? i + 1 : i, len = hr ? g.length + 1 : g.length
        out.push({ ...x, band, n: g.length, pos: len === 1 ? 'solo' : at === 0 ? 'first' : at === len - 1 ? 'last' : 'mid' })
      })
    })
    return out
  }, [grouped, hdrs, group, msgs, sorted, st, per, opened])
  const [loading, setLoading] = React.useState(true)
  React.useEffect(() => { setLoading(true); const t = setTimeout(() => setLoading(false), 700); return () => clearTimeout(t) }, [app.space])
  const clearAll = () => m.set({ fs: [], fch: [], q: '', page: 1 })
  const flip = <K,>(list: K[], k: K) => (list.indexOf(k) >= 0 ? list.filter(x => x !== k) : list.concat([k]))
  const stOpts = STATUS_ORDER.filter(k => vis.some(x => x.st === k)).map(k => ({ k, view: <StatusTag s={k} />, n: vis.filter(x => x.st === k).length }))
  const chOpts = REC_ORDER.map(k => ({ k, view: <span className="flex items-center gap-2">{React.createElement(CHN[k === 'sms' ? 'push' : k].icon, { className: 'size-4 text-fg-secondary', 'aria-hidden': true })}{chName(k)}</span>, n: vis.filter(x => x.k === k).length })).filter(o => o.n)

  // the cells every record of a message shares: once per message when merged, on the message row with a header
  const shared = (g: GRow) => (hdrs ? !!g.hdr || g.n === 1 : group === 'merge' ? g.pos === 'solo' || g.pos === 'first' : true)
  const columns = React.useMemo(() => [
    // order: Sender, Channel, Title / Content, Status, Reach / Audience, Template, Created, Scheduled, Created by
    col.accessor(x => recSender(x.r, x.k), { id: 'sender', header: L('Sender', '寄件人'), meta: { width: 140 }, cell: i => {
      const g = i.row.original
      return <><Mk g={g} on={!INFO_BTN && s.det === g.id} />{group === 'bracket' && g.pos !== 'solo' ? <span className={'mnp-bracket is-' + g.pos} aria-hidden /> : null}
        {g.hdr ? null : i.getValue() ? <Trunc text={i.getValue()} className="font-medium" /> : <span className="text-fg-muted">—</span>}</>
    } }),
    // icons only: room for two icons (the message row of the grouped options adds a chevron)
    col.display({ id: 'ch', header: L('Channel', '通道'), enableSorting: false, meta: { width: hdrs ? 128 : 96 }, cell: i => {
      const g = i.row.original
      if (g.hdr) return (
        <span className="flex min-w-0 items-center gap-2"><Mk g={g} on={!INFO_BTN && s.det === g.id} />
          {group === 'fold' ? <Button variant="text" size="xs" iconOnly startIcon={ChevronRight} className={g.open ? '[&_svg]:rotate-90' : ''} aria-expanded={g.open} aria-label={(g.open ? L('Hide channels of ', '收合通道：') : L('Show channels of ', '展開通道：')) + g.r.title} onClick={() => setOpened(o => ({ ...o, [g.r.id]: !o[g.r.id] }))} /> : null}
          <ChIcons list={rowChs(g.r)} />
        </span>
      )
      return <span className={'flex min-w-0 items-center' + (hdrs && g.n > 1 ? ' pl-7' : '')}><Mk g={g} on={!INFO_BTN && s.det === g.id} /><ChCell k={g.k} /></span>
    } }),
    col.display({ id: 'title', header: L('Title / Content', '標題 / 內容'), meta: { width: 320 }, cell: i => {
      const x = i.row.original, t = recText(x.r, x.k), text = t.content.replace(/\s+/g, ' ')
      if (x.hdr) return (
        <span className="flex min-w-0 flex-col">
          <Trunc tip={false} text={x.r.title} className="font-bold" />
          <span className="text-caption text-fg-secondary">{L(x.n + (x.n === 1 ? ' channel' : ' channels'), x.n + ' 個通道')}{group === 'fold' && !x.open ? L(' · open to see each one', '・展開看各通道') : ''}</span>
        </span>
      )
      return (
        <span className="flex min-w-0 flex-col">
          <span className="flex min-w-0 items-center gap-1.5">
            <Trunc tip={false} text={t.title} className="font-medium text-primary hover:text-primary-hover hover:underline focus-visible:outline-2 focus-visible:outline-ring" onClick={() => m.set({ det: x.id })} />
          </span>
          {text ? <Trunc tip={false} text={text} className="text-caption text-fg-secondary" /> : null}
        </span>
      )
    } }),
    col.display({ id: 'status', header: L('Status', '狀態'), meta: { width: 168 }, cell: i => { const g = i.row.original; return g.hdr ? <StatusTag s={g.r.status} /> : <StatusCell m={m} x={g} /> } }),
    // this channel's audience only (how many it goes to); failures sit under the status
    col.display({ id: 'aud', header: L('Audience', '收件人數'), enableSorting: true, meta: { width: 88, align: 'right' }, cell: i => i.row.original.hdr ? null : <AudienceN x={i.row.original} /> }),
    col.accessor(x => m.tplName(x.r.tpl), { id: 'tpl', header: L('Template', '模板'), meta: { width: 140 }, cell: i => !shared(i.row.original) ? null : i.getValue() ? <Trunc text={i.getValue()} /> : <span className="text-fg-muted">—</span> }),
    col.accessor(x => x.r.created, { id: 'created', header: L('Created', '建立時間'), meta: { width: 116 }, cell: i => { if (!shared(i.row.original)) return null; const p = i.getValue().split(' '); return <Two a={p[0]} b={p[1]} /> } }),
    // send now goes out at its created time, so it never shows a dash here
    col.accessor(x => x.r.sched || x.r.created, { id: 'sched', header: L('Send time', '傳送時間'), meta: { width: 116 }, cell: i => { if (!shared(i.row.original)) return null; const v = i.getValue(); const p = v.split(' '); return <Two a={p[0]} b={p[1]} /> } }),
    ...(app.space === 'me' ? [] : [// the DS person display, but blank (not the DS's own dash) on the message's other rows
      col.accessor(x => (shared(x) ? personVal(PMAP[x.r.creator] || PEOPLE[0]) : null), { id: 'creator', header: L('Created by', '建立者'), meta: { width: 200 }, cell: i => i.getValue() ? <PersonDisplay value={i.getValue()} /> : null })]),
  ], [m, app.lang, app.teams, app.space, group, hdrs, s.det])

  // first use (nothing in this space yet): a page-level empty state, no search, filters or table frame
  if (!loading && vis.length === 0) return (
    <div className="flex h-full flex-col gap-[var(--layout-space-loose)] p-[var(--layout-space-loose)]">
      {intro}
      <div className="py-[calc(var(--layout-space-bottom)*2)]">
        <Empty icon={Send} title={L('No messages yet', '還沒有訊息')} description={L('Send your first notification to see it here.', '發送第一則通知後，會顯示在這裡。')} action={<Button variant="primary" startIcon={Plus} onClick={() => m.startCompose('new')}>{L('New message', '新訊息')}</Button>} />
      </div>
    </div>
  )

  return (
    <div className="flex h-full flex-col gap-[var(--layout-space-loose)] p-[var(--layout-space-loose)]">
      {intro}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="min-w-60 max-w-sm flex-1">
            <Input startIcon={Search} type="search" placeholder={L('Search title, content, sender, template or creator', '搜尋標題、內容、寄件人、模板或建立者')} aria-label={L('Search messages', '搜尋訊息')} value={s.q} onChange={e => m.set({ q: e.target.value, page: 1 })} />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <FilterMenu<Status> label={L('Status', '狀態')} opts={stOpts} sel={s.fs} toggle={k => m.set({ fs: flip(s.fs, k), page: 1 })} clear={() => m.set({ fs: [], page: 1 })} />
            <FilterMenu<Channel> label={L('Channel', '通道')} opts={chOpts} sel={s.fch} toggle={k => m.set({ fch: flip(s.fch, k), page: 1 })} clear={() => m.set({ fch: [], page: 1 })} />
          </div>
        </div>
      </div>
      {loading ? <ListLoading /> : (
        <div className={'mnp-center flex min-h-0 flex-1 flex-col mnp-g-' + group}>
          <DataTable tableOptions={{ ...NO_HIDE, manualSorting: true, onSortingChange: (u: any) => setSorting(old => (typeof u === 'function' ? u(old) : u)) }}
            columns={columns as any}
            data={pageRows}
            bordered
            height="100%"
            autoRowHeight
            getRowId={x => x.id}
            rowActions={(x: GRow) => <><Mk g={x} on={!INFO_BTN && s.det === x.id} />{INFO_BTN ? <Button variant="text" size="xs" iconOnly startIcon={Info} pressed={s.det === x.id} aria-label={L('View details', '查看詳情')} onClick={() => m.set({ det: s.det === x.id ? null : x.id })} /> : null}<RecMenu m={m} x={x} lite={hdrs && !x.hdr && x.n > 1} /></>}
            emptyState={<Empty icon={Search} title={L('No matching messages', '找不到符合的訊息')} description={L('Try another search or clear filters.', '換個關鍵字，或清除篩選條件。')} action={<Button onClick={clearAll}>{L('Clear filters', '清除篩選')}</Button>} />}
          />
        </div>
      )}
      {rows.length && !loading ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="ml-auto flex items-center gap-3">
            <Pagination total={unitN} pageSize={per} page={page} onPageChange={p => m.set({ page: p })} showTotal={false} prevAriaLabel={L('Previous page', '上一頁')} nextAriaLabel={L('Next page', '下一頁')} />
            <PageSize value={per} onChange={n => { setPer(n); m.set({ page: 1 }) }} />
          </div>
        </div>
      ) : null}
    </div>
  )
}

// ---------- details of one record ----------
// the audiences that apply to this record: external phones only get SMS (so only on "Device Notifications (SMS)"), external emails only Email
const tagsFor = (r: Row, k: Channel) => audToTags(r.aud).filter((t: RTag) => t.type !== 'ext' || (isExtPhone(t) ? k === 'sms' : k === 'email'))

// What the panel adds to the row it opens from: the channel's full content, whom it went to, and where the
// approval stands (a link to the Approval center). With SMS fallback the panel has two blocks, Device
// Notifications and SMS fallback, each with its own send status. What the row shows (sender, template, times,
// creator, audience count) isn't repeated, and there are no actions here: those are in the row's menu.
export function SplitDetailSheet({ m }: { m: SendCtl }) {
  const app = useApp(), x = recordById(m, app.rows, m.s.det)
  if (!x) return null
  return <ShellAside title={L('Message detail', '訊息詳情')} onClose={() => m.set({ det: null })}><SplitDetail key={x.id} m={m} x={x} /></ShellAside>
}

// What the sender wrote is folded away by default (it's long, and the list row already shows its first lines):
// one accordion item per channel part. With SMS fallback there are two items, each with its own status and
// "n / m sent"; the status tags only show once something has gone out, so a message waiting for approval
// doesn't repeat "Pending approval" on every line.
function Item({ value, title, part, children }: { value: string; title: string; part?: Part; children: React.ReactNode }) {
  return (
    <AccordionItem value={value} className="border-b border-divider last:border-b-0">
      <AccordionTrigger className="px-3">
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-left">
          <span className="text-body font-medium">{title}</span>
          {part && !part.unk && done(part.st) ? (part.of === 0
            ? <span className="text-caption text-fg-secondary">{L('Not needed', '不需要')}</span>
            : <span className="text-caption tabular-nums text-fg-secondary">{L(fmtN(part.ok) + ' / ' + fmtN(part.of) + ' sent', fmtN(part.ok) + ' / ' + fmtN(part.of) + ' 已送出')}</span>) : null}
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-3"><div className="flex flex-col gap-2 pb-1">{children}</div></AccordionContent>
    </AccordionItem>
  )
}

function SplitDetail({ m, x }: { m: SendCtl; x: Rec }) {
  const app = useApp(), r = x.r, k = x.k, I = CHN[k === 'sms' ? 'push' : k].icon
  const tags = tagsFor(r, k), urgent = ICSD && !!r.bypass, approval = (ICSD && k === 'sms') || !!r.review || urgent
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-1 flex-col gap-[var(--layout-space-loose)] px-[var(--layout-space-loose)] pt-[var(--layout-space-tight)] pb-[var(--layout-space-loose)]">
        {/* the basics as vertical fields (label above value): channel, status, why it's urgent, where the approval stands */}
        <DescriptionList>
          <DescriptionItem label={L('Channel', '通道')}><span className="inline-flex items-center gap-1.5"><I className="size-4 text-fg-secondary" aria-hidden />{chName(k)}</span></DescriptionItem>
          <DescriptionItem label={L('Status', '狀態')}><StatusTag s={x.fb && x.pst ? x.pst : x.st} /></DescriptionItem>
          {urgent && r.bypass ? <DescriptionItem label={L('Urgent reason', '緊急原因')}><span className="whitespace-pre-wrap">{r.bypass.reason}</span></DescriptionItem> : null}
          {approval ? <DescriptionItem label={L('Approval', '審核')}><Button variant="link" size="sm" startIcon={ExternalLink} className="!h-auto !min-w-0 !justify-start !p-0" onClick={() => flash(L('Opens the Approval center', '前往 Approval center'), 'ok')}>{L('View in Approval center', '到 Approval center 查看')}</Button></DescriptionItem> : null}
        </DescriptionList>

        <Part title={L('Content', '內容')}>
          <Accordion type="multiple" className="rounded-md border border-divider">
            {x.fb ? <>
              <Item value="push" title={CHN.push.name} part={{ ok: x.ok, of: x.of, unk: x.unk, st: x.pst }}><ChannelText r={r} k="push" noSender /></Item>
              <Item value="sms" title={L('SMS fallback', 'SMS 備援')} part={x.fb}><ChannelText r={r} k="sms" /></Item>
            </> : <Item value={k} title={chName(k)}><ChannelText r={r} k={k} noSender /></Item>}
          </Accordion>
        </Part>

        <Part title={L('Audiences', '收件人')}>
          {tags.length ? <AudienceList tags={tags} groups={app.groups} /> : <span className="text-body text-fg-secondary">—</span>}
        </Part>
      </div>
    </div>
  )
}

// ---------- who one record missed ----------
// One record's list: the people it didn't reach. With SMS fallback that's the people neither Device Notifications nor SMS
// reached, each with both reasons. Resend goes out on this record's channels again.
export function SplitFailDialog({ m }: { m: SendCtl }) {
  const app = useApp(), [nid, nch] = (m.s.ns || '').split('|') as [string, Channel | undefined]
  const r = nid ? app.rows.find(x => x.id === nid) : null
  const rec = r ? recordsOf(m, [r]).find(x => x.k === nch) || recordsOf(m, [r])[0] : null
  const k: Channel = rec ? rec.k : 'push', n = rec ? failsOf(rec) : 0
  const list = r ? chFailList(r, k === 'sms' ? 'push' : k, n).map(f => ({ ...f, via: null })) : []
  const close = () => m.set({ ns: null })
  const resend = () => {
    if (!r) return
    const tags: RTag[] = list.map(f => f.ext ? { key: 'e:' + f.ext, type: 'ext' as const, email: f.ext } : { key: 'p:' + f.p!.id, type: 'person' as const, id: f.p!.id })
    close()
    m.startCompose('resend', r, tags)
    m.setC({ ch: { push: k === 'push' || k === 'sms', desktop: k === 'desktop', email: k === 'email', sms: k === 'sms' } }, true)
  }
  return (
    <Dialog open={!!r} onOpenChange={o => { if (!o) close() }}>
      {r ? (
        <DialogContent maxWidth={760} height="hug">
          <DialogHeader>
            <div className="flex flex-col gap-0.5">
              <DialogTitle>{L('Not sent to', '未送達的收件人')}</DialogTitle>
              <DialogDescription className="sr-only">{chName(k)}</DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-[var(--layout-space-tight)]">
              {r.err ? <Banner tone="error" title={tx(r.err.title)}>{tx(r.err.text)}</Banner> : null}
              <DataTable tableOptions={NO_HIDE} columns={failCols() as any} data={list} bordered height="380px" autoRowHeight getRowId={(_, i) => String(i)} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="primary" startIcon={RotateCw} onClick={resend}>{L('Resend', '重新寄送')}</Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
