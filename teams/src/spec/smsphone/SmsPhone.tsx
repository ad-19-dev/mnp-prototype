// Comparison for PM: when Device Notifications (SMS) is on, how the sender adds personal phones.
// A: one switch for everyone (company phone always, personal phone opt-in). B: per audience row, as GMC does.
// Both demos are live and use the same sample audiences; nothing here changes the prototype.
import * as React from 'react'
import { Avatar, Checkbox, Tag } from '@qijenchen/design-system'
import { Building2, Phone, Smartphone, Users } from 'lucide-react'
import { Notes, Section, SpecTable } from '../parts'
import { avatarUrl } from '../../lib/avatar'

// SMS only goes to people the push can't reach. Per audience row: how many of them, and how many have each phone.
type Row = { id: string; kind: 'person' | 'org' | 'group' | 'ext'; name: string; tag?: string; size?: number; miss: number; co: number; pp: number }
const ROWS: Row[] = [
  { id: 'p1', kind: 'person', name: 'Grace Wu 吳佳穎', miss: 1, co: 1, pp: 1 },
  { id: 'p2', kind: 'person', name: 'Jimmy Chen 陳志明', miss: 1, co: 1, pp: 0 },
  { id: 'o1', kind: 'org', name: 'PENG', tag: 'Org', size: 58, miss: 6, co: 5, pp: 4 },
  { id: 'g1', kind: 'group', name: 'UX Team', tag: 'Group', size: 9, miss: 2, co: 2, pp: 1 },
  { id: 'x1', kind: 'ext', name: '0987-654-321', tag: 'External phone', miss: 1, co: 0, pp: 0 },
]
const sum = (f: (r: Row) => number, rows = ROWS) => rows.reduce((a, r) => a + f(r), 0)

function Who({ r }: { r: Row }) {
  const I = r.kind === 'org' ? Building2 : r.kind === 'group' ? Users : Phone
  return (
    <span className="flex min-w-0 items-center gap-2">
      {r.kind === 'person'
        ? <Avatar size={24} src={avatarUrl({ id: r.id, en: r.name } as any)} alt={r.name} />
        : <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted"><I className="size-3.5 text-fg-secondary" aria-hidden /></span>}
      <span className="truncate text-body">{r.name}</span>
      {r.tag ? <Tag size="sm" color="neutral">{r.tag}</Tag> : null}
      {r.size ? <span className="shrink-0 text-body text-primary">{r.size} people</span> : null}
    </span>
  )
}

// the part of Step 1 both options share: the channel card and the SMS fallback checkbox
function SmsBox({ on, setOn, children }: { on: boolean; setOn: (v: boolean) => void; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-lg border border-primary bg-primary-subtle/40 p-3">
        <span className="inline-flex size-6 items-center justify-center rounded-md bg-info-subtle text-info-text"><Smartphone className="size-4" aria-hidden /></span>
        <span className="flex flex-col"><span className="text-body font-semibold">Device Notifications</span><span className="text-caption text-fg-secondary">Push to the app on company phones.</span></span>
      </div>
      <Checkbox checked={on} onCheckedChange={v => setOn(!!v)}
        label={<span className="inline-flex items-center gap-2">Device Notifications (SMS)<Tag size="sm" color="amber">Need ICSD Approval</Tag></span>}
        description="Send an SMS to anyone the push doesn’t reach." />
      {children}
    </div>
  )
}

// ---------- A: one switch ----------
function OptionA() {
  const [on, setOn] = React.useState(true), [pp, setPp] = React.useState(false)
  const co = sum(r => r.co), ppN = sum(r => r.pp), ext = sum(r => (r.kind === 'ext' ? 1 : 0))
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-divider p-4">
        <div className="flex flex-col gap-1 pb-3"><span className="text-h6 font-bold">Audiences</span><span className="text-caption text-fg-secondary">表格不變，只列出選了誰。</span></div>
        <div className="flex flex-col divide-y divide-divider rounded-md border border-divider">{ROWS.map(r => <div key={r.id} className="px-3 py-2"><Who r={r} /></div>)}</div>
      </div>
      <div className="rounded-md border border-divider p-4">
        <SmsBox on={on} setOn={setOn}>
          {on ? (
            <div className="ml-7 flex flex-col gap-2 rounded-lg border border-divider p-3">
              <span className="text-body font-medium">Send the SMS to</span>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <Checkbox checked disabled label="Company phone (always)" />
                <Checkbox checked={pp} onCheckedChange={v => setPp(!!v)} label="Personal phone" />
              </div>
              <span className="text-caption text-fg-secondary">
                {sum(r => r.miss)} people the push can’t reach: {co} company phones{pp ? ' + ' + ppN + ' personal phones' : ''}{ext ? ', ' + ext + ' external phone' : ''}.
              </span>
            </div>
          ) : null}
        </SmsBox>
      </div>
    </div>
  )
}

// ---------- B: per audience row (GMC) ----------
function OptionB() {
  const [on, setOn] = React.useState(true)
  const [co, setCo] = React.useState<Record<string, boolean>>(() => Object.fromEntries(ROWS.map(r => [r.id, true])))
  const [pp, setPp] = React.useState<Record<string, boolean>>({})
  const rows = ROWS.filter(r => r.kind !== 'ext')
  const all = (m: Record<string, boolean>) => rows.every(r => m[r.id]), some = (m: Record<string, boolean>) => rows.some(r => m[r.id])
  const head = (m: Record<string, boolean>, set: (m: Record<string, boolean>) => void) => (
    <Checkbox checked={all(m) ? true : some(m) ? 'indeterminate' : false} onCheckedChange={() => set(Object.fromEntries(rows.map(r => [r.id, !all(m)])))} aria-label="All" />
  )
  const coN = sum(r => (co[r.id] ? r.co : 0)), ppN = sum(r => (pp[r.id] ? r.pp : 0)), none = rows.filter(r => !co[r.id] && !pp[r.id] && r.miss).length
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-divider p-4">
        <div className="flex flex-col gap-1 pb-3"><span className="text-h6 font-bold">Audiences</span><span className="text-caption text-fg-secondary">勾了 SMS 備援，表格才多出兩欄；預設全部勾公務機。</span></div>
        <div className="overflow-x-auto rounded-md border border-divider">
          <table className="w-full min-w-[560px] text-left text-body">
            <thead className="bg-neutral-1 text-fg-secondary">
              <tr>
                <th className="px-3 py-2 font-medium">Audience</th>
                {on ? <th className="w-40 px-3 py-2 font-medium"><span className="inline-flex items-center gap-2">{head(co, setCo)}Company phone</span></th> : null}
                {on ? <th className="w-40 px-3 py-2 font-medium"><span className="inline-flex items-center gap-2">{head(pp, setPp)}Personal phone</span></th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {ROWS.map(r => (
                <tr key={r.id}>
                  <td className="px-3 py-2"><Who r={r} /></td>
                  {on ? (r.kind === 'ext'
                    ? <td colSpan={2} className="px-3 py-2 text-caption text-fg-secondary">The SMS goes to this number</td>
                    : <>
                      <td className="px-3 py-2"><Checkbox checked={!!co[r.id]} onCheckedChange={v => setCo({ ...co, [r.id]: !!v })} aria-label={'Company phone: ' + r.name} /></td>
                      <td className="px-3 py-2"><Checkbox checked={!!pp[r.id]} onCheckedChange={v => setPp({ ...pp, [r.id]: !!v })} aria-label={'Personal phone: ' + r.name} /></td>
                    </>) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="rounded-md border border-divider p-4">
        <SmsBox on={on} setOn={setOn}>
          {on ? (
            <span className="ml-7 text-caption text-fg-secondary">
              {sum(r => r.miss)} people the push can’t reach: {coN} company phones{ppN ? ' + ' + ppN + ' personal phones' : ''}.
              {none ? <span className="text-error-text"> {none} rows have neither phone checked and won’t get the SMS.</span> : null}
            </span>
          ) : null}
        </SmsBox>
      </div>
    </div>
  )
}

export default function SmsPhone() {
  return (
    <>
      <div className="spec-top">
        <div className="spec-wrap flex flex-col gap-1 pt-4 pb-3">
          <span className="spec-eyebrow">MNP · New message 步驟 1 · 比較方案</span>
          <h1 className="spec-h1">SMS 寄到哪支手機</h1>
          <span className="text-caption text-fg-secondary">2026/11/09 · 勾了 Device Notifications (SMS) 時，寄件人怎麼決定要不要加寄私人手機。兩個方案都可以直接操作；這頁不影響原型。</span>
        </div>
      </div>
      <main className="spec-wrap spec-main">
        <Section eyebrow="Context" title="要解決的問題" lead="現在一律寄公務機、沒有公務機才寄私人手機，寄件人沒辦法要求加寄私人手機。PM 與設計討論後，方向是：預設寄公務機，需要時再加寄私人手機（和 GMC 的預設一致）。剩下要決定的是「怎麼加」。">
          <Notes items={[
            { title: 'SMS 只寄給推播收不到的人', body: '加寄私人手機也只影響這一小群人，不是所有收件人。' },
            { title: '外部電話不受影響', body: '外部電話本來就只收 SMS，寄到使用者輸入的那支號碼。' },
            { title: '兩個方案都不用對調步驟順序', body: '通道卡片上「n / total people can receive」的人數可以照樣保留。' },
          ]} />
        </Section>

        <Section eyebrow="Option A" title="方案 A：一個開關，套用到所有人" lead="勾了 SMS 備援之後，下方多一行「Send the SMS to」：Company phone 固定勾選，Personal phone 要加寄才勾。勾了就是所有推播收不到、而且有私人手機的人都會多收一封。">
          <OptionA />
        </Section>

        <Section eyebrow="Option B" title="方案 B：每一列收件人各自勾選（GMC 的做法）" lead="勾了 SMS 備援之後，收件人表格多出 Company phone、Personal phone 兩欄；預設每列都勾公務機，表頭可以全選。組織與群組是整列一起勾，不是逐人。">
          <OptionB />
        </Section>

        <Section eyebrow="Compare" title="比較">
          <SpecTable head={['', 'A：一個開關', 'B：每列勾選']} nowrap={[0]} rows={[
            ['加寄私人手機要幾步', '1 下', '每列 1 下；或表頭全選 1 下'],
            ['收件人很多時（例：一個 500 人的組織加 20 列）', '一樣是 1 下', '要逐列看、逐列勾；全選又等同方案 A'],
            ['彈性', '只能全部加或全部不加', '可以只加某個組織或群組'],
            ['寄件人需要知道什麼', '只要知道「這次要不要多一條路」', '要知道哪一列的人需要私人手機（通常不知道）'],
            ['版面', '收件人表格不變；選項就在 SMS 備援旁邊', '勾 SMS 備援時，上方的表格多出兩欄（畫面在使用者看不到的地方改變）'],
            ['會出錯的地方', '幾乎沒有', '兩欄都取消勾選的列會收不到 SMS，需要額外提醒'],
            ['跟 GMC 一致', '預設行為一致（先公務、勾了才加私人），只是收斂成一個開關', '一致'],
            ['開發與規格', '一個欄位，規則簡單', '每列兩個狀態、全選、半選、與表格篩選、群組成員變動的處理'],
          ]} />
        </Section>

        <Section eyebrow="Suggestion" title="建議：先做方案 A">
          <Notes items={[
            { title: '加寄私人手機的情境通常是「要確保大家都收到」', body: '例如颱風、下班後的停電通知。這時寄件人要的是所有人多一條路，而不是挑人。' },
            { title: '逐列選擇需要的資訊，寄件人手上沒有', body: '他不會知道哪個組織的人今天沒帶公務機，最後多半是全選或全不選，也就是方案 A。' },
            { title: '之後可以再擴充', body: '如果上線後真的有人需要「只加寄某個群組」，再把方案 B 的欄位加回來，不影響方案 A 的設計。' },
          ]} />
        </Section>
      </main>
    </>
  )
}
