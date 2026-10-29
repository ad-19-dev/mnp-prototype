// The screens shown in the spec, built from the same DS components and helpers as the prototype.
// Each takes `pins` to show the numbered redline markers the notes refer to.
import * as React from 'react'
import {
  Badge, Button, DataTable, DescriptionItem, DescriptionList, Empty, Input, Pagination, ProgressBar, Skeleton,
  StepDescription, StepItem, StepLabel, Steps, Tag, cn,
} from '@qijenchen/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import {
  AlertTriangle, Ban, ChevronDown, CircleAlert, Copy, Download, Eye, Filter, Inbox, MoreVertical, Pencil, Plus, RotateCw, Search, Send,
} from 'lucide-react'
import { PEOPLE, PMAP, TEMPLATES, fmtN, rowChs, type Row } from '../lib/data'
import { Banner, CHN, ChIcons, NO_HIDE, PAvatar, PageSize, StatusTag, Trunc, Two } from '../components/ui'
import { L } from '../lib/i18n'
import { Pin } from './parts'
import { OTHERS, type Miss, type Scenario, type Via } from './specData'

const tplName = (id: string | null) => (id && TEMPLATES.find(t => t.id === id)?.name) || ''
const Lp = (x: [string, string]) => L(x[0], x[1])
const PinIf = ({ on, n }: { on?: boolean; n: number }) => (on ? <Pin n={n} /> : null)
const hdr = (text: string, pin?: number, on?: boolean) => () => <span className="inline-flex items-center gap-1.5">{text}{on && pin ? <Pin n={pin} /> : null}</span>

// ---------- list ----------
export function DeliveredCell({ r, onNotSent, pin }: { r: Row; onNotSent?: (r: Row) => void; pin?: boolean }) {
  const fails = (r.status === 'sent' || r.status === 'error') ? r.total - r.ok : 0
  return (
    <span className="flex w-full min-w-0 flex-col gap-1">
      <span className="text-body tabular-nums"><span className="font-medium">{r.status === 'scheduled' ? '–' : fmtN(r.ok)}</span><span className="text-fg-secondary"> / {fmtN(r.total)}</span></span>
      {r.status === 'progress' ? <ProgressBar aria-label={L('Delivery progress', '傳送進度')} value={Math.round(r.ok / Math.max(1, r.total) * 100)} /> : null}
      {fails ? (
        <span className="inline-flex items-center gap-1.5">
          <Button variant="link" size="xs" startIcon={CircleAlert} className="!h-auto !justify-start !p-0 !text-warning-text hover:!text-warning-text hover:underline" onClick={() => onNotSent?.(r)}>{L(fails + ' not sent', fails + ' 人未送達')}</Button>
          {pin ? <Pin n={9} /> : null}
        </span>
      ) : null}
    </span>
  )
}

const col = createColumnHelper<Row>()
function listColumns(pins: boolean, onTitle?: (r: Row) => void, onNotSent?: (r: Row) => void) {
  // the first row with people not reached carries pin 9
  return [
    col.accessor('sender', { id: 'sender', header: hdr(L('Sender', '寄件人'), 4, pins), meta: { width: 160 }, cell: i => <Trunc text={i.getValue()} className="font-medium" /> }),
    col.accessor(r => tplName(r.tpl), { id: 'tpl', header: L('Template', '模板'), meta: { width: 150 }, cell: i => i.getValue() ? <Trunc text={i.getValue()} /> : <span className="text-fg-muted">—</span> }),
    col.accessor('title', { header: hdr(L('Message', '標題與內容'), 5, pins), meta: { width: 400 }, cell: i => {
      const r = i.row.original, text = r.content.replace(/\s+/g, ' ')
      return (
        <span className="flex min-w-0 flex-col">
          <Trunc text={r.title} className="font-medium text-primary hover:text-primary-hover hover:underline" onClick={() => onTitle?.(r)} />
          <Trunc text={text} className="text-caption text-fg-secondary" />
        </span>
      )
    } }),
    col.display({ id: 'ch', header: hdr(L('Channels', '通道'), 6, pins), meta: { width: 120 }, cell: i => <ChIcons list={rowChs(i.row.original)} /> }),
    col.accessor('status', { header: hdr(L('Status', '狀態'), 7, pins), meta: { width: 140 }, cell: i => <StatusTag s={i.getValue()} /> }),
    col.display({ id: 'recv', header: hdr(L('Delivered', '已送達'), 8, pins), meta: { width: 160 }, cell: i => <DeliveredCell r={i.row.original} onNotSent={onNotSent} pin={pins && i.row.original.id === 'm012'} /> }),
    col.accessor('created', { header: L('Created', '建立時間'), meta: { width: 120 }, cell: i => { const p = i.getValue().split(' '); return <Two a={p[0]} b={p[1]} /> } }),
    col.accessor('creator', { header: L('Created by', '建立者'), meta: { width: 160 }, cell: i => { const p = PMAP[i.getValue()] || PEOPLE[0]; return <span className="flex min-w-0 items-center gap-2"><PAvatar p={p} /><Two a={p.en} b={p.zh} /></span> } }),
  ]
}

export type ListMode = 'data' | 'filtered' | 'noResult' | 'firstUse' | 'loading' | 'error'
export function ListScreen({ rows, mode = 'data', pins, onTitle, onNotSent, height }: {
  rows: Row[]; mode?: ListMode; pins?: boolean; onTitle?: (r: Row) => void; onNotSent?: (r: Row) => void; height?: number
}) {
  const columns = React.useMemo(() => listColumns(!!pins, onTitle, onNotSent), [pins, onTitle, onNotSent])
  const shown = mode === 'filtered' ? rows.filter(r => r.status === 'sent' || r.status === 'error') : mode === 'data' ? rows : []
  const filtering = mode === 'filtered' || mode === 'noResult'
  return (
    <div className="flex flex-col" style={height ? { height } : undefined}>
      {/* local header, as in the app: breadcrumb root + the page's main action */}
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-divider px-4">
        <span className="text-body-lg text-foreground">{L('Messages', '訊息')}</span>
        {mode === 'firstUse' ? null : <span className="inline-flex items-center gap-1.5"><PinIf on={pins} n={1} /><Button variant="primary" startIcon={Plus}>{L('New message', '新訊息')}</Button></span>}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        {mode === 'firstUse' ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <Empty icon={Inbox} title={L('No messages yet', '還沒有訊息')} description={L('Messages you and your department send will show up here.', '你和同部門寄出的訊息會顯示在這裡。')} action={<Button variant="primary" startIcon={Plus}>{L('New message', '新訊息')}</Button>} />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-64"><Input startIcon={Search} type="search" placeholder={L('Search messages', '搜尋訊息')} aria-label={L('Search messages', '搜尋訊息')} defaultValue={mode === 'noResult' ? 'chiller 3' : ''} /></div>
              <PinIf on={pins} n={2} />
              <Button variant="tertiary" startIcon={Filter} endIcon={ChevronDown} pressed={filtering} badge={filtering ? <Badge count={2} variant="low" /> : undefined}>{L('Status', '狀態')}</Button>
              <Button variant="tertiary" startIcon={Filter} endIcon={ChevronDown}>{L('Channel', '通道')}</Button>
              <PinIf on={pins} n={3} />
            </div>
            {mode === 'loading' ? (
              <div className="flex flex-col gap-0 overflow-hidden rounded-md border border-divider">
                <div className="h-10 border-b border-divider bg-neutral-1" />
                {[0, 1, 2, 3, 4].map(i => <div key={i} className="flex items-center gap-6 border-b border-divider px-3 py-4 last:border-b-0"><Skeleton className="h-4 w-28" /><Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-24" /></div>)}
              </div>
            ) : mode === 'error' ? (
              <div className="flex flex-col gap-3 rounded-md border border-divider py-12">
                <Empty icon={AlertTriangle} title={L('Couldn’t load messages', '無法載入訊息')} description={L('Check your connection and try again.', '請確認網路連線後再試一次。')} action={<Button startIcon={RotateCw}>{L('Try again', '重試')}</Button>} />
              </div>
            ) : (
              <DataTable tableOptions={NO_HIDE} columns={columns as any} data={shown} bordered height="auto" autoRowHeight getRowId={r => r.id}
                pinnedLeftColumns={['sender']}
                rowActions={(r: Row) => <span className="inline-flex items-center gap-1">{pins && r.id === LIST_PIN_ROW ? <Pin n={10} /> : null}<Button variant="text" size="xs" iconOnly startIcon={MoreVertical} aria-label={L('Actions', '操作')} /></span>}
                emptyState={<Empty icon={Search} title={L('No matching messages', '找不到符合的訊息')} description={L('Try another search or filter.', '換個關鍵字或篩選條件試試。')} action={<Button>{L('Clear filters', '清除篩選')}</Button>} />} />
            )}
            {mode === 'data' || mode === 'filtered' ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-body text-fg-secondary">
                  {L('1–' + shown.length + ' of ' + shown.length, '第 1–' + shown.length + ' 則，共 ' + shown.length + ' 則')}
                  <span className="text-fg-muted">·</span>{L('Updated 10:07', '更新於 10:07')}<PinIf on={pins} n={11} />
                </span>
                <div className="flex items-center gap-3">
                  <Pagination total={shown.length} pageSize={20} page={1} onPageChange={() => {}} showTotal={false} prevAriaLabel={L('Previous page', '上一頁')} nextAriaLabel={L('Next page', '下一頁')} />
                  <PageSize value={20} onChange={() => {}} />
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
const LIST_PIN_ROW = 'm016'

// the row menu, drawn open: what the creator sees vs. someone else in the department
export function RowMenuStatic({ own, status }: { own: boolean; status: Row['status'] }) {
  const items: { icon: typeof Eye; text: string; danger?: boolean; sep?: boolean }[] = [{ icon: Eye, text: L('View details', '查看詳情') }]
  if (own && status === 'scheduled') items.push({ icon: Pencil, text: L('Edit', '編輯') })
  items.push({ icon: Copy, text: L('Duplicate as new message', '複製成新訊息') })
  if (status === 'sent' || status === 'error') items.push({ icon: Download, text: L('Download not-sent list', '下載未送達名單') })
  if (own && status === 'error') items.push({ icon: RotateCw, text: L('Retry', '重試') })
  if (own && status === 'scheduled') items.push({ icon: Ban, text: L('Cancel schedule', '取消排程'), danger: true, sep: true })
  return (
    <div className="w-60 rounded-lg border border-divider bg-surface p-1 shadow-lg" role="presentation">
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {it.sep ? <div className="my-1 h-px bg-divider" /> : null}
          <div className={cn('flex h-8 items-center gap-2 rounded-md px-2 text-body', it.danger ? 'text-error-text' : 'text-foreground')}><it.icon className="size-4" aria-hidden />{it.text}</div>
        </React.Fragment>
      ))}
    </div>
  )
}
export { OTHERS }

// ---------- details ----------
const VIA: Record<Via, { text: [string, string]; color: 'neutral' | 'amber' | 'red' }> = {
  push: { text: ['Device Notifications', 'Device Notifications'], color: 'neutral' },
  desktop: { text: ['Desktop OS', '桌面通知'], color: 'neutral' },
  email: { text: ['Email', 'Email'], color: 'neutral' },
  sms: { text: ['Delivered via SMS', '經 SMS 送達'], color: 'amber' },
  none: { text: ['Not delivered', '未送達'], color: 'red' },
}
function H3({ children, pin, on }: { children: React.ReactNode; pin?: number; on?: boolean }) {
  return <h3 className="flex items-center gap-2 text-body font-semibold text-foreground">{children}{on && pin ? <Pin n={pin} /> : null}</h3>
}

export function DetailView({ s, pins, onNotSent, onRetry }: { s: Scenario; pins?: boolean; onNotSent?: () => void; onRetry?: () => void }) {
  const fails = s.status === 'sent' || s.status === 'error' ? s.total - s.ok : 0
  const pct = Math.round(s.ok / Math.max(1, s.total) * 100)
  const viaSms = s.chans.find(c => c.k === 'sms')
  const steps: { t: string; when: string; state?: 'error' }[] = [{ t: L('Created by ' + s.creator.en, s.creator.en + ' 建立'), when: s.created }]
  if (s.status === 'scheduled') steps.push({ t: L('Scheduled to send', '排程傳送'), when: s.sendAt || '' })
  else steps.push({ t: L('Started sending', '開始傳送'), when: s.sendAt || s.created })
  if (s.status === 'progress') steps.push({ t: L('Sending…', '傳送中…'), when: L('Updated ' + s.updated, '更新於 ' + s.updated) })
  if (s.status === 'sent') steps.push({ t: L('Done: ' + fmtN(s.ok) + ' of ' + fmtN(s.total) + ' delivered', '完成：' + fmtN(s.ok) + ' / ' + fmtN(s.total) + ' 人送達'), when: s.sendAt ? s.sendAt.slice(0, 11) + '18:24' : '' })
  if (s.status === 'error') steps.push({ t: L('Failed: nothing was delivered', '失敗：所有人都沒收到'), when: '2026/10/15 08:36', state: 'error' })
  const done = steps.filter(x => x.state !== 'error').map((_, i) => 'e' + i)
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2"><StatusTag s={s.status} /><PinIf on={pins} n={1} /></div>
        <span className="text-body-lg font-semibold text-foreground">{s.title}</span>
      </div>
      {s.err ? <Banner tone="error" title={L('Not sent', '沒有送出')} action={onRetry ? <Button size="sm" variant="secondary" startIcon={RotateCw} onClick={onRetry}>{L('Retry', '重試')}</Button> : <Button size="sm" variant="secondary" startIcon={RotateCw}>{L('Retry', '重試')}</Button>}>{Lp(s.err)}</Banner> : null}
      <DescriptionList orientation="horizontal" divided>
        <DescriptionItem label={L('Sender', '寄件人')}>{s.sender}</DescriptionItem>
        <DescriptionItem label={L('Created by', '建立者')}>{s.creator.en + ' ' + s.creator.zh}</DescriptionItem>
        <DescriptionItem label={L('Send time', '傳送時間')}>{s.sendAt}</DescriptionItem>
      </DescriptionList>

      <div className="flex flex-col gap-2">
        <H3 pin={2} on={pins}>{L('Delivery', '送達結果')}</H3>
        {s.status === 'scheduled' ? (
          <p className="text-body text-fg-secondary">{L('Sends to ' + fmtN(s.total) + ' people on ' + s.sendAt + '. Results show here once it starts.', '將於 ' + s.sendAt + ' 傳送給 ' + fmtN(s.total) + ' 人，開始後這裡會顯示結果。')}</p>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-body"><span className="text-h4 font-medium tabular-nums">{fmtN(s.ok)}</span><span className="text-fg-secondary"> / {fmtN(s.total)} {L('delivered', '人已送達')}</span></span>
              {fails ? <Button variant="link" size="sm" startIcon={CircleAlert} className="!text-warning-text hover:!text-warning-text hover:underline" onClick={onNotSent}>{L(fails + ' not sent', fails + ' 人未送達')}</Button> : null}
              {s.status === 'progress' ? <span className="text-caption text-fg-secondary">{L('Updated ' + s.updated, '更新於 ' + s.updated)}</span> : null}
            </div>
            <ProgressBar aria-label={L('Delivered', '已送達')} value={pct} status={s.status === 'error' ? 'error' : s.status === 'sent' && !fails ? 'success' : 'inProgress'} />
          </>
        )}
      </div>

      {s.chans.length ? (
        <div className="flex flex-col gap-2">
          <H3 pin={3} on={pins}>{L('By channel', '各通道結果')}</H3>
          <div className="overflow-x-auto rounded-md border border-divider">
            <table className="w-full text-body">
              <thead className="bg-neutral-1 text-left text-fg-secondary">
                <tr><th className="px-3 py-2 font-normal">{L('Channel', '通道')}</th><th className="px-3 py-2 text-right font-normal">{L('To send', '應送')}</th><th className="px-3 py-2 text-right font-normal">{L('Delivered', '已送達')}</th><th className="px-3 py-2 text-right font-normal">{L('Not sent', '未送達')}</th></tr>
              </thead>
              <tbody>
                {s.chans.map(c => {
                  const I = CHN[c.k].icon
                  return (
                    <tr key={c.k} className="border-t border-divider align-top">
                      <td className="px-3 py-2">
                        <span className={cn('flex items-center gap-2', c.fallback && 'pl-4')}>
                          <I className={cn('size-4 shrink-0', c.fallback ? 'text-warning-text' : 'text-fg-secondary')} aria-hidden />
                          <span className="flex min-w-0 flex-col"><span className="font-medium">{c.fallback ? L('SMS fallback', 'SMS 備援') : CHN[c.k].name}</span>{c.note[0] ? <span className="text-caption text-fg-secondary">{Lp(c.note)}{c.pending ? L(' · ' + fmtN(c.pending) + ' sending', '・還有 ' + fmtN(c.pending) + ' 人傳送中') : ''}</span> : null}</span>
                          {c.fallback ? <PinIf on={pins} n={4} /> : null}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtN(c.of)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtN(c.ok)}</td>
                      <td className={cn('px-3 py-2 text-right tabular-nums', c.fail ? 'text-warning-text' : 'text-fg-secondary')}>{fmtN(c.fail)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {viaSms && viaSms.ok && s.status !== 'error' ? <p className="text-caption text-fg-secondary">{L(fmtN(viaSms.ok) + ' people got it by SMS after the push didn’t reach them. They count as delivered.', fmtN(viaSms.ok) + ' 人在推播沒送達後改由 SMS 收到，算入已送達。')}</p> : null}
        </div>
      ) : null}

      {s.reasons.length ? (
        <div className="flex flex-col gap-2">
          <H3 pin={5} on={pins}>{L('Why they weren’t reached', '未送達原因')}</H3>
          <ul className="flex flex-col divide-y divide-divider rounded-md border border-divider">
            {s.reasons.map(x => <li key={x.why[0]} className="flex items-center justify-between gap-3 px-3 py-2 text-body"><span>{Lp(x.why)}</span><span className="shrink-0 tabular-nums text-fg-secondary">{L(fmtN(x.n) + ' people', fmtN(x.n) + ' 人')}</span></li>)}
          </ul>
        </div>
      ) : null}

      {s.recips.length ? (
        <div className="flex flex-col gap-2">
          <H3 pin={6} on={pins}>{L('Receivers', '收件人結果')}</H3>
          <ul className="flex flex-col divide-y divide-divider rounded-md border border-divider">
            {s.recips.map(x => (
              <li key={x.p.id} className="flex items-center gap-3 px-3 py-2">
                <PAvatar p={x.p} />
                <Two a={x.p.zh + ' ' + x.p.en} b={x.why ? Lp(x.why) : x.p.org} strong className="flex-1" />
                <Tag size="sm" color={VIA[x.via].color as any} unbounded>{Lp(VIA[x.via].text)}</Tag>
              </li>
            ))}
          </ul>
          <Button variant="link" size="sm" className="self-start !px-0">{L('See all ' + fmtN(s.total) + ' receivers', '查看全部 ' + fmtN(s.total) + ' 位收件人')}</Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <H3 pin={7} on={pins}>{L('Activity', '時間軸')}</H3>
        <Steps orientation="vertical" size="sm" value={'e' + (steps.length - 1)} completedValues={s.status === 'error' ? done.slice(0, -1) : done} errorValues={s.status === 'error' ? ['e' + (steps.length - 1)] : []}>
          {steps.map((x, i) => <StepItem key={i} value={'e' + i} state={x.state}><StepLabel>{x.t}</StepLabel><StepDescription>{x.when}</StepDescription></StepItem>)}
        </Steps>
      </div>
    </div>
  )
}

export function DetailActions({ s, pins, onClose }: { s: Scenario; pins?: boolean; onClose?: () => void }) {
  const fails = s.status === 'sent' || s.status === 'error' ? s.total - s.ok : 0
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <PinIf on={pins} n={8} />
      {s.mine && s.status === 'scheduled' ? <Button variant="text" danger startIcon={Ban}>{L('Cancel schedule', '取消排程')}</Button> : null}
      {s.mine && s.status === 'scheduled' ? <Button variant="tertiary" startIcon={Pencil}>{L('Edit', '編輯')}</Button> : null}
      {fails ? <Button variant="tertiary" startIcon={Download}>{L('Download not-sent list', '下載未送達名單')}</Button> : null}
      <Button variant="tertiary" startIcon={Copy}>{L('Duplicate', '複製成新訊息')}</Button>
      <Button variant="primary" onClick={onClose}>{L('Close', '關閉')}</Button>
    </div>
  )
}

// the side panel drawn in place (the app shows it as a DS Sheet from the right)
export function DetailPanel({ s, pins }: { s: Scenario; pins?: boolean }) {
  return (
    <div className="flex flex-col">
      <div className="p-5"><DetailView s={s} pins={pins} /></div>
      <div className="border-t border-divider p-4"><DetailActions s={s} pins={pins} /></div>
    </div>
  )
}

// ---------- people a message didn't reach ----------
const mcol = createColumnHelper<Miss>()
const missCols = () => [
  mcol.display({ id: 'who', header: L('Receiver', '收件人'), meta: { width: 220 }, cell: i => { const p = i.row.original.p; return <span className="flex min-w-0 items-center gap-2"><PAvatar p={p} /><Two a={p.zh + ' ' + p.en} b={p.emp + ' · ' + p.nt} strong /></span> } }),
  mcol.display({ id: 'org', header: L('Org', '組織'), meta: { width: 100 }, cell: i => <span className="truncate">{i.row.original.p.org}</span> }),
  mcol.display({ id: 'ch', header: L('Missed', '沒送到的通道'), meta: { width: 120 }, cell: i => <ChIcons list={i.row.original.chans} /> }),
  mcol.display({ id: 'why', header: L('Reason', '原因'), meta: { width: 260 }, cell: i => <Two a={Lp(i.row.original.why)} b={Lp(i.row.original.sms)} /> }),
]

export function NotSentView({ list, total, title, pins, onResend, many }: { list: Miss[]; total: number; title: string; pins?: boolean; onResend?: () => void; many?: boolean }) {
  const [q, setQ] = React.useState('')
  const [why, setWhy] = React.useState<string>('all')
  const reasons: { k: string; n: number; t: [string, string] }[] = []
  list.forEach(x => { const r = reasons.find(y => y.k === x.why[0]); if (r) r.n++; else reasons.push({ k: x.why[0], n: 1, t: x.why }) })
  const ql = q.trim().toLowerCase()
  const rows = list.filter(x => (why === 'all' || x.why[0] === why) && (!ql || (x.p.zh + x.p.en + x.p.nt + x.p.emp).toLowerCase().indexOf(ql) >= 0))
  const cap = 100, shown = rows.slice(0, cap)
  const cols = React.useMemo(() => missCols(), [])
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-0.5 px-5 pt-5">
        <span className="flex items-center gap-2 text-h5 font-semibold text-foreground">{L(fmtN(list.length) + ' of ' + fmtN(total) + ' not sent', fmtN(list.length) + ' / ' + fmtN(total) + ' 人未送達')}<PinIf on={pins} n={1} /></span>
        <span className="text-body text-fg-secondary">{title}</span>
      </div>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-56"><Input size="sm" startIcon={Search} type="search" placeholder={L('Search name or ID', '搜尋姓名或工號')} aria-label={L('Search name or ID', '搜尋姓名或工號')} value={q} onChange={e => setQ(e.target.value)} /></div>
          <PinIf on={pins} n={2} />
          {reasons.length > 1 ? (
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={L('Filter by reason', '依原因篩選')}>
              {[{ k: 'all', n: list.length, t: ['All', '全部'] as [string, string] }, ...reasons].map(r => (
                <Button key={r.k} size="sm" variant="tertiary" pressed={why === r.k} onClick={() => setWhy(r.k)}>{Lp(r.t)} · {fmtN(r.n)}</Button>
              ))}
            </div>
          ) : null}
        </div>
        <span className="flex items-start gap-2"><PinIf on={pins} n={3} /><span className="min-w-0 flex-1">
          <DataTable tableOptions={NO_HIDE} pinnedLeftColumns={['who']} columns={cols as any} data={shown} bordered height={many ? '320px' : 'auto'} autoRowHeight getRowId={(_, i) => String(i)}
            emptyState={<Empty icon={Search} description={L('No one matches.', '沒有符合的人。')} />} />
        </span></span>
        {rows.length > cap ? <p className="flex items-center gap-2 text-body text-fg-secondary">{L('Showing ' + cap + ' of ' + fmtN(rows.length) + '. Download for the full list.', '顯示 ' + cap + ' / ' + fmtN(rows.length) + ' 人，完整名單請下載。')}<PinIf on={pins} n={4} /></p> : null}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-divider p-4">
        <PinIf on={pins} n={5} />
        <Button variant="tertiary" startIcon={Download}>{L('Download list', '下載名單')}</Button>
        <Button variant="primary" startIcon={Send} onClick={onResend}>{L('New message to these people', '用這份名單發新訊息')}</Button>
      </div>
    </div>
  )
}

// where "New message to these people" lands: step 1 of the send flow with the receivers filled in
export function ComposePrefill({ list, title }: { list: Miss[]; title: string }) {
  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-3 text-body">
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary text-caption font-medium text-[var(--on-emphasis)]">1</span>
        <span className="font-medium">{L('Receivers & channels', '收件人與通道')}</span>
        <span className="h-px flex-1 bg-divider" />
        <span className="text-fg-muted">2 {L('Message', '訊息內容')}</span>
        <span className="h-px flex-1 bg-divider" />
        <span className="text-fg-muted">3 {L('Review & send', '確認並傳送')}</span>
      </div>
      <Banner tone="info" title={L('Receivers filled in from “' + title + '”', '已帶入「' + title + '」的未送達名單')}>{L('The original text is in step 2. Check the channels: these people had no usable device.', '原訊息內容已帶入第 2 步。請確認通道：這些人沒有可用的裝置。')}</Banner>
      <div className="flex items-center justify-between"><span className="text-body font-semibold">{L('Receivers', '收件人')}</span><span className="text-body text-fg-secondary tabular-nums">{list.length} / 500</span></div>
      <ul className="flex flex-col divide-y divide-divider rounded-md border border-divider">
        {list.slice(0, 5).map(x => <li key={x.p.id} className="flex items-center gap-3 px-3 py-2"><PAvatar p={x.p} /><Two a={x.p.zh + ' ' + x.p.en} b={x.p.emp + ' · ' + x.p.org} strong className="flex-1" /><Tag size="sm">{L('Person', '個人')}</Tag></li>)}
      </ul>
    </div>
  )
}
