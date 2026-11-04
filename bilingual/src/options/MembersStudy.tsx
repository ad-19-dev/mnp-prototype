// How to see who is in an audience group or org while picking audiences (send flow, step 1). Every option
// runs on the same three audiences: an org (58 people), a group (86 people) and one person, shown in the
// receivers table as in the prototype. All mocks are live.
import * as React from 'react'
import {
  Button, DataTable, Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, MultiPersonDisplay, Tag,
} from '@qijenchen/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { BookUser, Building2, ChevronDown, ChevronRight, Search } from 'lucide-react'
import { IconBox, PAvatar, Two } from '../components/ui'
import { GROUPS, ORGS, PMAP, membersFor, orgMembers, type Person } from '../lib/data'
import { L } from '../lib/i18n'
import { useApp } from '../lib/store'

// ---------- sample audiences ----------
interface Aud { key: string; kind: 'org' | 'group' | 'person'; name: string; sub: string; people: Person[] }
function audiences(): Aud[] {
  const o = ORGS.find(x => x.code === 'PLT/ENG1')!, g = GROUPS.find(x => x.id === 'g1')!, p = PMAP.p02
  return [
    { key: 'o', kind: 'org', name: o.code, sub: o.name, people: orgMembers(o.code) },
    { key: 'g', kind: 'group', name: g.name, sub: L('Audience group', '收件群組'), people: membersFor(g).map(x => PMAP[x.pid]).filter(Boolean) },
    { key: 'p', kind: 'person', name: p.zh + ' ' + p.en, sub: p.nt + ' · ' + p.emp + ' · ' + p.org, people: [p] },
  ]
}
const kindText = (a: Aud) => (a.kind === 'org' ? L('Org', '組織') : a.kind === 'group' ? L('Group', '群組') : L('Person', '人員'))
const people = (n: number) => L(n === 1 ? '1 person' : n + ' people', n + ' 人')
function Who({ a }: { a: Aud }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {a.kind === 'person' ? <PAvatar p={a.people[0]} /> : <IconBox icon={a.kind === 'group' ? BookUser : Building2} />}
      <Two a={a.name} b={a.sub} strong />
    </span>
  )
}
const NO_HIDE = { enableHiding: false } as any

// ---------- A: today, inside the picker ----------
function OptionA() {
  const [exp, setExp] = React.useState<string | null>('g1')
  const gs = GROUPS.slice(0, 4)
  return (
    <div className="flex flex-col gap-2">
      <Input startIcon={Search} placeholder={L('Search groups', '搜尋群組')} aria-label={L('Search groups', '搜尋群組')} />
      {/* the open picker, drawn in place */}
      <div className="flex flex-col rounded-md border border-divider bg-surface p-1 shadow-sm">
        <div className="px-3 pb-1 pt-2 text-caption font-medium text-fg-secondary">{L('Your groups', '你可用的群組')}</div>
        {gs.map(g => {
          const ms = membersFor(g).map(x => PMAP[x.pid]).filter(Boolean), on = exp === g.id
          return (
            <React.Fragment key={g.id}>
              <div className="flex items-center gap-1">
                <span className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-3 py-2 hover:bg-neutral-hover">
                  <IconBox icon={BookUser} /><Two a={g.name} b={people(g.count)} strong className="flex-1" />
                </span>
                <Button variant="text" size="sm" iconOnly startIcon={on ? ChevronDown : ChevronRight} aria-expanded={on} aria-label={L('Show members of ', '查看成員：') + g.name} onClick={() => setExp(on ? null : g.id)} />
              </div>
              {on ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-neutral-1 px-3 py-2 pl-12">
                  {ms.slice(0, 6).map(p => <span key={p.id} className="inline-flex items-center gap-1 text-caption text-fg-secondary"><PAvatar p={p} size={16} />{p.en}</span>)}
                  <span className="text-caption text-fg-muted">{L('+' + (ms.length - 6) + ' more', '還有 ' + (ms.length - 6) + ' 人')}</span>
                </div>
              ) : null}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

// ---------- B, C, D: in the receivers table ----------
const col = createColumnHelper<Aud>()
const baseCols = () => [
  col.display({ id: 'who', header: L('Audience', '收件人'), meta: { width: 300 }, cell: i => <Who a={i.row.original} /> }),
  col.display({ id: 'kind', header: L('Type', '類型'), meta: { width: 90 }, cell: i => kindText(i.row.original) }),
]

// B: the DS avatar stack; hover the +N for everyone
function OptionB() {
  const cols = React.useMemo(() => [...baseCols(),
    col.display({ id: 'ppl', header: L('People', '人數'), meta: { width: 200 }, cell: i => {
      const a = i.row.original
      return (
        <span className="flex items-center gap-2">
          <MultiPersonDisplay size="sm" max={3} value={a.people.map(p => ({ name: p.en, description: p.emp + ' · ' + p.org }))} />
          {a.kind === 'person' ? null : <span className="text-caption text-fg-secondary tabular-nums">{people(a.people.length)}</span>}
        </span>
      )
    } }),
  ], [])
  return <DataTable tableOptions={NO_HIDE} columns={cols as any} data={audiences()} bordered autoRowHeight getRowId={a => a.key} />
}

// C: the count opens a dialog with a searchable member list
const mcol = createColumnHelper<Person>()
function MembersDialog({ a, onClose }: { a: Aud | null; onClose: () => void }) {
  const [q, setQ] = React.useState('')
  const list = a ? a.people.filter(p => !q.trim() || [p.zh, p.en, p.nt, p.emp, p.org].join(' ').toLowerCase().indexOf(q.trim().toLowerCase()) >= 0) : []
  const cols = React.useMemo(() => [
    mcol.display({ id: 'p', header: L('Name', '姓名'), meta: { width: 260 }, cell: i => <span className="flex min-w-0 items-center gap-2"><PAvatar p={i.row.original} /><Two a={i.row.original.zh + ' ' + i.row.original.en} b={i.row.original.nt} strong /></span> }),
    mcol.accessor('emp', { header: L('Employee ID', '工號'), meta: { width: 120 } }),
    mcol.accessor('org', { header: L('Org', '組織'), meta: { width: 120 } }),
  ], [])
  return (
    <Dialog open={!!a} onOpenChange={o => { if (!o) { onClose(); setQ('') } }}>
      {a ? (
        <DialogContent maxWidth={640} height="hug">
          <DialogHeader>
            <div className="flex flex-col gap-0.5">
              <DialogTitle>{a.name}</DialogTitle>
              <DialogDescription className="text-body text-fg-secondary">{kindText(a) + ' · ' + people(a.people.length)}</DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-[var(--layout-space-tight)]">
              <div className="w-72 max-w-full"><Input size="sm" type="search" startIcon={Search} value={q} onChange={e => setQ(e.target.value)} placeholder={L('Search name, NT or employee ID', '搜尋姓名、NT 帳號或工號')} aria-label={L('Search members', '搜尋成員')} /></div>
              <DataTable tableOptions={NO_HIDE} columns={cols as any} data={list} bordered height="340px" autoRowHeight getRowId={p => p.id} />
            </div>
          </DialogBody>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
function OptionC() {
  const [open, setOpen] = React.useState<Aud | null>(null)
  const cols = React.useMemo(() => [...baseCols(),
    col.display({ id: 'ppl', header: L('People', '人數'), meta: { width: 140 }, cell: i => {
      const a = i.row.original
      return a.kind === 'person' ? <span className="tabular-nums">1</span> : <Button variant="link" size="sm" className="!h-auto !p-0" onClick={() => setOpen(a)}>{people(a.people.length)}</Button>
    } }),
  ], [])
  return <><DataTable tableOptions={NO_HIDE} columns={cols as any} data={audiences()} bordered autoRowHeight getRowId={a => a.key} /><MembersDialog a={open} onClose={() => setOpen(null)} /></>
}

// D: DS nested rows; a group or org row opens into its members
type DRow = Aud & { sub?: string; kids?: DRow[]; member?: Person }
const dcol = createColumnHelper<DRow>()
function OptionD() {
  const [expanded, setExpanded] = React.useState({})
  const data: DRow[] = audiences().map(a => a.kind === 'person' ? a : { ...a, kids: a.people.map(p => ({ key: a.key + p.id, kind: 'person' as const, name: p.zh + ' ' + p.en, sub: p.emp + ' · ' + p.org, people: [p], member: p })) })
  const cols = React.useMemo(() => [
    dcol.display({ id: 'who', header: L('Audience', '收件人'), meta: { width: 320 }, cell: i => i.row.original.member ? <span className="flex min-w-0 items-center gap-2"><PAvatar p={i.row.original.member} /><Two a={i.row.original.name} b={i.row.original.sub} /></span> : <Who a={i.row.original} /> }),
    dcol.display({ id: 'kind', header: L('Type', '類型'), meta: { width: 90 }, cell: i => i.row.original.member ? <span className="text-fg-muted">{L('Member', '成員')}</span> : kindText(i.row.original) }),
    dcol.display({ id: 'ppl', header: L('People', '人數'), meta: { width: 100, align: 'right' }, cell: i => i.row.original.member ? null : <span className="tabular-nums">{i.row.original.people.length}</span> }),
  ], [])
  return (
    <DataTable columns={cols as any} data={data} bordered height="360px" autoRowHeight getRowId={r => r.key}
      tableOptions={{ enableHiding: false, getSubRows: (r: DRow) => r.kids, getRowCanExpand: (r: any) => !!r.original.kids, state: { expanded }, onExpandedChange: setExpanded } as any} />
  )
}

// ---------- the study ----------
type Score = 'yes' | 'part' | 'no'
const CRITERIA = () => [L('Follows the DS', '符合 DS 規範'), L('Works for big groups (300+)', '大群組（300 人以上）也好用'), L('Keyboard and touch', '鍵盤和觸控可用'), L('Stays on the page', '不離開目前畫面')]
const OPTIONS: { key: string; title: () => string; idea: () => string; good: () => string; cost: () => string; scores: Score[]; reco?: boolean; now?: boolean; Mock: () => React.ReactElement }[] = [
  { key: 'A', now: true, Mock: OptionA, scores: ['no', 'part', 'yes', 'yes'],
    title: () => L('Peek inside the picker', '在選單裡展開'),
    idea: () => L('Each group in the picker has a chevron that shows its first few members under it.', '選單裡每個群組右邊有箭頭，點開在下方列出前幾位成員。'),
    good: () => L('You can check a group before adding it.', '加入之前就能先看是誰。'),
    cost: () => L('The DS doesn’t do this: pickers are for picking, not for viewing lists, and DS menu options have no expandable parts. It only shows 6 names, and orgs have no peek.', 'DS 沒有這種做法：選擇器只負責「選」，不拿來看名單，DS 的選單選項也沒有可展開的部分。而且只看得到 6 個人，組織也沒有。') },
  { key: 'B', Mock: OptionB, scores: ['yes', 'no', 'no', 'yes'],
    title: () => L('Avatar stack with +N', '頭像堆疊加 +N'),
    idea: () => L('After adding, the People column shows the first three members as the DS avatar stack. Hover +N to see everyone; hover a face for that person’s card.', '加入後，「人數」欄用 DS 的頭像堆疊顯示前三位成員。滑鼠移到「+N」看全部名單，移到頭像看個人資訊卡。'),
    good: () => L('The DS’s own way to show “these people and N more”, and it takes no extra room.', '這是 DS 呈現「這些人和其他 N 人」的標準做法，不佔額外空間。'),
    cost: () => L('It opens on hover only: the DS says the card can’t be reached by keyboard or touch. A list of 86 or 300 names in a hover card is hard to scan, with no search.', '只能用滑鼠移上去看：DS 寫明這張卡片鍵盤和觸控都進不去。86 人或 300 人塞在浮動卡片裡很難找，也不能搜尋。') },
  { key: 'C', reco: true, Mock: OptionC, scores: ['yes', 'yes', 'yes', 'part'],
    title: () => L('Count opens a member list', '點人數，開成員清單'),
    idea: () => L('After adding, the number of people is a link. It opens a dialog with the group’s members in a DS table, with a search box.', '加入後，人數變成連結。點開是一個對話框，用 DS 表格列出成員，上方可以搜尋。'),
    good: () => L('Works the same for 5 or 300 people: search by name, NT or employee ID. Keyboard and touch work. Built only from DS parts (Dialog, Input, DataTable), the same as the failed-delivery list.', '5 人或 300 人都一樣好用，可以用姓名、NT 帳號或工號搜尋；鍵盤和觸控都能用。全部用 DS 元件組成（對話框、輸入框、表格），和「傳送失敗」名單是同一種做法。'),
    cost: () => L('Takes a click and covers the page for a moment. You can’t check a group before adding it (add it, look, remove it if wrong).', '要多點一下，對話框會暫時蓋住頁面。加入前沒辦法先看（要先加入，看了不對再移除）。') },
  { key: 'D', Mock: OptionD, scores: ['yes', 'part', 'yes', 'yes'],
    title: () => L('Rows that open into members', '表格列展開成員'),
    idea: () => L('Group and org rows in the receivers table open (DS nested rows) to list their members right under them.', '收件人表格中，群組和組織那一列可以展開（DS 表格的子列），成員直接列在下面。'),
    good: () => L('A DS table feature, no new pieces, and you never leave the table.', '是 DS 表格本來就有的功能，不用新元件，也不用離開表格。'),
    cost: () => L('A 300-person group pushes every other audience far down the table, and there’s no search inside a group.', '300 人的群組一展開，其他收件人就被擠到很下面；也沒辦法在群組內搜尋。') },
]
const markText = (s: Score) => (s === 'yes' ? L('Yes', '是') : s === 'part' ? L('Partly', '部分') : L('No', '否'))

export function MembersStudy() {
  useApp()
  return (
    <>
      <section className="opt-card">
        <h2>{L('What the DS says', 'DS 怎麼說')}</h2>
        <ul className="opt-list">
          <li>{L('Pickers (PeoplePicker, Select) are for choosing. The DS says not to use them to view a team’s members.', '選擇器（PeoplePicker、Select）只負責「選」，DS 明確說不要拿來看團隊名單。')}</li>
          <li>{L('To show many people, the DS uses an avatar stack with +N; hovering +N shows the full list. That card opens on hover only, so it can’t carry anything people must see.', '要呈現很多人，DS 用頭像堆疊加「+N」，滑鼠移到「+N」顯示完整名單。這張卡片只能用滑鼠打開，所以不能放必須看到的資訊。')}</li>
          <li>{L('The DS table supports rows that open into child rows (nested rows).', 'DS 表格支援「列展開成子列」。')}</li>
        </ul>
      </section>
      <section className="opt-card">
        <h2>{L('At a glance', '比較總表')}</h2>
        <div className="overflow-x-auto">
          <table className="opt-table">
            <thead><tr><th>{L('Option', '方案')}</th>{CRITERIA().map(c => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>{OPTIONS.map(o => <tr key={o.key} className={o.reco ? 'is-reco' : undefined}><th scope="row">{o.key}. {o.title()}</th>{o.scores.map((s, i) => <td key={i}><span className={'opt-dot is-' + s} aria-hidden />{markText(s)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </section>
      {OPTIONS.map(o => (
        <section key={o.key} className="opt-section" aria-labelledby={'mem-' + o.key}>
          <div className="opt-notes">
            <span className="opt-tag">{L('Option ', '方案 ') + o.key}</span>
            <h2 id={'mem-' + o.key}>{o.title()}</h2>
            {o.reco ? <span className="opt-reco">{L('My pick', '我的推薦')}</span> : o.now ? <span className="opt-now">{L('In the prototype now', '目前 prototype')}</span> : null}
            <p>{o.idea()}</p>
            <h3>{L('Good', '優點')}</h3><p>{o.good()}</p>
            <h3>{L('Trade-off', '取捨')}</h3><p>{o.cost()}</p>
          </div>
          <div className="opt-frame"><div className="opt-screen"><o.Mock /></div></div>
        </section>
      ))}
    </>
  )
}
