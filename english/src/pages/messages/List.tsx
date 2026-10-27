// Messages list: search, filters, table with row actions and pagination
import * as React from 'react'
import {
  Badge, Button, DataTable, DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Empty, Input, Pagination, ProgressBar, Tag,
} from '@qijenchen/design-system'
import { NO_HIDE } from '../../components/ui'
import { createColumnHelper } from '@tanstack/react-table'
import { Ban, ChevronDown, CircleAlert, Copy, Download, Eye, Filter, MoreVertical, Pencil, RotateCw, Search } from 'lucide-react'
import { PEOPLE, PMAP, fmtN, plural, rowChs, type Channel, type Row, type Status } from '../../lib/data'
import { flash, useApp } from '../../lib/store'
import { CHN, ChIcons, PAvatar, PageIntro, STATUS, StatusTag, Two } from '../../components/ui'
import type { SendCtl } from './ctl'

const col = createColumnHelper<Row>()

function RowMenu({ m, r }: { m: SendCtl; r: Row }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="text" size="xs" iconOnly startIcon={MoreVertical} aria-label={'Actions for ' + r.title} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" minWidth={208}>
        <DropdownMenuItem startIcon={Eye} onSelect={() => m.set({ det: r.id })}>View details</DropdownMenuItem>
        {r.status === 'scheduled' ? <DropdownMenuItem startIcon={Pencil} onSelect={() => m.startCompose('edit', r)}>Edit</DropdownMenuItem> : null}
        <DropdownMenuItem startIcon={Copy} onSelect={() => m.startCompose('duplicate', r)}>Duplicate</DropdownMenuItem>
        {r.status === 'error' ? <DropdownMenuItem startIcon={RotateCw} onSelect={() => m.retry(r.id)}>Retry sending</DropdownMenuItem> : null}
        {r.status === 'sent' ? <DropdownMenuItem startIcon={Download} onSelect={() => flash('Downloading the delivery report for “' + r.title + '”.')}>Download report</DropdownMenuItem> : null}
        {r.status === 'scheduled' ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem startIcon={Ban} className="text-error-text" onSelect={() => m.askCancel(r)}>Cancel schedule</DropdownMenuItem>
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
        <DropdownMenuItem disabled={!sel.length} onSelect={clear}>{sel.length ? 'Clear ' + sel.length + ' selected' : 'Showing all'}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function SendList({ m }: { m: SendCtl }) {
  const s = m.s, app = useApp(), rows = m.filtered()
  const per = 10, pagesN = Math.max(1, Math.ceil(rows.length / per)), page = Math.min(s.page, pagesN), st = (page - 1) * per
  const pageRows = rows.slice(st, st + per)
  const chips = s.fS.map(k => ({ label: 'Status: ' + STATUS[k].label, remove: () => m.toggleIn('fS', k) }))
    .concat(s.fC.map(k => ({ label: 'Channel: ' + CHN[k].name, remove: () => m.toggleIn('fC', k) })))
  const clearAll = () => m.set({ fS: [], fC: [], q: '', page: 1 })
  const stOpts = (['scheduled', 'progress', 'sent', 'error'] as Status[]).map(k => ({ k, n: app.rows.filter(r => r.status === k).length, view: <StatusTag s={k} /> }))
  const chOpts = (['push', 'sms', 'desktop', 'email'] as Channel[]).map(k => {
    const I = CHN[k].icon
    return { k, n: app.rows.filter(r => rowChs(r).indexOf(k) >= 0).length, view: <span className="inline-flex items-center gap-2"><I className="size-4 text-fg-secondary" aria-hidden />{CHN[k].name}</span> }
  })

  const columns = React.useMemo(() => [
    col.accessor('sender', { id: 'sender', header: 'Sender name', meta: { width: 150 }, cell: i => <span className="truncate font-medium" title={i.getValue()}>{i.getValue()}</span> }),
    col.accessor(r => m.tplName(r.tpl), { id: 'tpl', header: 'Template name', meta: { width: 150 }, cell: i => i.getValue() ? <span className="truncate" title={i.getValue()}>{i.getValue()}</span> : <span className="text-fg-muted">—</span> }),
    col.accessor('title', { header: 'Title', meta: { width: 230 }, cell: i => <button type="button" className="min-w-0 truncate text-left font-medium text-primary hover:text-primary-hover hover:underline focus-visible:outline-2 focus-visible:outline-ring" title={i.getValue()} onClick={() => m.set({ det: i.row.original.id })}>{i.getValue()}</button> }),
    col.accessor('content', { header: 'Content', meta: { width: 220 }, cell: i => <span className="truncate text-fg-secondary" title={i.getValue()}>{i.getValue().replace(/\s+/g, ' ')}</span> }),
    col.display({ id: 'ch', header: 'Send channel', meta: { width: 130 }, cell: i => <ChIcons list={rowChs(i.row.original)} /> }),
    col.accessor('status', { header: 'Status', meta: { width: 140 }, cell: i => <StatusTag s={i.getValue()} /> }),
    col.accessor('created', { header: 'Create time', meta: { width: 120 }, cell: i => { const p = i.getValue().split(' '); return <Two a={p[0]} b={p[1]} /> } }),
    col.display({ id: 'recv', header: 'Receiver', meta: { width: 160 }, cell: i => {
      const r = i.row.original, fails = (r.status === 'sent' || r.status === 'error') ? r.total - r.ok : 0
      return (
        <span className="flex w-full min-w-0 flex-col gap-1">
          <span className="text-body tabular-nums"><span className="font-medium">{r.status === 'scheduled' ? '–' : fmtN(r.ok)}</span><span className="text-fg-secondary"> / {fmtN(r.total)}</span></span>
          {r.status === 'progress' ? <ProgressBar aria-label="Delivery progress" value={Math.round(r.ok / Math.max(1, r.total) * 100)} /> : null}
          {fails ? <Button variant="link" size="xs" startIcon={CircleAlert} className="!h-auto !justify-start !p-0 !text-warning-text hover:!text-warning-text hover:underline" onClick={() => m.set({ ns: r.id })}>{fails} not sent</Button> : null}
        </span>
      )
    } }),
    col.accessor('sched', { header: 'Scheduled time', meta: { width: 130 }, cell: i => { const v = i.getValue(); if (!v) return <span className="text-fg-muted">—</span>; const p = v.split(' '); return <Two a={p[0]} b={p[1]} /> } }),
    col.accessor('creator', { header: 'Creator', meta: { width: 170 }, cell: i => { const p = PMAP[i.getValue()] || PEOPLE[0]; return <span className="flex min-w-0 items-center gap-2"><PAvatar p={p} /><Two a={p.en} b={p.zh} /></span> } }),
  ], [m])

  return (
    <div className="flex h-full flex-col gap-[var(--layout-space-loose)] p-[var(--layout-space-loose)]">
      <PageIntro title="Messages" sub="Messages you’ve scheduled or sent" />
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-60 max-w-sm flex-1">
          <Input startIcon={Search} type="search" placeholder="Search title, content, sender or template" aria-label="Search messages" value={s.q} onChange={e => m.set({ q: e.target.value, page: 1 })} />
        </div>
        <FilterMenu label="Status" opts={stOpts} sel={s.fS} toggle={k => m.toggleIn('fS', k)} clear={() => m.set({ fS: [], page: 1 })} />
        <FilterMenu label="Send channel" opts={chOpts} sel={s.fC} toggle={k => m.toggleIn('fC', k)} clear={() => m.set({ fC: [], page: 1 })} />
        <div className="ml-auto">
          <Button variant="tertiary" startIcon={Download} onClick={() => flash('Exporting ' + plural(rows.length, 'message') + ' to MNP_messages.xlsx.')}>Download</Button>
        </div>
      </div>
      {chips.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-body text-fg-secondary">{plural(rows.length, 'result')}</span>
          {chips.map(f => <Tag key={f.label} size="md" onRemove={f.remove} removeAriaLabel={'Remove filter ' + f.label}>{f.label}</Tag>)}
          <Button variant="link" size="sm" onClick={clearAll}>Clear all</Button>
        </div>
      ) : null}
      <DataTable tableOptions={NO_HIDE}
        columns={columns as any}
        data={pageRows}
        bordered
        height="100%"
        autoRowHeight
        getRowId={r => r.id}
        pinnedLeftColumns={['sender']}
        rowActions={(r: Row) => <RowMenu m={m} r={r} />}
        emptyState={<Empty icon={Search} title="No messages match" description="Try a different search, or clear the filters." action={<Button onClick={clearAll}>Clear search and filters</Button>} />}
      />
      {rows.length ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-body text-fg-secondary">Showing {st + 1}–{Math.min(rows.length, st + per)} of {plural(rows.length, 'message')}</span>
          <Pagination total={rows.length} pageSize={per} page={page} onPageChange={p => m.set({ page: p })} showTotal={false} prevAriaLabel="Previous page" nextAriaLabel="Next page" />
        </div>
      ) : null}
    </div>
  )
}
