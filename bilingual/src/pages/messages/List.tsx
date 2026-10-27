// Messages list: search, filters, table with row actions and pagination
import * as React from 'react'
import {
  Badge, Button, DataTable, DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Empty, Input, Pagination, ProgressBar,
} from '@qijenchen/design-system'
import { NO_HIDE } from '../../components/ui'
import { createColumnHelper } from '@tanstack/react-table'
import { Ban, ChevronDown, CircleAlert, Copy, Download, Eye, Filter, MoreVertical, Pencil, RotateCw, Search } from 'lucide-react'
import { PEOPLE, PMAP, fmtN, plural, rowChs, type Channel, type Row, type Status } from '../../lib/data'
import { flash, useApp } from '../../lib/store'
import { CHN, ChIcons, PAvatar, StatusTag, Two } from '../../components/ui'
import { L, P } from '../../lib/i18n'
import type { SendCtl } from './ctl'

const col = createColumnHelper<Row>()

function RowMenu({ m, r }: { m: SendCtl; r: Row }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="text" size="xs" iconOnly startIcon={MoreVertical} aria-label={L('Actions for ', '操作：') + r.title} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" minWidth={208}>
        <DropdownMenuItem startIcon={Eye} onSelect={() => m.set({ det: r.id })}>{L('View details', '查看詳情')}</DropdownMenuItem>
        {r.status === 'scheduled' ? <DropdownMenuItem startIcon={Pencil} onSelect={() => m.startCompose('edit', r)}>{L('Edit', '編輯')}</DropdownMenuItem> : null}
        <DropdownMenuItem startIcon={Copy} onSelect={() => m.startCompose('duplicate', r)}>{L('Duplicate', '複製')}</DropdownMenuItem>
        {r.status === 'error' ? <DropdownMenuItem startIcon={RotateCw} onSelect={() => m.retry(r.id)}>{L('Retry', '重新傳送')}</DropdownMenuItem> : null}
        {r.status === 'sent' ? <DropdownMenuItem startIcon={Download} onSelect={() => flash(L('Downloading report', '下載報表中'), 'ok', r.title)}>{L('Download report', '下載報表')}</DropdownMenuItem> : null}
        {r.status === 'scheduled' ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem startIcon={Ban} className="text-error-text" onSelect={() => m.askCancel(r)}>{L('Cancel schedule', '取消排程')}</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FilterMenu<K extends string>({ label, opts, sel, toggle, clear }: {
  label: string; sel: K[]; toggle: (k: K) => void; clear: () => void
  opts: { k: K; view: React.ReactNode; n: number }[]
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="tertiary" startIcon={Filter} endIcon={ChevronDown} pressed={sel.length > 0} badge={sel.length ? <Badge count={sel.length} variant="low" /> : undefined}>{label}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" minWidth={260}>
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          {opts.map(o => (
            <DropdownMenuCheckboxItem key={o.k} checked={sel.indexOf(o.k) >= 0} onCheckedChange={() => toggle(o.k)} onSelect={e => e.preventDefault()}>
              <span className="flex w-full items-center justify-between gap-3">{o.view}<span className="text-caption text-fg-muted tabular-nums">{o.n}</span></span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={!sel.length} onSelect={clear}>{sel.length ? L('Clear', '清除') : L('Showing all', '全部顯示中')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function SendList({ m }: { m: SendCtl }) {
  const s = m.s, app = useApp(), rows = m.filtered()
  const per = 10, pagesN = Math.max(1, Math.ceil(rows.length / per)), page = Math.min(s.page, pagesN), st = (page - 1) * per
  const pageRows = rows.slice(st, st + per)
  const clearAll = () => m.set({ fS: [], fC: [], q: '', page: 1 })
  const stOpts = (['scheduled', 'progress', 'sent', 'error'] as Status[]).map(k => ({ k, n: app.rows.filter(r => r.status === k).length, view: <StatusTag s={k} /> }))
  const chOpts = (['push', 'sms', 'desktop', 'email'] as Channel[]).map(k => {
    const I = CHN[k].icon
    return { k, n: app.rows.filter(r => rowChs(r).indexOf(k) >= 0).length, view: <span className="inline-flex items-center gap-2"><I className="size-4 text-fg-secondary" aria-hidden />{CHN[k].name}</span> }
  })

  const columns = React.useMemo(() => [
    col.accessor('sender', { id: 'sender', header: L('Sender', '寄件人'), meta: { width: 150 }, cell: i => <span className="truncate font-medium" title={i.getValue()}>{i.getValue()}</span> }),
    col.accessor(r => m.tplName(r.tpl), { id: 'tpl', header: L('Template', '模板'), meta: { width: 150 }, cell: i => i.getValue() ? <span className="truncate" title={i.getValue()}>{i.getValue()}</span> : <span className="text-fg-muted">—</span> }),
    col.accessor('title', { header: L('Title', '標題'), meta: { width: 230 }, cell: i => <button type="button" className="min-w-0 truncate text-left font-medium text-primary hover:text-primary-hover hover:underline focus-visible:outline-2 focus-visible:outline-ring" title={i.getValue()} onClick={() => m.set({ det: i.row.original.id })}>{i.getValue()}</button> }),
    col.accessor('content', { header: L('Content', '內容'), meta: { width: 220 }, cell: i => <span className="truncate text-fg-secondary" title={i.getValue()}>{i.getValue().replace(/\s+/g, ' ')}</span> }),
    col.display({ id: 'ch', header: L('Channels', '通道'), meta: { width: 130 }, cell: i => <ChIcons list={rowChs(i.row.original)} /> }),
    col.accessor('status', { header: L('Status', '狀態'), meta: { width: 140 }, cell: i => <StatusTag s={i.getValue()} /> }),
    col.accessor('created', { header: L('Created', '建立時間'), meta: { width: 120 }, cell: i => { const p = i.getValue().split(' '); return <Two a={p[0]} b={p[1]} /> } }),
    col.display({ id: 'recv', header: L('Delivered', '已送達'), meta: { width: 160 }, cell: i => {
      const r = i.row.original, fails = (r.status === 'sent' || r.status === 'error') ? r.total - r.ok : 0
      return (
        <span className="flex w-full min-w-0 flex-col gap-1">
          <span className="text-body tabular-nums"><span className="font-medium">{r.status === 'scheduled' ? '–' : fmtN(r.ok)}</span><span className="text-fg-secondary"> / {fmtN(r.total)}</span></span>
          {r.status === 'progress' ? <ProgressBar aria-label={L('Delivery progress', '傳送進度')} value={Math.round(r.ok / Math.max(1, r.total) * 100)} /> : null}
          {fails ? <Button variant="link" size="xs" startIcon={CircleAlert} className="!h-auto !justify-start !p-0 !text-warning-text hover:!text-warning-text hover:underline" onClick={() => m.set({ ns: r.id })}>{L(fails + ' not sent', fails + ' 人未送達')}</Button> : null}
        </span>
      )
    } }),
    col.accessor('sched', { header: L('Scheduled', '排程時間'), meta: { width: 130 }, cell: i => { const v = i.getValue(); if (!v) return <span className="text-fg-muted">—</span>; const p = v.split(' '); return <Two a={p[0]} b={p[1]} /> } }),
    col.accessor('creator', { header: L('Created by', '建立者'), meta: { width: 170 }, cell: i => { const p = PMAP[i.getValue()] || PEOPLE[0]; return <span className="flex min-w-0 items-center gap-2"><PAvatar p={p} /><Two a={p.en} b={p.zh} /></span> } }),
  ], [m, app.lang])

  return (
    <div className="flex h-full flex-col gap-[var(--layout-space-loose)] p-[var(--layout-space-loose)]">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-60 max-w-sm flex-1">
          <Input startIcon={Search} type="search" placeholder={L('Search messages', '搜尋訊息')} aria-label={L('Search messages', '搜尋訊息')} value={s.q} onChange={e => m.set({ q: e.target.value, page: 1 })} />
        </div>
        <FilterMenu label={L('Status', '狀態')} opts={stOpts} sel={s.fS} toggle={k => m.toggleIn('fS', k)} clear={() => m.set({ fS: [], page: 1 })} />
        <FilterMenu label={L('Channel', '通道')} opts={chOpts} sel={s.fC} toggle={k => m.toggleIn('fC', k)} clear={() => m.set({ fC: [], page: 1 })} />
        <div className="ml-auto">
          <Button variant="tertiary" startIcon={Download} onClick={() => flash(L('Exporting ', '匯出 ') + P(rows.length, 'message', '則訊息'), 'ok', 'MNP_messages.xlsx')}>{L('Export', '匯出')}</Button>
        </div>
      </div>
      <DataTable tableOptions={NO_HIDE}
        columns={columns as any}
        data={pageRows}
        bordered
        height="100%"
        autoRowHeight
        getRowId={r => r.id}
        pinnedLeftColumns={['sender']}
        rowActions={(r: Row) => <RowMenu m={m} r={r} />}
        emptyState={<Empty icon={Search} title={L('No matching messages', '找不到符合的訊息')} description={L('Try another search or filter.', '換個關鍵字或篩選條件試試。')} action={<Button onClick={clearAll}>{L('Clear filters', '清除篩選')}</Button>} />}
      />
      {rows.length ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-body text-fg-secondary">{L((st + 1) + '–' + Math.min(rows.length, st + per) + ' of ' + rows.length, '第 ' + (st + 1) + '–' + Math.min(rows.length, st + per) + ' 則，共 ' + rows.length + ' 則')}</span>
          <Pagination total={rows.length} pageSize={per} page={page} onPageChange={p => m.set({ page: p })} showTotal={false} prevAriaLabel={L('Previous page', '上一頁')} nextAriaLabel={L('Next page', '下一頁')} />
        </div>
      ) : null}
    </div>
  )
}
