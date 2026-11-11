// Proposals for PM and design: how to make "Delivery method" read as part of Device Notifications in step 1.
// Every option is a live mock of the Channels section, built from the same DS parts as the prototype; nothing here
// changes the prototype.
import * as React from 'react'
import { Checkbox, RadioGroup, RadioGroupItem, Select, Tag, cn } from '@qijenchen/design-system'
import { Notes, Section, SpecTable } from '../parts'
import { CHN, IconBox, Two } from '../../components/ui'
import type { Channel } from '../../lib/data'

type Ch = { push: boolean; desktop: boolean; email: boolean }
type Mode = 'pns' | 'sms'
const PNS_DESC = 'Send a push notification via PNS only. No SMS if the device is unreachable.'
const SMS_DESC = 'PNS is prioritized, with SMS as a backup if the device is unreachable via PNS. (Requires ICSD approval upon submission — takes 3 working days.)'
const pushDesc = <>Push to the app on company phones, with <span className="font-medium">optional SMS fallback</span>.</>
const SmsLabel = () => <span className="inline-flex items-center gap-2">PNS + SMS fallback<Tag size="sm" color="amber">Need ICSD approval</Tag></span>

function useMock() {
  const [ch, setCh] = React.useState<Ch>({ push: true, desktop: false, email: true })
  const [mode, setMode] = React.useState<Mode>('sms')
  const [urgent, setUrgent] = React.useState(false)
  return { ch, toggle: (k: keyof Ch) => setCh(c => ({ ...c, [k]: !c[k] })), mode, setMode, urgent, setUrgent }
}
type M = ReturnType<typeof useMock>

// the prototype's channel card (whole card clickable, checkbox top right)
function Card({ m, k, children, className }: { m: M; k: keyof Ch; children?: React.ReactNode; className?: string }) {
  const on = m.ch[k], meta = CHN[k as Channel], id = 'c-' + k + Math.random().toString(36).slice(2, 6)
  return (
    <div className={cn('flex flex-col gap-3 rounded-lg border p-[var(--layout-space-tight)] transition-colors', on ? 'border-primary bg-primary-subtle/40' : 'border-border', className)}>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <IconBox icon={meta.icon} tone={on ? 'info' : 'neutral'} />
        <Two a={meta.name} b={k === 'push' ? pushDesc : meta.desc} strong className="flex-1 [&>span:first-child]:font-semibold [&>span:last-child]:whitespace-normal" />
        <Checkbox id={id} checked={on} onCheckedChange={() => m.toggle(k)} aria-label={meta.name} />
      </label>
      {children}
    </div>
  )
}
function Radios({ m }: { m: M }) {
  return (
    <RadioGroup value={m.mode} onValueChange={v => m.setMode(v as Mode)} aria-label="Delivery method" className="flex flex-col gap-3">
      <RadioGroupItem value="pns" label="PNS only" description={PNS_DESC} />
      <RadioGroupItem value="sms" label={<SmsLabel />} description={SMS_DESC} />
    </RadioGroup>
  )
}
function Urgent({ m }: { m: M }) {
  return m.mode === 'sms' ? <div className="ml-7"><Checkbox checked={m.urgent} onCheckedChange={() => m.setUrgent(!m.urgent)} label="It’s urgent: send without waiting for SMS approval" /></div> : null
}
const Grid = ({ children }: { children: React.ReactNode }) => <div className="grid gap-[var(--layout-space-tight)] md:grid-cols-3">{children}</div>
const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-lg border border-divider bg-surface p-[var(--layout-space-loose)]">
    <h3 className="mb-[var(--layout-space-tight)] text-h5 font-bold">Channels</h3>
    <div className="flex flex-col gap-[var(--layout-space-tight)]">{children}</div>
  </div>
)

// 0: what the prototype does now
function Now() {
  const m = useMock()
  return <Frame><Grid><Card m={m} k="push" /><Card m={m} k="desktop" /><Card m={m} k="email" /></Grid>
    {m.ch.push ? <div className="flex flex-col gap-2"><span className="text-body font-medium">Delivery method</span><Radios m={m} /><Urgent m={m} /></div> : null}</Frame>
}
// A: copy only
function OptA() {
  const m = useMock()
  return <Frame><Grid><Card m={m} k="push" /><Card m={m} k="desktop" /><Card m={m} k="email" /></Grid>
    {m.ch.push ? <div className="flex flex-col gap-2"><span className="text-body font-medium">Device Notifications delivery method</span><Radios m={m} /><Urgent m={m} /></div> : null}</Frame>
}
// B: a framed panel under the cards, headed with the Device Notifications icon and name
function OptB() {
  const m = useMock(), I = CHN.push.icon
  return <Frame><Grid><Card m={m} k="push" /><Card m={m} k="desktop" /><Card m={m} k="email" /></Grid>
    {m.ch.push ? (
      <div className="flex flex-col gap-3 rounded-lg border border-divider bg-[var(--color-neutral-1)] p-[var(--layout-space-tight)]">
        <span className="flex items-center gap-2"><I className="size-4 text-fg-secondary" aria-hidden /><span className="text-body font-medium">Device Notifications · Delivery method</span></span>
        <Radios m={m} /><Urgent m={m} />
      </div>
    ) : null}</Frame>
}
// C: Device Notifications as a full-width card with its delivery method inside; the other two cards below
function OptC() {
  const m = useMock()
  return <Frame>
    <Card m={m} k="push">
      {m.ch.push ? <div className="flex flex-col gap-2 border-t border-divider pt-3 pl-9"><span className="text-body font-medium">Delivery method</span><Radios m={m} /><Urgent m={m} /></div> : null}
    </Card>
    <div className="grid gap-[var(--layout-space-tight)] md:grid-cols-2"><Card m={m} k="desktop" /><Card m={m} k="email" /></div>
  </Frame>
}
// D: a compact select inside the Device Notifications card; the chosen option's description under it
function OptD() {
  const m = useMock()
  return <Frame><Grid>
    <Card m={m} k="push">
      {m.ch.push ? <div className="flex flex-col gap-2 pl-9">
        <span className="text-caption font-medium text-fg-secondary">Delivery method</span>
        <Select aria-label="Delivery method" value={m.mode} onChange={v => m.setMode(v as Mode)} options={[{ value: 'pns', label: 'PNS only' }, { value: 'sms', label: 'PNS + SMS fallback' }]} />
        {m.mode === 'sms' ? <span className="flex flex-col items-start gap-1"><Tag size="sm" color="amber">Need ICSD approval</Tag><span className="text-caption text-fg-secondary">SMS backup if the device is unreachable. Approval takes 3 working days.</span></span> : <span className="text-caption text-fg-secondary">No SMS if the device is unreachable.</span>}
        {m.mode === 'sms' ? <Checkbox checked={m.urgent} onCheckedChange={() => m.setUrgent(!m.urgent)} label="It’s urgent" /> : null}
      </div> : null}
    </Card>
    <Card m={m} k="desktop" /><Card m={m} k="email" /></Grid></Frame>
}
// E: a connector from the card: the options sit right under the Device Notifications card, joined by a line
function OptE() {
  const m = useMock()
  return <Frame><Grid><Card m={m} k="push" /><Card m={m} k="desktop" /><Card m={m} k="email" /></Grid>
    {m.ch.push ? (
      <div className="relative ml-6 flex flex-col gap-2 border-l-2 border-primary/40 pl-[var(--layout-space-tight)]">
        <span className="text-body font-medium">Delivery method for Device Notifications</span>
        <Radios m={m} /><Urgent m={m} />
      </div>
    ) : null}</Frame>
}

export default function Delivery() {
  return (
    <>
      <div className="spec-top">
        <div className="spec-wrap flex flex-col gap-1 pt-4 pb-3">
          <span className="spec-eyebrow">MNP · New message 步驟 1 · 提案</span>
          <h1 className="spec-h1">Delivery method 提案</h1>
          <span className="text-caption text-fg-secondary">2026/11/11 · 讓 Delivery method 看得出是 Device Notifications 的設定。每個方案都可以直接點選（勾、取消 Device Notifications，切換兩個選項），不影響原型。</span>
        </div>
      </div>
      <main className="spec-wrap spec-main">
        <Section eyebrow="Context" title="問題" lead="Delivery method 放在三張卡片下方、與卡片同寬，看起來像是整個 Channels 的設定，看不出只屬於 Device Notifications。">
          <Now />
        </Section>
        <Section eyebrow="Option A" title="A：只改標題文案" lead="版面不變，標題改成 Device Notifications delivery method（或 Delivery method for Device Notifications）。">
          <OptA />
          <Notes items={[{ title: '優點', body: '改動最小，工程幾乎不用動。' }, { title: '缺點', body: '位置仍在三張卡片下方，視覺上還是像共用設定；標題變長。只靠文字，掃視時容易漏看。' }]} cols />
        </Section>
        <Section eyebrow="Option B" title="B：加框與通道圖示的區塊" lead="Delivery method 放進淺灰底的框，標題前有 Device Notifications 的手機圖示：Device Notifications · Delivery method。">
          <OptB />
          <Notes items={[{ title: '優點', body: '用圖示和名稱明確綁定通道；框把選項收成一組。改動小。' }, { title: '缺點', body: '框仍與三張卡片同寬，位置關係沒有改變，只是標示更清楚。' }]} cols />
        </Section>
        <Section eyebrow="Option C" title="C：Device Notifications 卡片獨佔一列，選項在卡片裡" lead="Device Notifications 單獨一張寬卡片，勾選後卡片內展開 Delivery method；Desktop OS 與 Email 在下一列。">
          <OptC />
          <Notes items={[{ title: '優點', body: '最清楚：選項就在卡片裡，一看就知道屬於誰；取消勾選時選項跟著收起來。也表達出 Device Notifications 是主要通道。' }, { title: '缺點', body: '三張卡片不再等寬並排，版面變化較大；卡片高度會隨勾選改變。' }]} cols />
        </Section>
        <Section eyebrow="Option D" title="D：卡片裡放下拉選單" lead="三張卡片維持並排；Device Notifications 勾選後，卡片裡出現 Delivery method 下拉選單與一行說明。">
          <OptD />
          <Notes items={[{ title: '優點', body: '選項在卡片裡，歸屬清楚；版面不變。' }, { title: '缺點', body: '卡片只有三分之一寬，長說明要縮短（ICSD 3 個工作天的說明要改寫）；下拉選單要點開才看到另一個選項，兩個選項的差異不容易比較；三張卡片高度不一。' }]} cols />
        </Section>
        <Section eyebrow="Option E" title="E：從卡片延伸的縮排與連接線" lead="選項縮排，左側一條淡藍色直線，標題 Delivery method for Device Notifications。">
          <OptE />
          <Notes items={[{ title: '優點', body: '縮排與線條暗示「這是上面某個東西的子設定」；改動小。' }, { title: '缺點', body: '線條從整排卡片下方開始，仍然沒有指向特定一張卡片；要搭配文案才清楚。設計系統沒有這種樣式。' }]} cols />
        </Section>
        <Section eyebrow="Compare" title="比較與建議">
          <SpecTable head={['', '歸屬是否清楚', '版面改動', '兩個選項好比較', '設計系統元件']} nowrap={[0]} rows={[
            ['A 只改文案', '普通（靠文字）', '無', '好', '現有'],
            ['B 加框與圖示', '好', '小', '好', '現有'],
            ['C 卡片獨佔一列', '最好', '大', '好', '現有'],
            ['D 卡片裡的下拉選單', '好', '小', '差', '現有（Select）'],
            ['E 縮排與連接線', '普通', '小', '好', '自訂樣式'],
          ]} />
          <Notes items={[
            { title: '建議：C', body: '問題本質是位置：選項不在卡片附近。C 直接把選項放進卡片，是唯一從位置上解決的方案，而且只用現有元件。' },
            { title: '若不想動卡片排版：B', body: 'B 保留三張並排，用圖示加名稱把區塊綁到 Device Notifications，改動小，可以當作過渡。A 可以和 B、E 搭配使用。' },
          ]} />
        </Section>
      </main>
    </>
  )
}
