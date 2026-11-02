// How the message list marks an urgent send (SMS approval skipped). Every option renders the same four
// rows in a real DS DataTable, so row height, crowding and colour can be compared directly.
import * as React from 'react'
import { DataTable, Tag, Tooltip, TooltipContent, TooltipTrigger, cn } from '@qijenchen/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { Filter, ShieldAlert, Zap } from 'lucide-react'
import { ChIcons, NO_HIDE, StatusTag } from '../components/ui'
import { FilterMenu } from '../pages/messages/List'
import type { Channel, Status } from '../lib/data'
import { L } from '../lib/i18n'

interface R { id: string; sender: string; title: string; content: string; chs: Channel[]; status: Status; created: string; urgent: boolean }
const ROWS = (): R[] => [
  { id: 'r1', sender: 'ESH Emergency', title: 'Typhoon alert: work arrangement for 10/22', content: 'Due to the typhoon warning, non-fab staff should work from home on Oct 22.', chs: ['push', 'sms', 'email'], status: 'progress', created: '2026/10/21 08:40', urgent: true },
  { id: 'r2', sender: 'ESH Emergency', title: 'Typhoon alert: work from home on 10/17', content: 'Due to the typhoon warning, non-fab staff in Hsinchu should work from home on Oct 17.', chs: ['push', 'sms'], status: 'sent', created: '2026/10/16 18:20', urgent: false },
  { id: 'r3', sender: 'F15 ESH', title: 'Gas detection drill: ERT standby at 09:00', content: 'ERT members: the gas detection drill starts at 09:00 in Fab 15 Phase 7.', chs: ['push', 'sms'], status: 'error', created: '2026/10/15 08:12', urgent: false },
  { id: 'r4', sender: 'Platform Ops', title: 'Resolved: file sync delay', content: 'The file sync delay reported at 09:40 is resolved.', chs: ['push'], status: 'sent', created: '2026/10/16 10:31', urgent: false },
]
const URGENT = () => L('Urgent: sent without SMS approval', '緊急發送：略過 SMS 核准')

// a short hint on hover and keyboard focus, as in the prototype
function Hint({ text, children }: { text: string; children: React.ReactElement }) {
  return <Tooltip><TooltipTrigger asChild>{children}</TooltipTrigger><TooltipContent>{text}</TooltipContent></Tooltip>
}
const focusable = 'inline-flex rounded-sm focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]'

type Look = 'icon' | 'status' | 'title' | 'statusIcon' | 'filter'
const col = createColumnHelper<R>()
function Table({ look }: { look: Look }) {
  const rows = ROWS()
  const columns = [
    col.accessor('sender', { header: L('Sender', '寄件人'), meta: { width: 140 }, cell: i => <span className="truncate font-medium">{i.getValue()}</span> }),
    col.accessor('title', { header: L('Message', '標題與內容'), meta: { width: 340 }, cell: i => {
      const r = i.row.original
      return (
        <span className="flex min-w-0 flex-col">
          <span className="flex min-w-0 items-center gap-1.5">
            {look === 'title' && r.urgent ? <Hint text={URGENT()}><span tabIndex={0} className={focusable}><Tag size="sm" color="red" icon={Zap}>{L('Urgent', '緊急')}</Tag></span></Hint> : null}
            <span className="truncate font-medium text-primary">{r.title}</span>
          </span>
          <span className="truncate text-caption text-fg-secondary">{r.content}</span>
        </span>
      )
    } }),
    col.display({ id: 'ch', header: L('Channels', '通道'), meta: { width: 130 }, cell: i => <ChIcons list={i.row.original.chs} urgentSms={look === 'icon' && i.row.original.urgent} /> }),
    col.accessor('status', { header: L('Status', '狀態'), meta: { width: look === 'status' ? 150 : 140 }, cell: i => {
      const r = i.row.original
      if (look === 'status') return (
        <span className="flex flex-col items-start gap-1">
          <StatusTag s={r.status} />
          {r.urgent ? <span className="inline-flex items-center gap-1 text-caption text-error-text"><ShieldAlert className="size-3" aria-hidden />{L('SMS approval skipped', '略過 SMS 核准')}</span> : null}
        </span>
      )
      if (look === 'statusIcon') return (
        <span className="flex items-center gap-1.5">
          <StatusTag s={r.status} />
          {r.urgent ? <Hint text={URGENT()}><span tabIndex={0} aria-label={URGENT()} className={cn(focusable, 'text-error-text')}><ShieldAlert className="size-4" aria-hidden /></span></Hint> : null}
        </span>
      )
      return <StatusTag s={r.status} />
    } }),
    col.accessor('created', { header: L('Created', '建立時間'), meta: { width: 110 }, cell: i => { const p = i.getValue().split(' '); return <span className="flex flex-col"><span>{p[0]}</span><span className="text-caption text-fg-secondary">{p[1]}</span></span> } }),
  ]
  return <DataTable tableOptions={NO_HIDE} columns={columns as any} data={rows} bordered autoRowHeight getRowId={r => r.id} />
}

// the filter that every option can add; option E relies on it alone
function UrgentFilter({ on, set }: { on: boolean; set: (v: boolean) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterMenu label={L('Status', '狀態')} opts={[]} sel={[]} toggle={() => {}} clear={() => {}} />
      <FilterMenu label={L('Channel', '通道')} opts={[{ k: 'urgent', n: 1, view: <span className="inline-flex items-center gap-2"><Zap className="size-4 text-fg-secondary" aria-hidden />{L('Urgent sends', '緊急發送')}</span> }]} sel={on ? ['urgent'] : []} toggle={() => set(!on)} clear={() => set(false)} />
    </div>
  )
}
function FilterOnly() {
  const [on, set] = React.useState(false)
  return (
    <div className="flex flex-col gap-[var(--layout-space-tight)]">
      <UrgentFilter on={on} set={set} />
      {on ? <FilteredTable /> : <Table look="filter" />}
      <p className="flex items-center gap-1.5 text-caption text-fg-secondary"><Filter className="size-3.5" aria-hidden />{L('Open “Channel” and tick “Urgent sends”.', '打開「通道」篩選，勾選「緊急發送」。')}</p>
    </div>
  )
}
function FilteredTable() {
  const rows = ROWS().filter(r => r.urgent)
  const columns = [
    col.accessor('sender', { header: L('Sender', '寄件人'), meta: { width: 140 } }),
    col.accessor('title', { header: L('Message', '標題與內容'), meta: { width: 340 }, cell: i => <span className="truncate font-medium text-primary">{i.getValue()}</span> }),
    col.display({ id: 'ch', header: L('Channels', '通道'), meta: { width: 130 }, cell: i => <ChIcons list={i.row.original.chs} /> }),
    col.accessor('status', { header: L('Status', '狀態'), meta: { width: 140 }, cell: i => <StatusTag s={i.getValue()} /> }),
    col.accessor('created', { header: L('Created', '建立時間'), meta: { width: 110 } }),
  ]
  return <DataTable tableOptions={NO_HIDE} columns={columns as any} data={rows} bordered autoRowHeight getRowId={r => r.id} />
}

// how each option does on the things that matter for this mark
type Score = 'yes' | 'part' | 'no'
const CRITERIA = () => [
  L('Seen without hovering', '不用滑過就看得懂'),
  L('Meaning not carried by colour alone', '不只靠顏色表達'),
  L('Row height unchanged', '列高不變'),
  L('Can’t be mistaken for a failure', '不會被誤會成失敗'),
]
const OPTIONS: { key: string; look: Look; title: () => string; idea: () => string; good: () => string; cost: () => string; scores: Score[]; reco?: boolean; now?: () => string }[] = [
  { key: 'A', look: 'icon', now: () => L('In the prototype now', '目前 prototype'),
    title: () => L('Red SMS icon in Channels', '通道欄的紅色 SMS 圖示'),
    idea: () => L('The SMS icon turns red; the tooltip explains it.', 'SMS 圖示變紅色，滑過才看到說明。'),
    good: () => L('Takes no extra space, and sits next to the channel it’s about.', '完全不佔空間，標示就在相關的通道上。'),
    cost: () => L('Red means error in the DS, so it reads as “SMS failed”. Without hovering, nobody knows what the red means.', 'DS 裡紅色代表錯誤，容易看成「SMS 發送失敗」；不滑過去就不知道紅色是什麼意思。'),
    scores: ['no', 'no', 'yes', 'no'] },
  { key: 'B', look: 'status', now: () => L('The previous version', '上一版'),
    title: () => L('Text under the status', '狀態下方加一行字'),
    idea: () => L('A red line “SMS approval skipped” under the status tag.', '狀態標籤下方加一行紅字「略過 SMS 核准」。'),
    good: () => L('Says exactly what happened, no hover needed.', '直接寫出發生什麼事，不用滑過。'),
    cost: () => L('The row gets taller and the status column crowded. Approval isn’t a delivery status, so it sits in the wrong column.', '這一列變高、狀態欄變擠。而且「略過核准」不是傳送狀態，放在狀態欄意思不對。'),
    scores: ['yes', 'yes', 'no', 'part'] },
  { key: 'C', look: 'title', reco: true,
    title: () => L('“Urgent” tag before the title', '標題前加「緊急」標籤'),
    idea: () => L('A small “Urgent” tag in front of the message title; the tooltip adds that SMS approval was skipped.', '訊息標題前面放一個小標籤「緊急」，滑過補充「略過 SMS 核准」。'),
    good: () => L('Urgent is a property of the message, and the title is where people look first. One word, readable without hovering, and the title line has room, so the row stays the same height.', '「緊急」是這則訊息本身的屬性，標題也是大家第一眼看的地方。一個詞就看得懂，標題那行有空間，列高不變。'),
    cost: () => L('The title gets a little shorter before it truncates.', '標題可顯示的字數少一點。'),
    scores: ['yes', 'yes', 'yes', 'yes'] },
  { key: 'D', look: 'statusIcon',
    title: () => L('Shield icon next to the status', '狀態旁的盾牌圖示'),
    idea: () => L('A small shield icon on the same line as the status tag; the tooltip explains it.', '狀態標籤同一行放一個小盾牌圖示，滑過才看到說明。'),
    good: () => L('Row height stays the same, and the shield hints at approval.', '列高不變，盾牌有「核准」的暗示。'),
    cost: () => L('Still a symbol you have to learn, and it’s back in the status column.', '還是要學才看得懂的符號，而且又放回狀態欄。'),
    scores: ['part', 'yes', 'yes', 'part'] },
  { key: 'E', look: 'filter',
    title: () => L('No mark; find them with a filter', '列表不標示，用篩選找'),
    idea: () => L('Rows look like any other message. “Urgent sends” is an option in the Channel filter, and the details panel keeps the full record.', '列表上看起來和一般訊息一樣。「通道」篩選多一個「緊急發送」選項，完整紀錄放在訊息詳情。'),
    good: () => L('The cleanest list. Fits people who check urgent sends now and then, like ICSD or a supervisor.', '列表最乾淨。適合偶爾才要查緊急發送的人，例如 ICSD 或主管。'),
    cost: () => L('Senders scanning the list can’t tell which messages skipped approval.', '一般使用者瀏覽列表時，看不出哪幾則是略過核准的。'),
    scores: ['no', 'yes', 'yes', 'yes'] },
]
const markText = (s: Score) => s === 'yes' ? L('Yes', '是') : s === 'part' ? L('Partly', '部分') : L('No', '否')

export function UrgentStudy() {
  return (
    <>
      <section className="opt-card">
        <h2>{L('The question', '要決定的事')}</h2>
        <p className="opt-p">{L('When someone skips SMS approval as urgent, the message list should make that visible. Each option below shows the same four messages; the first one is the urgent send.', '有人以緊急為由略過 SMS 核准時，訊息列表要能看出來。下面每個方案都用同樣四則訊息，第一則是緊急發送。')}</p>
      </section>

      <section className="opt-card">
        <h2>{L('At a glance', '比較總表')}</h2>
        <div className="overflow-x-auto">
          <table className="opt-table">
            <thead><tr><th>{L('Option', '方案')}</th>{CRITERIA().map(c => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>
              {OPTIONS.map(o => (
                <tr key={o.key} className={o.reco ? 'is-reco' : undefined}>
                  <th scope="row">{o.key}. {o.title()}</th>
                  {o.scores.map((s, i) => <td key={i}><span className={'opt-dot is-' + s} aria-hidden />{markText(s)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="opt-hint">{L('Any option can also add the “Urgent sends” filter from E.', '任何方案都可以再加上 E 的「緊急發送」篩選。')}</p>
      </section>

      {OPTIONS.map(o => (
        <section key={o.key} className="opt-section" aria-labelledby={'urg-' + o.key}>
          <div className="opt-notes">
            <span className="opt-tag">{L('Option ', '方案 ') + o.key}</span>
            <h2 id={'urg-' + o.key}>{o.title()}</h2>
            {o.reco ? <span className="opt-reco">{L('My pick', '我的推薦')}</span> : o.now ? <span className="opt-now">{o.now()}</span> : null}
            <p>{o.idea()}</p>
            <h3>{L('Good', '優點')}</h3><p>{o.good()}</p>
            <h3>{L('Trade-off', '取捨')}</h3><p>{o.cost()}</p>
          </div>
          <div className="opt-frame"><div className="opt-screen">{o.look === 'filter' ? <FilterOnly /> : <Table look={o.look} />}</div></div>
        </section>
      ))}
    </>
  )
}
