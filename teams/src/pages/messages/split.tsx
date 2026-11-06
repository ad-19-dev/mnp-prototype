// "One record per channel" version of the messages list and details (build mode `split`, see vite.config.ts).
// The send flow doesn't change: a sender still picks several channels in one go. The list then shows one row
// per channel, each with that channel's own text, status and audience count, so a row never has to merge
// several channels' numbers (and the backend never has to intersect their audiences).
// Actions that change the message itself (edit, delete, reschedule, send now, duplicate) still act on the
// whole message, on every channel; the dialogs say so.
import * as React from 'react'
import {
  Button, DataTable, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Empty, Input,
  Pagination, Tag, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@qijenchen/design-system'
import { createColumnHelper, type SortingState } from '@tanstack/react-table'
import { CalendarClock, ChevronRight, CornerDownRight, CircleAlert, Copy, ExternalLink, Eye, MoreVertical, Pencil, RotateCw, Search, Send, Siren, Trash2 } from 'lucide-react'
import {
  CH_ORDER, ICSD, PEOPLE, PMAP, STATUS_ORDER, audToTags, chFailList, fmtN, htmlToText, isExtPhone, reqIdFor, rowChs,
  type Channel, type Row, type Status, type Tag as RTag,
} from '../../lib/data'
import { flash, useApp } from '../../lib/store'
import { Banner, CHN, ChIcons, FilterMenu, NO_HIDE, PAvatar, PageSize, StatusTag, Tip, Trunc, Two } from '../../components/ui'
import { ShellAside } from '../../components/shell'
import { L, tx } from '../../lib/i18n'
import { type SendCtl } from './ctl'
import { ListLoading } from './List'
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
  return { title: r.title, content: r.content }
}
// only Device Notifications and Desktop OS carry a sender name
const recSender = (r: Row, k: Channel) => (k === 'push' || k === 'sms' ? r.sender : k === 'desktop' ? (r.desk ? r.desk.sender : r.sender) : '')

function ChCell({ k }: { k: Channel }) {
  const I = CHN[k === 'sms' ? 'push' : k].icon
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="inline-flex shrink-0 items-center gap-1">
        <Tag size="sm" color="neutral" icon={I} aria-hidden className="[&_[data-tag-text]]:hidden" />
        {k === 'sms' ? <Tag size="sm" color="amber" icon={CHN.sms.icon} aria-hidden className="[&_[data-tag-text]]:hidden" /> : null}
      </span>
      <Trunc text={chName(k)} />
    </span>
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
  m.set({ cf: { title: L('Send it now?', '要立即傳送嗎？'), text: L('It goes out right away instead of at ' + r.sched + '. It’s already approved.', '會立刻送出，不再等原訂的 ' + r.sched + '。這則訊息已經核准。') + allNote(r), icon: Send, tone: 'info', cancel: L('Not now', '先不要'), ok: L('Send now', '立即傳送'), run: () => m.sendNow(r.id) } })
}

// lite: a channel row under its message row, where the message row holds the whole-message actions
function RecMenu({ m, x, lite }: { m: SendCtl; x: Rec; lite?: boolean }) {
  const r = x.r, many = recKinds(r).length > 1
  // "(all channels)" on the actions that change the whole message, so nobody expects them to touch one row
  const all = many ? L(' (all channels)', '（所有通道）') : ''
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="text" size="xs" iconOnly startIcon={MoreVertical} aria-label={L('Actions for ', '操作：') + recText(r, x.k).title} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" minWidth={232}>
        <DropdownMenuItem startIcon={Eye} onSelect={() => m.set({ det: x.id.endsWith('~msg') ? r.id : x.id })}>{L('View message', '查看訊息內容')}</DropdownMenuItem>
        {lite ? null : <>
        {r.status === 'expired' ? <>
          <DropdownMenuItem startIcon={Send} onSelect={() => askSendNow(m, r)}>{L('Send now', '立即傳送') + all}</DropdownMenuItem>
          <DropdownMenuItem startIcon={CalendarClock} onSelect={() => m.openReschedule(r)}>{L('Reschedule', '重新排程') + all}</DropdownMenuItem>
        </> : null}
        {r.status === 'scheduled' ? <DropdownMenuItem startIcon={Pencil} onSelect={() => m.startCompose('edit', r)}>{L('Edit message', '編輯訊息')}</DropdownMenuItem> : null}
        {r.status === 'rejected' ? <DropdownMenuItem startIcon={Pencil} onSelect={() => m.startCompose('edit', r)}>{L('Edit and resubmit', '修改後重新送審')}</DropdownMenuItem> : null}
        {r.status === 'error' ? <DropdownMenuItem startIcon={RotateCw} onSelect={() => m.retry(r.id)}>{L('Retry', '重新傳送') + all}</DropdownMenuItem> : null}
        <DropdownMenuItem startIcon={Copy} onSelect={() => m.startCompose('duplicate', r)}>{L('Duplicate to new message', '複製為新訊息')}</DropdownMenuItem>
        {r.status === 'scheduled' || r.status === 'expired' || r.status === 'rejected' ? <>
          <DropdownMenuSeparator />
          <DropdownMenuItem startIcon={Trash2} className="text-error-text" onSelect={() => askDelete(m, r)}>{L('Delete', '刪除') + all}</DropdownMenuItem>
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
      {fails ? <Button variant="link" size="xs" startIcon={CircleAlert} className="!h-auto !min-w-0 !justify-start !p-0 !text-error-text hover:!text-error-text hover:underline" onClick={() => m.set({ ns: x.r.id + '|' + x.k })}>{L(fails + ' failed', fails + ' 人失敗')}</Button> : null}
    </span>
  )
}

// ---------- list ----------
// How a message's records read as one group (design options; the prototype uses 'none'):
//   merge: message-wide cells (template, times, creator) only on its first row; status stays on every row.
//          Marks, one meaning each: blank = same as the message's first row; "—" = no value (first row only);
//          a channel with no sender name (Email, SMS fallback) leaves Sender blank for now
//   divider: no lines inside a message, a stronger line between messages
//   band: every other message on a tinted background
//   bracket: a bar down the left edge joins a message's rows
//   header: a row for the message (title, status, times, whole-message actions), its channels under it
//   fold: the same header row, folded by default; open it to see the channels
export type GroupStyle = 'none' | 'merge' | 'divider' | 'band' | 'bracket' | 'header' | 'fold'
// a table row: one record, or (header / fold) the message's own row
interface GRow extends Rec { hdr?: boolean; pos: 'solo' | 'first' | 'mid' | 'last'; band: 0 | 1; n: number; open?: boolean }
const Mk = ({ g }: { g: GRow }) => <i hidden data-gpos={g.pos} data-band={g.band} data-hdr={g.hdr ? '' : undefined} />
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
  const fOn = s.fs.length > 0 || s.fch.length > 0, fN = s.fs.length + s.fch.length
  const flip = <K,>(list: K[], k: K) => (list.indexOf(k) >= 0 ? list.filter(x => x !== k) : list.concat([k]))
  const stOpts = STATUS_ORDER.filter(k => vis.some(x => x.st === k)).map(k => ({ k, view: <StatusTag s={k} />, n: vis.filter(x => x.st === k).length }))
  const chOpts = REC_ORDER.map(k => ({ k, view: <span className="flex items-center gap-2">{React.createElement(CHN[k === 'sms' ? 'push' : k].icon, { className: 'size-4 text-fg-secondary', 'aria-hidden': true })}{chName(k)}</span>, n: vis.filter(x => x.k === k).length })).filter(o => o.n)

  // the cells every record of a message shares: once per message when merged, on the message row with a header
  const shared = (g: GRow) => (hdrs ? !!g.hdr || g.n === 1 : group === 'merge' ? g.pos === 'solo' || g.pos === 'first' : true)
  const columns = React.useMemo(() => [
    // order: Sender, Channel, Title / Content, Status, Reach / Audience, Template, Created, Scheduled, Created by
    col.accessor(x => recSender(x.r, x.k), { id: 'sender', header: L('Sender', '寄件人'), meta: { width: 170 }, cell: i => {
      const g = i.row.original
      return <><Mk g={g} />{group === 'bracket' && g.pos !== 'solo' ? <span className={'mnp-bracket is-' + g.pos} aria-hidden /> : null}
        {g.hdr ? null : i.getValue() ? <Trunc text={i.getValue()} className="font-medium" /> : null}</>
    } }),
    col.display({ id: 'ch', header: L('Channel', '通道'), enableSorting: false, meta: { width: hdrs ? 236 : 210 }, cell: i => {
      const g = i.row.original
      if (g.hdr) return (
        <span className="flex min-w-0 items-center gap-2"><Mk g={g} />
          {group === 'fold' ? <Button variant="text" size="xs" iconOnly startIcon={ChevronRight} className={g.open ? '[&_svg]:rotate-90' : ''} aria-expanded={g.open} aria-label={(g.open ? L('Hide channels of ', '收合通道：') : L('Show channels of ', '展開通道：')) + g.r.title} onClick={() => setOpened(o => ({ ...o, [g.r.id]: !o[g.r.id] }))} /> : null}
          <ChIcons list={rowChs(g.r)} />
        </span>
      )
      return <span className={'flex min-w-0 items-center' + (hdrs && g.n > 1 ? ' pl-7' : '')}><Mk g={g} /><ChCell k={g.k} /></span>
    } }),
    col.display({ id: 'title', header: L('Title / Content', '標題 / 內容'), meta: { width: 380 }, cell: i => {
      const x = i.row.original, t = recText(x.r, x.k), text = t.content.replace(/\s+/g, ' ')
      if (x.hdr) return (
        <span className="flex min-w-0 flex-col">
          <Trunc text={x.r.title} className="font-bold" />
          <span className="text-caption text-fg-secondary">{L(x.n + (x.n === 1 ? ' channel' : ' channels'), x.n + ' 個通道')}{group === 'fold' && !x.open ? L(' · open to see each one', '・展開看各通道') : ''}</span>
        </span>
      )
      return (
        <span className="flex min-w-0 flex-col">
          <span className="flex min-w-0 items-center gap-1.5">
            {ICSD && x.r.bypass ? <Tip text={L('Urgent: sent without SMS approval', '緊急發送：略過 SMS 核准')}><span tabIndex={0} className="inline-flex shrink-0 rounded-sm focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"><Tag size="sm" color="amber" icon={Siren}>{L('Urgent', '緊急')}</Tag></span></Tip> : null}
            <Trunc text={t.title} className="font-medium text-primary hover:text-primary-hover hover:underline focus-visible:outline-2 focus-visible:outline-ring" onClick={() => m.set({ det: x.id })} />
          </span>
          {text ? <Trunc text={text} className="text-caption text-fg-secondary" /> : null}
        </span>
      )
    } }),
    col.display({ id: 'status', header: L('Status', '狀態'), meta: { width: 180 }, cell: i => { const g = i.row.original; return g.hdr ? <StatusTag s={g.r.status} /> : <StatusCell m={m} x={g} /> } }),
    // this channel's audience only (how many it goes to); failures sit under the status
    col.display({ id: 'aud', header: L('Audience', '收件人數'), enableSorting: true, meta: { width: 140, align: 'right' }, cell: i => i.row.original.hdr ? null : <AudienceN x={i.row.original} /> }),
    col.accessor(x => m.tplName(x.r.tpl), { id: 'tpl', header: L('Template', '模板'), meta: { width: 150 }, cell: i => !shared(i.row.original) ? null : i.getValue() ? <Trunc text={i.getValue()} /> : <span className="text-fg-muted">—</span> }),
    col.accessor(x => x.r.created, { id: 'created', header: L('Created', '建立時間'), meta: { width: 120 }, cell: i => { if (!shared(i.row.original)) return null; const p = i.getValue().split(' '); return <Two a={p[0]} b={p[1]} /> } }),
    // send now goes out at its created time, so it never shows a dash here
    col.accessor(x => x.r.sched || x.r.created, { id: 'sched', header: L('Send time', '傳送時間'), meta: { width: 130 }, cell: i => { if (!shared(i.row.original)) return null; const v = i.getValue(); const p = v.split(' '); return <Two a={p[0]} b={p[1]} /> } }),
    ...(app.space === 'me' ? [] : [col.accessor(x => x.r.creator, { id: 'creator', header: L('Created by', '建立者'), meta: { width: 170 }, cell: i => { if (!shared(i.row.original)) return null; const p = PMAP[i.getValue()] || PEOPLE[0]; return <span className="flex min-w-0 items-center gap-2"><PAvatar p={p} /><Two a={p.en} b={p.zh} /></span> } })]),
  ], [m, app.lang, app.teams, app.space, group, hdrs])

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
        {fOn || q ? (
          <p className="flex flex-wrap items-center gap-x-2 text-body text-fg-secondary" aria-live="polite">
            {L('Showing ' + rows.length + ' of ' + vis.length + ' records', '顯示 ' + vis.length + ' 筆中的 ' + rows.length + ' 筆')}
            {fOn ? <span>{L('· ' + fN + (fN === 1 ? ' filter' : ' filters'), '・' + fN + ' 個篩選條件')}</span> : null}
            <Button variant="link" size="sm" onClick={clearAll}>{L('Clear', '清除')}</Button>
          </p>
        ) : null}
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
            pinnedLeftColumns={['sender']}
            rowActions={(x: GRow) => <><Mk g={x} /><RecMenu m={m} x={x} lite={hdrs && !x.hdr && x.n > 1} /></>}
            emptyState={vis.length
              ? <Empty icon={Search} title={L('No matching messages', '找不到符合的訊息')} description={L('Try another search or clear filters.', '換個關鍵字，或清除篩選條件。')} action={<Button onClick={clearAll}>{L('Clear filters', '清除篩選')}</Button>} />
              : <Empty icon={Send} title={L('No messages yet', '還沒有訊息')} description={L('Click “+ New message” to send your first notification.', '點「＋ 新訊息」發送第一則通知。')} />}
          />
        </div>
      )}
      {rows.length && !loading ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-body text-fg-secondary">{grouped
            ? L((st + 1) + '–' + Math.min(unitN, st + per) + ' of ' + unitN + ' messages (' + rows.length + ' records)', '第 ' + (st + 1) + '–' + Math.min(unitN, st + per) + ' 則，共 ' + unitN + ' 則（' + rows.length + ' 筆）')
            : L((st + 1) + '–' + Math.min(rows.length, st + per) + ' of ' + rows.length, '第 ' + (st + 1) + '–' + Math.min(rows.length, st + per) + ' 筆，共 ' + rows.length + ' 筆')}</span>
          <div className="flex items-center gap-3">
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
  return <ShellAside title={L('Message content', '訊息內容')} onClose={() => m.set({ det: null })}><SplitDetail m={m} x={x} /></ShellAside>
}

// one block of the content: a heading, the send status with its numbers, and what was sent
function Block({ title, part, children, head }: { title: string; part?: Part & { fails?: number }; children: React.ReactNode; head?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      {head ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <b className="text-body font-medium text-foreground">{title}</b>
          {part ? <StatusTag s={part.st} /> : null}
          {part && !part.unk && done(part.st) ? <span className="text-caption tabular-nums text-fg-secondary">{L(fmtN(part.ok) + ' / ' + fmtN(part.of) + ' delivered', fmtN(part.ok) + ' / ' + fmtN(part.of) + ' 已送達')}</span> : null}
          {part && part.unk ? <span className="text-caption text-fg-secondary">{L('Number known once Device Notifications finishes', '等 Device Notifications 送完才知道人數')}</span> : null}
        </div>
      ) : null}
      {children}
    </div>
  )
}

function SplitDetail({ m, x }: { m: SendCtl; x: Rec }) {
  const app = useApp(), r = x.r, k = x.k, I = CHN[k === 'sms' ? 'push' : k].icon
  const tags = tagsFor(r, k), approval = (ICSD && k === 'sms') || !!r.review
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-1 flex-col gap-[calc(var(--layout-space-loose)*2)] px-[var(--layout-space-loose)] pt-[var(--layout-space-tight)] pb-[var(--layout-space-loose)]">
        <div className="flex flex-col gap-[var(--layout-space-tight)]">
          <div className="flex flex-wrap items-center gap-2">
            <StatusTag s={x.st} />
            <span className="flex items-center gap-1.5 text-body text-fg-secondary"><I className="size-4" aria-hidden />{chName(k)}</span>
          </div>
          {/* the review's progress, reasons and approvers live in the Approval center, not here */}
          {approval ? <Button variant="link" size="sm" startIcon={ExternalLink} className="!h-auto !min-w-0 !justify-start !p-0" onClick={() => flash(L('Opens the Approval center', '前往 Approval center'), 'ok')}>{L('See review progress in the Approval center', '到 Approval center 查看審核進度')}</Button> : null}
        </div>

        <Part title={L('Content', '內容')}>
          {x.fb ? (
            <div className="flex flex-col gap-[var(--layout-space-loose)]">
              <Block head title={CHN.push.name} part={{ ok: x.ok, of: x.of, unk: x.unk, st: x.pst }}><ChannelText r={r} k="push" /></Block>
              <Block head title={L('SMS fallback', 'SMS 備援')} part={x.fb}>
                <ChannelText r={r} k="sms" />
                <span className="text-caption text-fg-secondary">{L('Sent to the people Device Notifications couldn’t reach, and to external phones.', '寄給 Device Notifications 送不到的人，以及外部電話。')}</span>
                {r.smsReason ? <div className="flex flex-col gap-0.5"><span className="text-caption text-fg-secondary">{L('Why SMS was requested', '申請 SMS 的理由')}</span><span className="whitespace-pre-wrap text-body">{r.smsReason}</span></div> : null}
              </Block>
            </div>
          ) : <ChannelText r={r} k={k} />}
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
    if (r.status === 'error') { m.retry(r.id); return }
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
              <DialogTitle>{L('Failed audience members', '傳送失敗的收件人')}</DialogTitle>
              <DialogDescription className="text-body text-fg-secondary">{chName(k) + ' · ' + L(fmtN(n) + ' of ' + fmtN(rec ? rec.of : 0), fmtN(n) + ' / ' + fmtN(rec ? rec.of : 0) + ' 人')}</DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-[var(--layout-space-tight)]">
              {r.err ? <Banner tone="error" title={tx(r.err.title)}>{tx(r.err.text)}</Banner> : null}
              <DataTable tableOptions={NO_HIDE} columns={failCols() as any} data={list} bordered height="380px" autoRowHeight getRowId={(_, i) => String(i)} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="primary" startIcon={RotateCw} onClick={resend}>{r.status === 'error' ? L('Retry', '重新傳送') : L('Resend to ' + fmtN(list.length) + ' on ' + chName(k), '用' + chName(k) + '重寄給 ' + fmtN(list.length) + ' 人')}</Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
