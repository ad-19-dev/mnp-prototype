// How message details could show each channel's content once channels carry their own content. Every
// option renders the same message (four channels) in a panel as wide as the details aside, so length,
// scanning and fidelity can be compared directly.
import * as React from 'react'
import { DescriptionItem, DescriptionList, ProgressBar, SegmentedControl, SegmentedControlItem, Tag } from '@qijenchen/design-system'
import { ChevronDown, Mail, MessageSquareText, Monitor, Send, Smartphone, type LucideIcon } from 'lucide-react'
import { ChannelPreview, type PreviewChannel } from './ChannelPreview'
import { L } from '../lib/i18n'
import { useApp } from '../lib/store'

const MSG = {
  sender: 'ESH Emergency', title: 'Typhoon alert: work arrangement for 10/22',
  content: 'Due to the typhoon warning, non-fab staff should work from home on Oct 22. Fab shift staff, follow your section manager’s arrangement.',
  smsText: 'Typhoon alert: non-fab staff WFH on 10/22. Fab shifts as arranged.',
  subject: 'Typhoon alert: work arrangement for Oct 22',
  html: '<p>Due to the typhoon warning, work arrangements for <b>Oct 22</b> are as follows.</p><ul><li><b>Non-fab staff:</b> work from home.</li><li><b>Fab shift staff:</b> follow your section manager’s arrangement.</li></ul><p>ESH Emergency</p>',
}
const CHS: { k: PreviewChannel; icon: LucideIcon; ok: number; of: number }[] = [
  { k: 'push', icon: Smartphone, ok: 260, of: 292 },
  { k: 'desktop', icon: Monitor, ok: 231, of: 292 },
  { k: 'sms', icon: MessageSquareText, ok: 6, of: 12 },
  { k: 'email', icon: Mail, ok: 292, of: 292 },
]
const chName = (k: PreviewChannel) => (k === 'push' ? 'Device Notifications' : k === 'desktop' ? L('Desktop OS', '桌面通知') : k === 'sms' ? L('Device Notifications (SMS)', 'Device Notifications（SMS）') : 'Email')
const zh = () => L('en', 'zh') === 'zh'
const delivered = (ok: number, of: number) => L(ok + ' of ' + of + ' delivered', ok + ' / ' + of + ' 已送達')

// the top of the details panel, the same in every option
function PanelHead() {
  return (
    <div className="flex flex-col gap-[var(--layout-space-loose)]">
      <div className="flex flex-col gap-2">
        <span><Tag size="sm" color="blue" icon={Send}>{L('In progress', '傳送中')}</Tag></span>
        <h3 className="text-body-lg font-medium">{MSG.title}</h3>
      </div>
      <DescriptionList orientation="horizontal" divided>
        <DescriptionItem label={L('Sender', '寄件人')}>{MSG.sender}</DescriptionItem>
        <DescriptionItem label={L('Channels', '通道')}>{L('4 channels', '4 個通道')}</DescriptionItem>
        <DescriptionItem label={L('Created', '建立時間')}>2026/10/21 08:40</DescriptionItem>
      </DescriptionList>
    </div>
  )
}
const H = ({ children }: { children: React.ReactNode }) => <h4 className="text-h6 font-bold">{children}</h4>
const Part = ({ title, children }: { title: string; children: React.ReactNode }) => <section className="flex flex-col gap-[var(--layout-space-tight)]"><H>{title}</H>{children}</section>
const Box = ({ children }: { children: React.ReactNode }) => <div className="whitespace-pre-wrap rounded-md border border-divider p-3 text-body">{children}</div>
function Text({ k }: { k: PreviewChannel }) {
  if (k === 'sms') return <Box>{MSG.smsText}</Box>
  if (k === 'email') return <div className="flex flex-col gap-2"><span className="text-body text-fg-secondary"><span className="font-medium text-foreground">{L('Subject:', '主旨：')}</span> {MSG.subject}</span><div className="mail-html rounded-md border border-divider p-3 text-body" dangerouslySetInnerHTML={{ __html: MSG.html }} /></div>
  return <Box><strong className="font-medium">{MSG.title}</strong>{'\n'}{MSG.content}</Box>
}
function Delivery({ ok, of }: { ok: number; of: number }) {
  return <div className="flex items-center gap-3"><span className="shrink-0 whitespace-nowrap text-body tabular-nums">{delivered(ok, of)}</span><ProgressBar aria-label={L('Delivered', '已送達')} value={Math.round(ok / of * 100)} status="success" /></div>
}

// A: today's layout, one titled block per format, stacked
function OptionA() {
  return (
    <div className="flex flex-col gap-[calc(var(--layout-space-loose)*2)]">
      <Part title={L('Delivery', '送達狀況')}>{CHS.map(c => <div key={c.k} className="flex flex-col gap-1"><span className="text-caption text-fg-secondary">{chName(c.k)}</span><Delivery ok={c.ok} of={c.of} /></div>)}</Part>
      <Part title={L('Notification', '通知內容')}><Text k="push" /></Part>
      <Part title={chName('sms')}><Text k="sms" /></Part>
      <Part title="Email"><Text k="email" /></Part>
    </div>
  )
}
// B and C: pick a channel, then see its delivery and its content (text in B, the device in C)
function Switcher({ device }: { device?: boolean }) {
  const [k, setK] = React.useState<PreviewChannel>('push'), c = CHS.find(x => x.k === k)!
  return (
    <Part title={L('Content and delivery by channel', '各通道內容與送達')}>
      <SegmentedControl size="sm" value={k} onValueChange={v => v && setK(v as PreviewChannel)} aria-label={L('Channel', '通道')} className="flex-wrap">
        {CHS.map(x => <SegmentedControlItem key={x.k} value={x.k}>{x.k === 'push' ? L('Device', '推播') : x.k === 'desktop' ? L('Desktop', '桌面') : x.k === 'sms' ? 'SMS' : 'Email'}</SegmentedControlItem>)}
      </SegmentedControl>
      <Delivery ok={c.ok} of={c.of} />
      {device ? <div className="rounded-md bg-neutral-1 p-[var(--layout-space-tight)]"><ChannelPreview ch={k} msg={MSG} zh={zh()} /></div> : <Text k={k} />}
    </Part>
  )
}
// D: one row per channel with its delivery; open a row to read what that channel sent
function OptionD() {
  const [open, setOpen] = React.useState<PreviewChannel | null>('push')
  return (
    <Part title={L('Channels', '通道')}>
      <div className="flex flex-col divide-y divide-divider rounded-md border border-divider">
        {CHS.map(c => {
          const I = c.icon, on = open === c.k
          return (
            <div key={c.k}>
              <button type="button" aria-expanded={on} onClick={() => setOpen(on ? null : c.k)} className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-neutral-hover">
                <I className="size-4 shrink-0 text-fg-secondary" aria-hidden />
                <span className="flex min-w-0 flex-1 flex-col"><span className="text-body font-medium">{chName(c.k)}</span><span className="text-caption text-fg-secondary">{delivered(c.ok, c.of)}</span></span>
                <ChevronDown className={'size-4 text-fg-secondary transition-transform ' + (on ? 'rotate-180' : '')} aria-hidden />
              </button>
              {on ? <div className="px-3 pb-3"><Text k={c.k} /></div> : null}
            </div>
          )
        })}
      </div>
    </Part>
  )
}

type Score = 'yes' | 'part' | 'no'
const CRITERIA = () => [L('Each channel’s delivery at a glance', '一眼看到各通道送達'), L('Looks like what people received', '看起來像收到的樣子'), L('Panel stays short', '面板不會太長'), L('Matches the review step', '和確認送出步驟一致')]
const OPTIONS: { key: string; title: () => string; idea: () => string; good: () => string; cost: () => string; scores: Score[]; reco?: boolean; now?: boolean; Mock: () => React.ReactElement }[] = [
  { key: 'A', now: true, Mock: OptionA, scores: ['yes', 'no', 'no', 'no'],
    title: () => L('Stacked blocks', '全部疊在一起'),
    idea: () => L('Delivery first, then one titled block per format: notification, SMS, email.', '先列送達狀況，再一個格式一個區塊往下排：通知、SMS、Email。'),
    good: () => L('Everything is visible without a click.', '不用點就能看到全部。'),
    cost: () => L('With four channels the panel gets very long, and delivery sits far from the content it belongs to. Desktop OS has no block of its own because it shares the notification text.', '四個通道時面板很長，送達數字和對應的內容離得很遠。桌面通知和推播共用同一段文字，所以沒有自己的區塊。') },
  { key: 'B', Mock: () => <Switcher />, scores: ['part', 'no', 'yes', 'part'],
    title: () => L('Pick a channel, read its text', '切換通道，看文字'),
    idea: () => L('A switch picks one channel; under it, that channel’s delivery and its text.', '用切換鈕選一個通道，下面只顯示這個通道的送達和文字。'),
    good: () => L('Short, and delivery sits next to its content.', '面板短，送達數字就在對應內容旁邊。'),
    cost: () => L('You compare channels one at a time, and plain text doesn’t show how each device cuts it.', '一次只能看一個通道；純文字看不出各裝置會怎麼截斷。') },
  { key: 'C', reco: true, Mock: () => <Switcher device />, scores: ['part', 'yes', 'yes', 'yes'],
    title: () => L('Pick a channel, see the device', '切換通道，看裝置畫面'),
    idea: () => L('The same switch, with the close-to-real preview from the review step: what that channel’s audience actually saw.', '一樣用切換鈕，但下面放確認送出步驟的擬真預覽：這個通道的收件人實際看到的樣子。'),
    good: () => L('People check “what did they get?” on the same picture they approved before sending. Cut-off text shows as it did on the device.', '使用者送出前在確認步驟看到的畫面，送出後在詳情裡看到的是同一張，回答「大家收到什麼」最直接；被截斷的內容也照實呈現。'),
    cost: () => L('Still one channel at a time, and the previews take more height than text.', '一樣一次看一個通道；預覽圖比文字高一些。') },
  { key: 'D', Mock: OptionD, scores: ['yes', 'no', 'part', 'no'],
    title: () => L('One row per channel', '每個通道一列，可展開'),
    idea: () => L('A list with one row per channel and its delivery; open a row to read its text.', '每個通道一列，列上直接顯示送達數字，點開才看文字。'),
    good: () => L('The best overview of delivery across channels, and it stays short when rows are closed.', '最容易一次比較各通道送達；全部收合時很短。'),
    cost: () => L('Reading content takes a click per channel, and it duplicates the Delivery section.', '看內容要逐一展開；和「送達狀況」區塊的資訊重疊。') },
]
const markText = (s: Score) => (s === 'yes' ? L('Yes', '是') : s === 'part' ? L('Partly', '部分') : L('No', '否'))

export function DetailStudy() {
  useApp()
  return (
    <>
      <section className="opt-card">
        <h2>{L('Is it needed?', '需要嗎？')}</h2>
        <p className="opt-p">{L('Yes. Email now always has its own subject and text, and SMS has its own short text, so after sending, people need to check what each channel’s audience got, especially when someone asks “what did the SMS say?”. The question is how to show it without a very long panel.', '需要。現在 Email 一定有自己的主旨和內文，SMS 也有自己的短版內容，送出後使用者會需要確認每個通道的收件人到底收到什麼，例如有人問「簡訊寫了什麼？」。問題在於怎麼呈現才不會讓面板變得很長。')}</p>
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
        <section key={o.key} className="opt-section" aria-labelledby={'det-' + o.key}>
          <div className="opt-notes">
            <span className="opt-tag">{L('Option ', '方案 ') + o.key}</span>
            <h2 id={'det-' + o.key}>{o.title()}</h2>
            {o.reco ? <span className="opt-reco">{L('My pick', '我的推薦')}</span> : o.now ? <span className="opt-now">{L('In the prototype now', '目前 prototype')}</span> : null}
            <p>{o.idea()}</p>
            <h3>{L('Good', '優點')}</h3><p>{o.good()}</p>
            <h3>{L('Trade-off', '取捨')}</h3><p>{o.cost()}</p>
          </div>
          {/* as wide as the details panel */}
          <div className="opt-frame"><div className="opt-screen mx-auto flex w-full max-w-[480px] flex-col gap-[calc(var(--layout-space-loose)*2)]"><PanelHead /><o.Mock /></div></div>
        </section>
      ))}
    </>
  )
}
