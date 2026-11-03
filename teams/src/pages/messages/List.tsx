// Messages list: search, filters, table with row actions and pagination
import * as React from 'react'
import {
  Button, DataTable, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Empty, Input,
  Pagination, ProgressBar, Skeleton, Tag,
} from '@qijenchen/design-system'
import { FilterMenu, NO_HIDE, Tip, Trunc, PageSize } from '../../components/ui'
import { createColumnHelper, type SortingState } from '@tanstack/react-table'
import { CalendarClock, CircleAlert, Copy, Eye, MoreVertical, Pencil, RotateCw, Search, Send, Siren, Trash2 } from 'lucide-react'
import { PEOPLE, PMAP, STATUS_ORDER, fmtN, htmlToText, rowChs, type Channel, type Row } from '../../lib/data'
import { useApp } from '../../lib/store'
import { CHN, ChIcons, PAvatar, StatusTag, Two } from '../../components/ui'
import { L } from '../../lib/i18n'
import { listSender, type SendCtl } from './ctl'

const col = createColumnHelper<Row>()
const notStarted = (r: Row) => r.status === 'pending' || r.status === 'expired' || r.status === 'rejected' || r.status === 'scheduled'

// the title and text the list shows: Device Notifications first, then Email, then Desktop OS
export function listText(r: Row) {
  if (r.channels.indexOf('push') < 0 && r.channels.indexOf('email') >= 0 && r.email && r.email.mode === 'own') return { title: r.email.subject || r.title, content: htmlToText(r.email.html) || r.content }
  return { title: r.title, content: r.content }
}

// sort the whole list (not just the page in view)
function sortRows(rows: Row[], sorting: SortingState, m: SendCtl) {
  const s = sorting[0]
  if (!s) return rows
  const key = (r: Row): string | number => s.id === 'sender' ? listSender(r).toLowerCase() : s.id === 'tpl' ? m.tplName(r.tpl).toLowerCase() : s.id === 'status' ? STATUS_ORDER.indexOf(r.status)
    : s.id === 'recv' ? r.total : s.id === 'creator' ? (PMAP[r.creator]?.en || '') : (r as any)[s.id] || ''
  const out = rows.slice().sort((a, b) => { const x = key(a), y = key(b); return x < y ? -1 : x > y ? 1 : 0 })
  return s.desc ? out.reverse() : out
}

// the table's shape while it loads: header and ten rows of grey bars
function ListSkeleton() {
  const widths = ['w-24', 'w-20', 'w-72', 'w-16', 'w-20', 'w-20', 'w-24']
  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-divider" aria-busy="true" aria-label={L('Loading messages', '正在載入訊息')}>
      <div className="flex items-center gap-6 border-b border-divider bg-muted/50 px-4 py-3">{widths.map((w, i) => <Skeleton key={i} className={'h-3 ' + w} />)}</div>
      {Array.from({ length: 10 }, (_, r) => (
        <div key={r} className="flex items-center gap-6 border-b border-divider px-4 py-4 last:border-0">
          {widths.map((w, i) => i === 2 ? <span key={i} className="flex w-72 flex-col gap-2"><Skeleton className="h-3.5 w-60" /><Skeleton className="h-3 w-72" /></span> : <Skeleton key={i} className={'h-3.5 ' + w} />)}
        </div>
      ))}
    </div>
  )
}

function RowMenu({ m, r }: { m: SendCtl; r: Row }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="text" size="xs" iconOnly startIcon={MoreVertical} aria-label={L('Actions for ', '操作：') + r.title} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" minWidth={208}>
        <DropdownMenuItem startIcon={Eye} onSelect={() => m.set({ det: r.id })}>{L('View details', '查看詳情')}</DropdownMenuItem>
        {/* approved too late for its schedule: send now, pick a new time, or delete */}
        {r.status === 'expired' ? <>
          <DropdownMenuItem startIcon={Send} onSelect={() => m.askSendNow(r)}>{L('Send now', '立即傳送')}</DropdownMenuItem>
          <DropdownMenuItem startIcon={CalendarClock} onSelect={() => m.openReschedule(r)}>{L('Reschedule', '重新排程')}</DropdownMenuItem>
        </> : null}
        {r.status === 'scheduled' ? <DropdownMenuItem startIcon={Pencil} onSelect={() => m.startCompose('edit', r)}>{L('Edit', '編輯')}</DropdownMenuItem> : null}
        {r.status === 'rejected' ? <DropdownMenuItem startIcon={Pencil} onSelect={() => m.startCompose('edit', r)}>{L('Edit and resubmit', '修改後重新送審')}</DropdownMenuItem> : null}
        {r.status === 'error' ? <DropdownMenuItem startIcon={RotateCw} onSelect={() => m.retry(r.id)}>{L('Retry', '重新傳送')}</DropdownMenuItem> : null}
        <DropdownMenuItem startIcon={Copy} onSelect={() => m.startCompose('duplicate', r)}>{L('Duplicate to new message', '複製為新訊息')}</DropdownMenuItem>
        {r.status === 'scheduled' || r.status === 'expired' || r.status === 'rejected' ? <>
          <DropdownMenuSeparator />
          <DropdownMenuItem startIcon={Trash2} className="text-error-text" onSelect={() => m.askDelete(r)}>{L('Delete', '刪除')}</DropdownMenuItem>
        </> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


export function SendList({ m, intro }: { m: SendCtl; intro?: React.ReactNode }) {
  const [per, setPer] = React.useState(20)
  const s = m.s, app = useApp(), rows = m.filtered(), vis = m.visible()
  const [sorting, setSorting] = React.useState<SortingState>([])
  const sorted = React.useMemo(() => sortRows(rows, sorting, m), [rows, sorting, m])
  const pagesN = Math.max(1, Math.ceil(sorted.length / per)), page = Math.min(s.page, pagesN), st = (page - 1) * per
  const pageRows = sorted.slice(st, st + per)
  // a short skeleton while a space opens, as if its messages were loading
  const [loading, setLoading] = React.useState(true)
  React.useEffect(() => { setLoading(true); const t = setTimeout(() => setLoading(false), 700); return () => clearTimeout(t) }, [app.space])
  const clearAll = () => m.set({ fS: [], fC: [], fSd: [], fT: [], q: '', page: 1 })
  const stOpts = STATUS_ORDER.map(k => ({ k, n: vis.filter(r => r.status === k).length, view: <StatusTag s={k} /> })).filter(o => o.n > 0)
  const sdOpts = Array.from(new Set(vis.map(listSender))).sort((a, b) => (a ? a.localeCompare(b) : 1)).map(k => ({ k, n: vis.filter(r => listSender(r) === k).length, view: <span className={k ? undefined : 'text-fg-secondary'}>{k || L('No sender name', '沒有寄件人名稱')}</span> }))
  const tpOpts = Array.from(new Set(vis.map(r => r.tpl || ''))).sort((a, b) => (a ? m.tplName(a).localeCompare(m.tplName(b)) : 1)).map(k => ({ k, n: vis.filter(r => (r.tpl || '') === k).length, view: <span className={k ? undefined : 'text-fg-secondary'}>{k ? m.tplName(k) : L('No template', '沒有模板')}</span> }))
  const chOpts = (['push', 'sms', 'desktop', 'email'] as Channel[]).map(k => {
    const I = CHN[k].icon
    return { k, n: vis.filter(r => rowChs(r).indexOf(k) >= 0).length, view: <span className="inline-flex items-center gap-2"><I className="size-4 text-fg-secondary" aria-hidden />{CHN[k].name}</span> }
  })


  const columns = React.useMemo(() => [
    col.accessor('sender', { id: 'sender', header: L('Sender', '寄件人'), meta: { width: 170 }, cell: i => (
      <span className="flex min-w-0 flex-col">
        {/* the sender name only exists on Device Notifications */}
        {i.row.original.channels.indexOf('push') >= 0 ? <Trunc text={i.getValue()} className="font-medium" /> : <span className="text-fg-muted">—</span>}
      </span>
    ) }),
    col.accessor(r => m.tplName(r.tpl), { id: 'tpl', header: L('Template', '模板'), meta: { width: 150 }, cell: i => i.getValue() ? <Trunc text={i.getValue()} /> : <span className="text-fg-muted">—</span> }),
    col.accessor('title', { header: L('Title / Content', '標題 / 內容'), enableSorting: false, meta: { width: 400 }, cell: i => {
      // title (opens the details) over the first line of the text: one wide column instead of two narrow ones;
      // with several channels it shows one version, Device Notifications first, then Email, then Desktop OS
      const r = i.row.original, lt = listText(r), text = lt.content.replace(/\s+/g, ' ')
      return (
        <span className="flex min-w-0 flex-col">
          <span className="flex min-w-0 items-center gap-1.5">
            {/* an urgent send skipped SMS approval: a word, not just a colour, in front of the title */}
            {r.bypass ? <Tip text={L('Urgent: sent without SMS approval', '緊急發送：略過 SMS 核准')}><span tabIndex={0} className="inline-flex shrink-0 rounded-sm focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"><Tag size="sm" color="amber" icon={Siren}>{L('Urgent', '緊急')}</Tag></span></Tip> : null}
            <Trunc text={lt.title} className="font-medium text-primary hover:text-primary-hover hover:underline focus-visible:outline-2 focus-visible:outline-ring" onClick={() => m.set({ det: r.id })} />
          </span>
          <Trunc text={text} className="text-caption text-fg-secondary" />
        </span>
      )
    } }),
    col.display({ id: 'ch', header: L('Channels', '通道'), enableSorting: false, meta: { width: 130 }, cell: i => <ChIcons list={rowChs(i.row.original)} /> }),
    col.accessor('status', { header: L('Status', '狀態'), meta: { width: 180 }, cell: i => <StatusTag s={i.getValue()} /> }),
    col.accessor('created', { header: L('Created', '建立時間'), meta: { width: 120 }, cell: i => { const p = i.getValue().split(' '); return <Two a={p[0]} b={p[1]} /> } }),
    // sorts by how many people it goes to
    col.accessor('total', { id: 'recv', header: L('Delivered', '已送達'), meta: { width: 160 }, cell: i => {
      const r = i.row.original, fails = (r.status === 'sent' || r.status === 'error') ? r.total - r.ok : 0
      return (
        <span className="flex w-full min-w-0 flex-col gap-1">
          <span className="text-body tabular-nums"><span className="font-medium">{notStarted(r) ? '–' : fmtN(r.ok)}</span><span className="text-fg-secondary"> / {fmtN(r.total)}</span></span>
          {r.status === 'progress' ? <ProgressBar aria-label={L('Delivery progress', '傳送進度')} value={Math.round(r.ok / Math.max(1, r.total) * 100)} /> : null}
          {fails ? <Button variant="link" size="xs" startIcon={CircleAlert} className="!h-auto !justify-start !p-0 !text-error-text hover:!text-error-text hover:underline" onClick={() => m.set({ ns: r.id })}>{L(fails + ' failed', fails + ' 人失敗')}</Button> : null}
        </span>
      )
    } }),
    col.accessor('sched', { header: L('Scheduled', '排程時間'), meta: { width: 130 }, cell: i => { const v = i.getValue(); if (!v) return <span className="text-fg-muted">—</span>; const p = v.split(' '); return <Two a={p[0]} b={p[1]} /> } }),
    // the personal space holds only what you created, so Created by appears in team spaces only
    ...(app.space === 'me' ? [] : [col.accessor('creator', { header: L('Created by', '建立者'), meta: { width: 170 }, cell: i => { const p = PMAP[i.getValue()] || PEOPLE[0]; return <span className="flex min-w-0 items-center gap-2"><PAvatar p={p} /><Two a={p.en} b={p.zh} /></span> } })]),
  ], [m, app.lang, app.teams, app.space])

  return (
    <div className="flex h-full flex-col gap-[var(--layout-space-loose)] p-[var(--layout-space-loose)]">
      {intro}
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-60 max-w-sm flex-1">
          <Input startIcon={Search} type="search" placeholder={L('Search messages', '搜尋訊息')} aria-label={L('Search messages', '搜尋訊息')} value={s.q} onChange={e => m.set({ q: e.target.value, page: 1 })} />
        </div>
        <FilterMenu label={L('Status', '狀態')} opts={stOpts} sel={s.fS} toggle={k => m.toggleIn('fS', k)} clear={() => m.set({ fS: [], page: 1 })} />
        <FilterMenu label={L('Channel', '通道')} opts={chOpts} sel={s.fC} toggle={k => m.toggleIn('fC', k)} clear={() => m.set({ fC: [], page: 1 })} />
        <FilterMenu label={L('Sender', '寄件人')} opts={sdOpts} sel={s.fSd} toggle={k => m.toggleIn('fSd', k)} clear={() => m.set({ fSd: [], page: 1 })} />
        <FilterMenu label={L('Template', '模板')} opts={tpOpts} sel={s.fT} toggle={k => m.toggleIn('fT', k)} clear={() => m.set({ fT: [], page: 1 })} />
      </div>
      {loading ? <ListSkeleton /> : (
        // every cell vertically centred (see globals.css .mnp-center)
        <div className="mnp-center flex min-h-0 flex-1 flex-col">
          <DataTable tableOptions={{ ...NO_HIDE, manualSorting: true, onSortingChange: (u: any) => setSorting(old => (typeof u === 'function' ? u(old) : u)) }}
            columns={columns as any}
            data={pageRows}
            bordered
            height="100%"
            autoRowHeight
            getRowId={r => r.id}
            pinnedLeftColumns={['sender']}
            rowActions={(r: Row) => <RowMenu m={m} r={r} />}
            emptyState={vis.length
              ? <Empty icon={Search} title={L('No matching messages', '找不到符合的訊息')} description={L('Try another search or clear filters.', '換個關鍵字，或清除篩選條件。')} action={<Button onClick={clearAll}>{L('Clear filters', '清除篩選')}</Button>} />
              : <Empty icon={Send} title={L('No messages yet', '還沒有訊息')} description={L('Click “+ New message” to send your first notification.', '點「＋ 新訊息」發送第一則通知。')} />}
          />
        </div>
      )}
      {rows.length && !loading ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-body text-fg-secondary">{L((st + 1) + '–' + Math.min(rows.length, st + per) + ' of ' + rows.length, '第 ' + (st + 1) + '–' + Math.min(rows.length, st + per) + ' 則，共 ' + rows.length + ' 則')}</span>
          <div className="flex items-center gap-3">
            <Pagination total={rows.length} pageSize={per} page={page} onPageChange={p => m.set({ page: p })} showTotal={false} prevAriaLabel={L('Previous page', '上一頁')} nextAriaLabel={L('Next page', '下一頁')} />
            <PageSize value={per} onChange={n => { setPer(n); m.set({ page: 1 }) }} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
