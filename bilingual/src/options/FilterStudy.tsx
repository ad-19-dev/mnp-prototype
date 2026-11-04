// The message list filtered the DS way: one Filter button in the table toolbar (text variant, icon only,
// pressed while a filter applies) opening the DS DataTableFilterPanel. A line under the toolbar says how
// many messages show and clears the filter in one click.
import * as React from 'react'
import {
  Button, DataTable, DataTableFilterPanel, Input, Popover, PopoverContent, PopoverTrigger, Tag, createEmptyFilterTree, evaluateTree,
  isFilterTreeActive, type FilterTree,
} from '@qijenchen/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { AlertTriangle, Calendar, CalendarX2, CheckCircle2, CircleX, Filter, Hourglass, Search, Send, type LucideIcon } from 'lucide-react'
import { ChIcons, NO_HIDE } from '../components/ui'
import type { Channel } from '../lib/data'
import { useApp } from '../lib/store'
import { L } from '../lib/i18n'

// the teams version's statuses (the bilingual code this page builds from only knows four)
type Status = 'pending' | 'expired' | 'rejected' | 'scheduled' | 'progress' | 'sent' | 'error'
const STATUSES: Status[] = ['pending', 'expired', 'rejected', 'scheduled', 'progress', 'sent', 'error']
const ST: Record<Status, { en: string; zh: string; color: any; icon: LucideIcon }> = {
  pending: { en: 'Pending approval', zh: '待核准', color: 'amber', icon: Hourglass },
  expired: { en: 'Scheduled expired', zh: '排程已過期', color: 'deep-orange', icon: CalendarX2 },
  rejected: { en: 'Rejected', zh: '已駁回', color: 'red', icon: CircleX },
  scheduled: { en: 'Scheduled', zh: '已排程', color: 'neutral', icon: Calendar },
  progress: { en: 'In progress', zh: '傳送中', color: 'blue', icon: Send },
  sent: { en: 'Sent', zh: '已送出', color: 'green', icon: CheckCircle2 },
  error: { en: 'Error', zh: '傳送錯誤', color: 'red', icon: AlertTriangle },
}
const StatusTag = ({ s }: { s: Status }) => <Tag size="sm" color={ST[s].color} icon={ST[s].icon}>{L(ST[s].en, ST[s].zh)}</Tag>
interface R { id: string; sender: string; tpl: string; title: string; content: string; chs: Channel[]; status: Status; created: string; sent: number; total: number }
const ROWS: R[] = [
  { id: 'a', sender: 'Platform Ops', tpl: '—', title: 'Vendor maintenance window: Sat 11/8 01:00–03:00', content: 'Our hosting vendor will patch the load balancers.', chs: ['email'], status: 'pending', created: '2026/11/03 08:50', sent: 0, total: 562 },
  { id: 'b', sender: 'Platform Ops', tpl: 'System maintenance window', title: 'tWorkspace maintenance: Fri 10/31 22:00–23:00', content: 'tWorkspace will be unavailable for a security patch.', chs: ['push', 'sms'], status: 'expired', created: '2026/10/27 10:00', sent: 0, total: 560 },
  { id: 'c', sender: 'Platform Ops', tpl: 'System maintenance window', title: 'Search service maintenance: Fri 10/24 22:00–23:00', content: 'tWorkspace search will be unavailable while we rebuild the index.', chs: ['desktop', 'email'], status: 'scheduled', created: '2026/10/21 09:30', sent: 0, total: 560 },
  { id: 'd', sender: 'Platform Ops', tpl: '—', title: 'Login errors on tWorkspace: investigating', content: 'Some people can’t sign in to tWorkspace since 14:20.', chs: ['push', 'desktop'], status: 'error', created: '2026/10/20 14:31', sent: 0, total: 560 },
  { id: 'e', sender: 'Platform Ops', tpl: '—', title: 'On-call handover: week 43', content: 'Week 43 on-call: primary Kevin Lin, secondary Grace Wu.', chs: ['push'], status: 'sent', created: '2026/10/17 09:00', sent: 24, total: 24 },
  { id: 'f', sender: 'Platform Ops', tpl: 'Incident resolved', title: 'Resolved: slow page loads in tWorkspace', content: 'The slow page loads reported at 08:50 are resolved.', chs: ['push', 'desktop'], status: 'sent', created: '2026/10/17 10:40', sent: 551, total: 560 },
  { id: 'g', sender: '—', tpl: '—', title: 'Deploy freeze starts Fri 18:00', content: 'No production deploys from Fri 18:00 to Mon 09:00.', chs: ['desktop'], status: 'sent', created: '2026/10/17 16:20', sent: 131, total: 131 },
  { id: 'h', sender: '—', tpl: 'Weekly release digest', title: 'Weekly release digest: W42', content: 'This week in tWorkspace: profile working hours, MNP send for a team.', chs: ['email'], status: 'error', created: '2026/10/16 17:00', sent: 290, total: 560 },
  { id: 'i', sender: 'Platform Ops', tpl: '—', title: 'Resolved: file sync delay', content: 'The file sync delay reported at 09:40 is resolved.', chs: ['push'], status: 'sent', created: '2026/10/16 10:31', sent: 24, total: 24 },
  { id: 'j', sender: 'Platform Ops', tpl: 'System maintenance window', title: 'tWorkspace maintenance: Sat 10/24 02:00–04:00', content: 'tWorkspace will be unavailable for a database upgrade.', chs: ['desktop'], status: 'scheduled', created: '2026/10/19 10:42', sent: 0, total: 312 },
  { id: 'k', sender: 'Platform Ops', tpl: '—', title: 'Pilot: new search beta opens Monday', content: 'Pilot users: the new search beta opens Monday.', chs: ['push', 'email'], status: 'sent', created: '2026/10/08 10:30', sent: 309, total: 312 },
  { id: 'l', sender: '—', tpl: '—', title: 'Pilot feedback survey closes Friday', content: 'Pilot users: 3 minutes, 5 questions.', chs: ['email'], status: 'sent', created: '2026/09/29 14:00', sent: 305, total: 312 },
]

const col = createColumnHelper<R>()

// the panel builds its field list from the columns that have a type; options carry the labels
function useColumns(forPanel: boolean) {
  const { lang } = useApp()
  return React.useMemo(() => {
    const ch: Record<Channel, string> = { push: 'Device Notifications', sms: L('Device Notifications (SMS)', 'Device Notifications（SMS）'), desktop: L('Desktop OS', '桌面通知'), email: 'Email' }
    const uniq = (k: 'sender' | 'tpl') => Array.from(new Set(ROWS.map(r => r[k]))).map(v => ({ value: v, label: v === '—' ? (k === 'sender' ? L('No sender name', '沒有寄件人名稱') : L('No template', '沒有模板')) : v }))
    return [
      col.accessor('sender', { header: L('Sender', '寄件人'), meta: (forPanel ? { width: 150, type: 'select', options: uniq('sender') } : { width: 150 }) as any, cell: i => <span className={i.getValue() === '—' ? 'text-fg-muted' : 'font-medium'}>{i.getValue()}</span> }),
      col.accessor('tpl', { header: L('Template', '模板'), meta: (forPanel ? { width: 170, type: 'select', options: uniq('tpl') } : { width: 170 }) as any, cell: i => <span className={i.getValue() === '—' ? 'text-fg-muted' : 'truncate'}>{i.getValue()}</span> }),
      col.accessor('title', { header: L('Title / Content', '標題 / 內容'), enableSorting: false, meta: { width: 340, filterable: false } as any, cell: i => (
        <span className="flex min-w-0 flex-col"><span className="truncate font-medium text-primary">{i.getValue()}</span><span className="truncate text-caption text-fg-secondary">{i.row.original.content}</span></span>
      ) }),
      col.accessor('chs', { header: L('Channels', '通道'), enableSorting: false, meta: (forPanel ? { width: 130, type: 'multiSelect', options: (['push', 'sms', 'desktop', 'email'] as Channel[]).map(k => ({ value: k, label: ch[k] })) } : { width: 130 }) as any, cell: i => <ChIcons list={i.getValue()} /> }),
      col.accessor('status', { header: L('Status', '狀態'), meta: (forPanel ? { width: 180, type: 'select', options: STATUSES.map(k => ({ value: k, label: L(ST[k].en, ST[k].zh) })) } : { width: 180 }) as any, cell: i => <StatusTag s={i.getValue()} /> }),
      col.accessor('created', { header: L('Created', '建立時間'), meta: { width: 130, filterable: false } as any, cell: i => { const p = i.getValue().split(' '); return <span className="flex flex-col"><span>{p[0]}</span><span className="text-caption text-fg-secondary">{p[1]}</span></span> } }),
      col.accessor('total', { header: L('Delivered', '已送達'), meta: { width: 120, filterable: false } as any, cell: i => <span className="tabular-nums"><span className="font-medium">{i.row.original.sent ? i.row.original.sent : '–'}</span><span className="text-fg-secondary"> / {i.getValue()}</span></span> }),
    ]
  }, [lang, forPanel])
}

// the panel's own words in the page language (the DS defaults are Chinese)
const panelLabels = () => L('en', 'zh') === 'zh' ? { title: '篩選' } : {
  title: 'Filter', resetToDefault: 'Reset', close: 'Close', where: 'Where', and: 'And', or: 'Or', conjunctionAriaLabel: 'And or Or, for the whole group',
  fieldPlaceholder: 'Field', fieldAriaLabel: 'Filter field', operatorPlaceholder: 'Condition', operatorAriaLabel: 'Filter condition', valuePlaceholder: 'Value…',
  singleSelectPlaceholder: 'Choose a value', multiSelectPlaceholder: 'Choose values…', multiSelectEmptyText: 'No matching values',
  filterValueAriaLabel: (c?: string) => (c ? c + ' filter value' : 'Filter value'), deleteCondition: 'Delete', addFilter: 'Add filter', addGroup: 'Add filter group',
  addNestedFilter: 'Add nested filter', removeEmptyGroup: 'Remove empty group',
  operatorLabels: { is: 'is', is_not: 'is not', is_set: 'is set', is_not_set: 'is not set', has_any_of: 'has any of', has_all_of: 'has all of', has_none_of: 'has none of' },
}

function FilteredList() {
  // the panel reads field types and options from typed columns; the table keeps its own cell designs
  const columns = useColumns(false), panelColumns = useColumns(true)
  const [q, setQ] = React.useState('')
  const [tree, setTree] = React.useState<FilterTree>(() => ({
    mode: 'flat', conjunction: 'and',
    children: [{ kind: 'cond', id: 'c1', field: 'status', op: 'is', value: ['pending', 'expired', 'error'] }],
  }))
  const [open, setOpen] = React.useState(false)
  const active = isFilterTreeActive(tree), ql = q.trim().toLowerCase()
  const rows = ROWS.filter(r => (!ql || (r.title + ' ' + r.content + ' ' + r.sender).toLowerCase().indexOf(ql) >= 0) && (!active || evaluateTree(tree, r)))
  const n = tree.mode === 'flat' ? tree.children.length : tree.children.reduce((a, g) => a + g.children.length, 0)
  const clear = () => { setTree(createEmptyFilterTree('flat')); setQ('') }
  return (
    <div className="flex flex-col gap-[var(--layout-space-tight)]">
      <div className="flex items-center gap-2">
        <div className="min-w-60 max-w-sm flex-1"><Input size="sm" startIcon={Search} type="search" placeholder={L('Search messages', '搜尋訊息')} aria-label={L('Search messages', '搜尋訊息')} value={q} onChange={e => setQ(e.target.value)} /></div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="text" size="sm" iconOnly startIcon={Filter} aria-label={L('Filter', '篩選')} pressed={active} />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <DataTableFilterPanel columns={panelColumns as any} value={tree} onChange={setTree} labels={panelLabels() as any} onClose={() => setOpen(false)} />
          </PopoverContent>
        </Popover>
      </div>
      {active || ql ? (
        <p className="flex flex-wrap items-center gap-x-2 text-body text-fg-secondary">
          {L('Showing ' + rows.length + ' of ' + ROWS.length + ' messages', '顯示 ' + ROWS.length + ' 則中的 ' + rows.length + ' 則')}
          {active ? <span>{L('· ' + n + (n === 1 ? ' filter' : ' filters'), '・' + n + ' 個篩選條件')}</span> : null}
          <Button variant="link" size="sm" onClick={clear}>{L('Clear', '清除')}</Button>
        </p>
      ) : null}
      <DataTable tableOptions={NO_HIDE} columns={columns as any} data={rows} bordered autoRowHeight getRowId={r => r.id} />
    </div>
  )
}

export function FilterStudy() {
  return (
    <>
      <section className="opt-card">
        <h2>{L('What changes from the prototype', '和現在 prototype 的差別')}</h2>
        <ul className="opt-list">
          <li>{L('Four labelled filter buttons (Status, Channel, Sender, Template) become one Filter button with only an icon, as in the DS table toolbar.', '四顆有文字的篩選按鈕（狀態、通道、寄件人、模板）合成一顆只有圖示的「篩選」按鈕，和 DS 表格工具列一致。')}</li>
          <li>{L('It opens the DS filter panel: one row per condition (field, condition, values). Status, Channel, Sender and Template all take several values.', '點開是 DS 的篩選面板：一列一個條件（欄位、比較方式、值），狀態、通道、寄件人、模板都能多選。')}</li>
          <li>{L('While a filter applies, the button stays pressed, and a line under the toolbar says how many messages show, with Clear.', '有篩選時按鈕維持按下狀態，工具列下方多一行「顯示幾則中的幾則」，旁邊可以一鍵清除。')}</li>
          <li>{L('Sorting stays on the column headers, so the toolbar needs no Sort button.', '排序維持點表頭，所以工具列不需要另外的排序按鈕。')}</li>
        </ul>
      </section>
      <section className="opt-card">
        <h2>{L('Try it', '試試看')}</h2>
        <p className="opt-p">{L('It opens with one condition already set: Status is Pending approval, Scheduled expired or Error. Open Filter to change it or add another, for example Channels has any of Email.', '一開始已經套用一個條件：狀態是「待核准、排程已過期、傳送錯誤」。點「篩選」可以修改，或再加一個條件，例如「通道 含其中之一 Email」。')}</p>
      </section>
      <div className="opt-frame"><div className="opt-screen"><FilteredList /></div></div>
      <section className="opt-card">
        <h2>{L('Trade-offs', '取捨')}</h2>
        <ul className="opt-list">
          <li>{L('Good: one entry point, the same as every DS table; conditions can combine with And or Or, and the toolbar stays short as filters grow.', '優點：只有一個入口，和所有 DS 表格一致；條件可以用 And / Or 組合，之後要加更多可篩選的欄位，工具列也不會變長。')}</li>
          <li>{L('Cost: filtering by status takes two more clicks than before (pick the field, then the values), and the panel is heavier for people who just want one quick filter.', '代價：只想篩一個狀態時，比原本多點兩下（先選欄位，再選值）；對只想快速篩一下的人，面板比較重。')}</li>
        </ul>
      </section>
    </>
  )
}
