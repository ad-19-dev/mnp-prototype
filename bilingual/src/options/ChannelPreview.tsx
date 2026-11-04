// Copy of teams/src/components/ChannelPreview.tsx for this design page (it builds from bilingual, which is frozen).
// Close-to-real previews of a message on each channel: a phone lock screen, a Windows notification,
// the phone's messages app and an email window. They draw the device around the DS text styles and
// take every word as a prop (plus `zh`), so the design-options page can reuse them as they are.
import * as React from 'react'
import { cn } from '@qijenchen/design-system'
import { Radio } from 'lucide-react'

export type PreviewChannel = 'push' | 'desktop' | 'sms' | 'email'
export interface PreviewMessage { sender: string; title: string; content: string; smsText: string; subject: string; html: string }

const AppIcon = ({ size = 20 }: { size?: number }) => (
  <span className="inline-flex shrink-0 items-center justify-center rounded-md bg-[#4f46e5] text-white" style={{ width: size, height: size }}><Radio style={{ width: size * 0.6, height: size * 0.6 }} aria-hidden /></span>
)
const Placeholder = ({ children }: { children: React.ReactNode }) => <span className="text-fg-muted">{children}</span>

// a phone outline with a status bar; the screen holds whatever the channel shows
function Phone({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <div className="mx-auto w-[280px] max-w-full rounded-[36px] bg-[#1f2430] p-2.5 shadow-sm">
      <div className={cn('flex min-h-[300px] flex-col overflow-hidden rounded-[28px]', light ? 'bg-white' : 'bg-gradient-to-b from-[#3b4a6b] to-[#1e2638]')}>
        <div className={cn('flex items-center justify-between px-5 pt-2.5 text-[11px] font-medium', light ? 'text-[#1f2430]' : 'text-white/90')}><span>09:41</span><span>●●●</span></div>
        {children}
      </div>
    </div>
  )
}

export function ChannelPreview({ ch, msg, zh }: { ch: PreviewChannel; msg: PreviewMessage; zh?: boolean }) {
  const T = (en: string, z: string) => (zh ? z : en)
  if (ch === 'push') return (
    <Phone>
      <div className="flex flex-col items-center pb-5 pt-6 text-white"><span className="text-[44px] font-light leading-none">09:41</span><span className="mt-1 text-[12px] text-white/80">{T('Tuesday, November 4', '11月4日 星期二')}</span></div>
      <div className="mx-3 rounded-2xl bg-white/85 p-3 text-[13px] leading-snug text-[#1f2430] backdrop-blur">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] text-[#5a6476]"><AppIcon size={16} /><span className="font-medium uppercase tracking-wide">MNP</span><span className="ml-auto">{T('now', '現在')}</span></div>
        {msg.sender ? <div className="text-[12px] text-[#5a6476]">{msg.sender}</div> : null}
        <div className="font-semibold">{msg.title || <Placeholder>{T('Title', '標題')}</Placeholder>}</div>
        <div className="line-clamp-4 whitespace-pre-wrap">{msg.content || <Placeholder>{T('Text', '內文')}</Placeholder>}</div>
      </div>
    </Phone>
  )
  if (ch === 'sms') return (
    <Phone light>
      <div className="flex flex-col items-center gap-1 border-b border-[#e5e7eb] pb-2 pt-3"><span className="inline-flex size-9 items-center justify-center rounded-full bg-[#c7ccd6] text-[13px] font-semibold text-white">M</span><span className="text-[11px] text-[#1f2430]">MNP</span></div>
      <div className="flex flex-1 flex-col gap-1 px-3 py-4">
        <span className="self-center text-[10px] text-[#8a93a3]">{T('Text Message · Today 09:41', '簡訊・今天 09:41')}</span>
        <div className="max-w-[85%] self-start whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-[#e9e9eb] px-3 py-2 text-[13px] leading-snug text-[#1f2430]">{msg.smsText || <Placeholder>{T('SMS text', 'SMS 內容')}</Placeholder>}</div>
      </div>
    </Phone>
  )
  if (ch === 'desktop') return (
    // a corner of a Windows desktop with the notification in the bottom right
    <div className="relative mx-auto h-[220px] w-full max-w-[420px] overflow-hidden rounded-lg bg-gradient-to-br from-[#2b4c7e] to-[#18263f]">
      <div className="absolute bottom-10 right-3 w-[300px] max-w-[calc(100%-24px)] rounded-lg bg-[#2b2b2b] p-3 text-[12px] leading-snug text-white shadow-lg">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-white/70"><AppIcon size={14} /><span>MNP</span><span className="ml-auto">✕</span></div>
        {msg.sender ? <div className="text-[11px] text-white/70">{msg.sender}</div> : null}
        <div className="font-semibold">{msg.title || <Placeholder>{T('Title', '標題')}</Placeholder>}</div>
        <div className="line-clamp-3 text-white/85">{msg.content || <Placeholder>{T('Text', '內文')}</Placeholder>}</div>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex h-8 items-center justify-end gap-3 bg-[#1b1b1b]/90 px-3 text-[11px] text-white/80"><span>09:41</span></div>
    </div>
  )
  return (
    <div className="mx-auto w-full max-w-[520px] overflow-hidden rounded-lg border border-divider bg-surface">
      <div className="flex items-center gap-1.5 border-b border-divider bg-neutral-1 px-3 py-2"><span className="size-2.5 rounded-full bg-[#f87171]" /><span className="size-2.5 rounded-full bg-[#fbbf24]" /><span className="size-2.5 rounded-full bg-[#34d399]" /></div>
      <div className="flex flex-col gap-1 border-b border-divider px-4 py-3 text-body">
        <span className="text-h6 font-bold">{msg.subject || <Placeholder>{T('Subject', '主旨')}</Placeholder>}</span>
        <span className="text-caption text-fg-secondary">{T('From', '寄件者')}: MNP &lt;no-reply@tsmc.com&gt; · {T('Today 09:41', '今天 09:41')}</span>
      </div>
      <div className="mail-html max-h-[260px] overflow-auto px-4 py-3 text-body" dangerouslySetInnerHTML={{ __html: msg.html || '<p style="color:#98a1b0">' + T('Email text', 'Email 內文') + '</p>' }} />
    </div>
  )
}
