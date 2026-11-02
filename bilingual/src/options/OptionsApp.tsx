// Design studies, one per tab: the reach preview under "Channels" in the send flow (#reach), and how the
// message list marks an urgent send (#urgent).
// Reach preview: Every option runs on the same
// sample audience (86 shift leads), and each mock is live: tick channels to see how it responds.
import * as React from 'react'
import { Button, Checkbox, SegmentedControl, SegmentedControlItem, Tabs, TabsList, TabsTrigger, Tag, cn } from '@qijenchen/design-system'
import { CircleCheck, Mail, MessageSquareText, Monitor, Plus, Smartphone, UserX, type LucideIcon } from 'lucide-react'
import { IconBox } from '../components/ui'
import { setLang, useApp } from '../lib/store'
import { L } from '../lib/i18n'
import { UrgentStudy } from './UrgentStudy'

// ---------- sample audience ----------
// 86 people: 78 have the app; 68 have the desktop agent (6 of them among the 8 without the app);
// everyone has a mailbox; 2 of the 8 without the app have a phone number for SMS.
const PEOPLE = Array.from({ length: 86 }, (_, i) => ({ dev: i < 78, desk: i < 62 || (i >= 78 && i < 84), phone: i === 78 || i === 79 }))
type Ch = 'push' | 'desktop' | 'email' | 'sms'
type Sel = Record<Ch, boolean>
const START: Sel = { push: true, desktop: true, email: false, sms: true }

function reach(s: Sel) {
  const gets = (p: typeof PEOPLE[number], k: Ch) => k === 'push' ? s.push && p.dev : k === 'desktop' ? s.desktop && p.desk : k === 'email' ? s.email : s.push && s.sms && !p.dev && p.phone
  const by = (k: Ch) => PEOPLE.filter(p => gets(p, k)).length
  const reached = PEOPLE.filter(p => (['push', 'desktop', 'email', 'sms'] as Ch[]).some(k => gets(p, k))).length
  // what each channel adds on top of the ones before it, in the order people get them
  const order: Ch[] = ['push', 'sms', 'desktop', 'email'], seen = new Set<number>(), adds: { k: Ch; n: number }[] = []
  order.forEach(k => { if (!s[k] || (k === 'sms' && !s.push)) return; let n = 0; PEOPLE.forEach((p, i) => { if (!seen.has(i) && gets(p, k)) { seen.add(i); n++ } }); adds.push({ k, n }) })
  return { total: PEOPLE.length, reached, missed: PEOPLE.length - reached, push: s.push ? by('push') : 0, desktop: s.desktop ? by('desktop') : 0, email: s.email ? by('email') : 0, sms: by('sms'), all: { push: PEOPLE.filter(p => p.dev).length, desktop: PEOPLE.filter(p => p.desk).length, email: 86 }, adds }
}
type Reach = ReturnType<typeof reach>

const CH = (): Record<Ch, { name: string; desc: string; icon: LucideIcon }> => ({
  push: { name: 'Device Notifications', desc: L('Push to the app on company phones.', '推播到公司手機的 App。'), icon: Smartphone },
  desktop: { name: L('Desktop OS', '桌面通知'), desc: L('Pops up on company Windows PCs.', '在公司 Windows 電腦跳出通知。'), icon: Monitor },
  email: { name: 'Email', desc: L('Sent to company mailboxes, with formatting and files.', '寄到公司信箱，可加格式和附件。'), icon: Mail },
  sms: { name: L('Device Notifications (SMS)', 'Device Notifications（SMS）'), desc: L('Sends an SMS to anyone the push doesn’t reach.', '推播沒送到的人，改發 SMS。'), icon: MessageSquareText },
})
const people = (n: number) => L(n === 1 ? '1 person' : n + ' people', n + ' 人')

// ---------- shared pieces ----------
function useSel() { const [s, set] = React.useState<Sel>(START); return [s, (k: Ch) => set(x => ({ ...x, [k]: !x[k], ...(k === 'push' && x.push ? { sms: false } : {}) }))] as const }

// A channel card as in the prototype, minus everything the option decides to leave out
function Card({ k, on, toggle, children }: { k: Ch; on: boolean; toggle: () => void; children?: React.ReactNode }) {
  const m = CH()[k], id = React.useId()
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer flex-col gap-3 rounded-lg border p-[var(--layout-space-tight)] transition-colors', on ? 'border-primary bg-primary-subtle/40' : 'border-border hover:border-border-hover')}>
      <span className="flex items-start gap-3">
        <IconBox icon={m.icon} tone={on ? 'info' : 'neutral'} />
        <span className="flex min-w-0 flex-1 flex-col"><span className="text-body font-medium">{m.name}</span><span className="text-caption text-fg-secondary">{m.desc}</span></span>
        <Checkbox id={id} checked={on} onCheckedChange={toggle} aria-label={m.name} />
      </span>
      {children}
    </label>
  )
}
function SmsRow({ s, toggle, extra }: { s: Sel; toggle: () => void; extra?: React.ReactNode }) {
  if (!s.push) return null
  const m = CH().sms
  return (
    <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
      <Checkbox checked={s.sms} onCheckedChange={toggle} label={<span className="inline-flex items-center gap-2">{m.name}<Tag size="sm" color="amber">{L('Needs ICSD approval', '需 ICSD 核准')}</Tag></span>} description={m.desc} />
      {extra ? <span className="ml-auto">{extra}</span> : null}
    </div>
  )
}
// One line that says how many people get the message
function Result({ r, s, toggle, suggest }: { r: Reach; s: Sel; toggle: (k: Ch) => void; suggest?: boolean }) {
  if (!r.missed) return <p className="flex items-center gap-2 text-body font-medium text-success-text"><CircleCheck className="size-4" aria-hidden />{L('All ' + r.total + ' people get it', r.total + ' 人都收得到')}</p>
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <p className="text-body"><span className="font-medium">{L(r.reached + ' of ' + r.total + ' people get it', r.reached + ' / ' + r.total + ' 人收得到')}</span><span className="text-fg-secondary">{L(' · ' + r.missed + ' don’t', '，' + r.missed + ' 人收不到')}</span></p>
      <Button variant="link" size="sm">{L('See who', '查看是誰')}</Button>
      {suggest && !s.email ? <Button variant="secondary" size="sm" startIcon={Plus} className="ml-auto" onClick={() => toggle('email')}>{L('Add Email to reach everyone', '加入 Email，全部收得到')}</Button> : null}
    </div>
  )
}
const Grid = ({ children }: { children: React.ReactNode }) => <div className="grid gap-[var(--layout-space-tight)] md:grid-cols-3">{children}</div>
const Title = () => <h3 className="text-h4 font-bold">{L('Channels', '通道')}</h3>

// ---------- the options ----------
// A: no numbers on the cards; one line with the result under them
function OptionA() {
  const [s, toggle] = useSel(), r = reach(s)
  return (
    <div className="flex flex-col gap-[var(--layout-space-tight)]">
      <Title />
      <Grid>{(['push', 'desktop', 'email'] as Ch[]).map(k => <Card key={k} k={k} on={s[k]} toggle={() => toggle(k)} />)}</Grid>
      <SmsRow s={s} toggle={() => toggle('sms')} />
      <div className="border-t border-divider pt-[var(--layout-space-tight)]"><Result r={r} s={s} toggle={toggle} suggest /></div>
    </div>
  )
}

// B: cards only speak up when a channel misses someone
function OptionB() {
  const [s, toggle] = useSel(), r = reach(s)
  const gap = (k: 'push' | 'desktop' | 'email') => r.total - r.all[k]
  return (
    <div className="flex flex-col gap-[var(--layout-space-tight)]">
      <Title />
      <Grid>
        {(['push', 'desktop', 'email'] as const).map(k => (
          <Card key={k} k={k} on={s[k]} toggle={() => toggle(k)}>
            <span className={cn('flex items-center gap-1.5 text-caption', gap(k) ? 'text-fg-secondary' : 'text-success-text')}>
              {gap(k) ? <UserX className="size-3.5" aria-hidden /> : <CircleCheck className="size-3.5" aria-hidden />}
              {gap(k) ? L(gap(k) + ' can’t get it', gap(k) + ' 人收不到') : L('Everyone can get it', '每個人都收得到')}
            </span>
          </Card>
        ))}
      </Grid>
      <SmsRow s={s} toggle={() => toggle('sms')} />
      <div className="border-t border-divider pt-[var(--layout-space-tight)]"><Result r={r} s={s} toggle={toggle} /></div>
    </div>
  )
}

// C: a list with one number per channel and a total, like a receipt
function OptionC() {
  const [s, toggle] = useSel(), r = reach(s), m = CH()
  const Row = ({ k, n, sub }: { k: Ch; n: React.ReactNode; sub?: boolean }) => (
    <div className={cn('flex items-center gap-3 px-[var(--layout-space-tight)] py-3', sub && 'pl-12')}>
      <Checkbox checked={s[k]} onCheckedChange={() => toggle(k)} aria-label={m[k].name} />
      <IconBox icon={m[k].icon} tone={s[k] ? 'info' : 'neutral'} />
      <span className="flex min-w-0 flex-1 flex-col"><span className="flex flex-wrap items-center gap-2 text-body font-medium">{m[k].name}{k === 'sms' ? <Tag size="sm" color="amber">{L('Needs ICSD approval', '需 ICSD 核准')}</Tag> : null}</span><span className="text-caption text-fg-secondary">{m[k].desc}</span></span>
      <span className={cn('shrink-0 text-body tabular-nums', s[k] ? 'font-medium' : 'text-fg-muted')}>{n}</span>
    </div>
  )
  return (
    <div className="flex flex-col gap-[var(--layout-space-tight)]">
      <Title />
      <div className="flex flex-col divide-y divide-divider rounded-lg border border-divider">
        <Row k="push" n={people(r.all.push)} />
        {s.push ? <Row k="sms" sub n={'+' + people(PEOPLE.filter(p => !p.dev && p.phone).length)} /> : null}
        <Row k="desktop" n={people(r.all.desktop)} />
        <Row k="email" n={people(r.all.email)} />
        <div className="flex flex-wrap items-center gap-3 bg-neutral-1 px-[var(--layout-space-tight)] py-3">
          <span className="flex-1 text-body font-medium">{L('Get it', '收得到')}</span>
          {r.missed ? <Button variant="link" size="sm">{L(r.missed + ' don’t: see who', r.missed + ' 人收不到，查看')}</Button> : null}
          <span className="text-body font-bold tabular-nums">{r.reached} / {r.total}</span>
        </div>
      </div>
    </div>
  )
}

// D: one bar for the whole audience, split by the channel that reaches each person first
function OptionD() {
  const [s, toggle] = useSel(), r = reach(s), m = CH()
  const shade = ['bg-primary', 'bg-primary/60', 'bg-primary/35', 'bg-primary/20']
  const label = (k: Ch) => k === 'sms' ? 'SMS' : m[k].name
  return (
    <div className="flex flex-col gap-[var(--layout-space-tight)]">
      <Title />
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {(['push', 'desktop', 'email'] as Ch[]).map(k => <Checkbox key={k} checked={s[k]} onCheckedChange={() => toggle(k)} label={<span className="inline-flex items-center gap-2"><IconBox icon={m[k].icon} tone={s[k] ? 'info' : 'neutral'} />{m[k].name}</span>} />)}
      </div>
      <SmsRow s={s} toggle={() => toggle('sms')} />
      <div className="flex flex-col gap-2 rounded-lg border border-divider p-[var(--layout-space-tight)]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-body"><span className="text-h4 font-bold tabular-nums">{r.reached}</span><span className="text-fg-secondary"> / {r.total} {L('people get it', '人收得到')}</span></span>
          {r.missed ? <Button variant="link" size="sm">{L(r.missed + ' don’t: see who', r.missed + ' 人收不到，查看')}</Button> : null}
        </div>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-neutral-2" role="img" aria-label={L(r.reached + ' of ' + r.total + ' people get it', r.reached + ' / ' + r.total + ' 人收得到')}>
          {r.adds.map((a, i) => a.n ? <span key={a.k} className={cn('h-full', shade[i])} style={{ width: (a.n / r.total * 100) + '%' }} /> : null)}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-fg-secondary">
          {r.adds.map((a, i) => a.n ? <span key={a.k} className="inline-flex items-center gap-1.5"><span className={cn('size-2 rounded-full', shade[i])} aria-hidden />{(i ? '+' : '') + a.n} {label(a.k)}</span> : null)}
          {r.missed ? <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-neutral-2 ring-1 ring-border" aria-hidden />{r.missed} {L('can’t get it', '收不到')}</span> : null}
        </div>
      </div>
    </div>
  )
}

// What the prototype shows today, for side-by-side reading
function Today() {
  return (
    <ul className="opt-list">
      <li>{L('A bar and “Reaches 78 / 86” on every card, then a second bar for the total: four bars and six numbers before you write anything.', '每張卡片都有一條進度條和「可觸及 78 / 86」，下面還有一條總進度條：還沒開始寫內容，畫面上已經有 4 條進度條、6 組數字。')}</li>
      <li>{L('The SMS line packs two facts into one sentence: “Reaches 2 people without the app. 6 people have no phone number.”', 'SMS 那一行把兩件事塞成一句：「可送到 2 位沒裝 App 的人。6 人沒有電話。」')}</li>
      <li>{L('“Reaches” reads like system language; people think in “who gets it” and “who doesn’t”.', '「可觸及」是系統用語，使用者想的是「誰收得到、誰收不到」。')}</li>
      <li>{L('The audience table above already lists a count per channel, so the same numbers appear twice.', '上方收件人表格已經有每個通道的人數，同樣的數字出現了兩次。')}</li>
    </ul>
  )
}

const OPTIONS: { key: string; title: () => string; idea: () => string; good: () => string; cost: () => string; reco?: boolean; Mock: () => React.ReactElement }[] = [
  { key: 'A', Mock: OptionA, reco: true,
    title: () => L('Just the result', '只說結果'),
    idea: () => L('Cards only pick channels. One line under them says how many people get the message, and offers the one fix that reaches everyone.', '卡片只負責選通道，不放數字。下方一行告訴你幾個人收得到；如果加一個通道就能送到全部，直接給一顆按鈕。'),
    good: () => L('The fewest numbers: one. The fix is one click away.', '數字最少，只有一組。要補救時按一下就好。'),
    cost: () => L('You only see which channel is weak after you change it, or open “See who”.', '看不出是哪個通道比較弱，要切換看看或點「查看是誰」才知道。') },
  { key: 'B', Mock: OptionB,
    title: () => L('Only the gaps', '只標出缺口'),
    idea: () => L('Each card says one short thing: everyone can get it, or how many can’t. The total sits in one line below.', '每張卡片只說一件事：每個人都收得到，或幾人收不到。總數放在下方一行。'),
    good: () => L('You see the weak channel before you pick it, without bars.', '選之前就看得出哪個通道有缺口，而且不用進度條。'),
    cost: () => L('Still one number per card, so a little more to read than A.', '每張卡片還是有一個數字，比 A 多一點資訊。') },
  { key: 'C', Mock: OptionC,
    title: () => L('A list with a total', '清單加總'),
    idea: () => L('Channels as a compact list, one number each, with a total row at the bottom, like a receipt. SMS sits under Device Notifications as a “+2”.', '通道改成清單，每列一個人數，最下面一列是總數，像收據。SMS 縮排在 Device Notifications 底下，顯示「+2 人」。'),
    good: () => L('Easy to compare channels; the SMS relationship is clear.', '通道之間好比較，SMS 和推播的關係一目了然。'),
    cost: () => L('Loses the big cards, so channels look less like choices.', '少了大卡片，通道看起來比較不像「選項」。') },
  { key: 'D', Mock: OptionD,
    title: () => L('One coverage bar', '一條覆蓋條'),
    idea: () => L('Channels are simple checkboxes. One bar shows the whole audience, split by the channel that reaches each person first, with the people nobody reaches in grey.', '通道改成簡單的勾選。只留一條長條代表全部收件人，依「第一個送到的通道」分段，收不到的人留灰。'),
    good: () => L('Explains how channels add up, which the other options can’t.', '能看出通道是怎麼疊加的，這是其他方案做不到的。'),
    cost: () => L('A chart takes a moment to read; the legend adds words.', '圖表要花一點時間看，圖例也會多一些字。') },
]

function ReachStudy() {
  return (
    <>
    <section className="opt-card">
      <h2>{L('Sample audience', '範例收件人')}</h2>
      <div className="opt-facts">
        <div className="opt-fact"><b>86</b><span>{L('people in Fab 18 Shift Leads', '人（Fab 18 Shift Leads 群組）')}</span></div>
        <div className="opt-fact"><b>78</b><span>{L('have the app', '人有 App')}</span></div>
        <div className="opt-fact"><b>68</b><span>{L('have the desktop agent', '人有桌面程式')}</span></div>
        <div className="opt-fact"><b>2</b><span>{L('of the 8 without the app have a phone number', '人沒有 App 但有電話（共 8 人沒 App）')}</span></div>
      </div>
      <p className="opt-hint">{L('Starts with Device Notifications, Desktop OS and SMS on: 84 of 86 get it. Turning on Email reaches everyone.', '預設勾選 Device Notifications、桌面通知和 SMS：86 人中 84 人收得到。加上 Email 就能送到全部。')}</p>
    </section>

    <section className="opt-card">
      <h2>{L('What feels complicated today', '現在哪裡太複雜')}</h2>
      <Today />
    </section>

    {OPTIONS.map(o => (
      <section key={o.key} className="opt-section" aria-labelledby={'opt-' + o.key}>
        <div className="opt-notes">
          <span className="opt-tag">{L('Option ', '方案 ') + o.key}</span>
          <h2 id={'opt-' + o.key}>{o.title()}</h2>
          {o.reco ? <span className="opt-reco">{L('My pick', '我的推薦')}</span> : null}
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

type Study = 'reach' | 'urgent'
const STUDIES = (): { k: Study; tab: string; title: string; sub: string }[] => [
  { k: 'reach', tab: L('Channel reach', '通道觸及'), title: L('Channel reach: design options', '通道觸及：設計方案'), sub: L('Four simpler ways to show how many people a message reaches while you pick channels. Every mock is live: tick channels to see how it responds.', '在選通道時顯示「幾個人收得到」的四種簡化做法。每個畫面都可以操作，勾選通道看看它怎麼變化。') },
  { k: 'urgent', tab: L('Urgent sends in the list', '緊急發送標示'), title: L('Marking urgent sends: design options', '緊急發送標示：設計方案'), sub: L('Five ways to show, in the message list, that a message skipped SMS approval as urgent. Each uses the real list table.', '在訊息列表標示「這則訊息以緊急為由略過 SMS 核准」的五種做法，都用真實的列表元件呈現。') },
]
// each study has its own link: #reach or #urgent
const fromHash = (): Study => (location.hash === '#urgent' ? 'urgent' : 'reach')

export default function OptionsApp() {
  const { lang } = useApp()
  const [study, setStudy] = React.useState<Study>(fromHash)
  React.useEffect(() => { const f = () => setStudy(fromHash()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f) }, [])
  const go = (k: Study) => { setStudy(k); try { history.replaceState(null, '', '#' + k) } catch { /* sandboxed frame */ } }
  const cur = STUDIES().find(x => x.k === study)!
  return (
    <main className="opt-page">
      <header className="opt-head">
        <div>
          <h1>{cur.title}</h1>
          <p>{cur.sub}</p>
        </div>
        <SegmentedControl size="sm" value={lang} onValueChange={v => v && setLang(v as 'en' | 'zh')} aria-label={L('Language', '語言')}>
          <SegmentedControlItem value="zh">中文</SegmentedControlItem>
          <SegmentedControlItem value="en">EN</SegmentedControlItem>
        </SegmentedControl>
      </header>
      <Tabs value={study} onValueChange={v => go(v as Study)}>
        <TabsList aria-label={L('Design studies', '設計主題')}>
          {STUDIES().map(x => <TabsTrigger key={x.k} value={x.k}>{x.tab}</TabsTrigger>)}
        </TabsList>
      </Tabs>
      {study === 'reach' ? <ReachStudy /> : <UrgentStudy />}
    </main>
  )
}
