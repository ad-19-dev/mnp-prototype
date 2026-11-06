// A rough preview of a message on each channel, drawn with DS surfaces and text styles rather than a
// realistic device: a notification card for Device Notifications and Desktop OS, a message bubble for SMS
// and a simple email layout. Every word comes in as a prop (plus `zh`).
import * as React from 'react'
import { cn } from '@qijenchen/design-system'
import { Mail, MessageSquareText, Monitor, Smartphone } from 'lucide-react'

export type PreviewChannel = 'push' | 'desktop' | 'sms' | 'email'
export interface PreviewMessage { sender: string; title: string; content: string; smsText: string; subject: string; html: string }

const Placeholder = ({ children }: { children: React.ReactNode }) => <span className="text-fg-muted">{children}</span>

// the line above the content: which channel this is, and when it arrives
function Head({ icon: I, name, when }: { icon: typeof Mail; name: string; when: string }) {
  return (
    <div className="flex items-center gap-1.5 text-caption text-fg-secondary">
      <I className="size-4 shrink-0" aria-hidden /><span className="font-medium">MNP</span><span>· {name}</span>
    </div>
  )
}

export function ChannelPreview({ ch, msg, zh }: { ch: PreviewChannel; msg: PreviewMessage; zh?: boolean }) {
  const T = (en: string, z: string) => (zh ? z : en)
  const card = 'mx-auto flex w-full flex-col gap-1.5 rounded-lg border border-divider bg-surface p-3 shadow-sm'
  if (ch === 'push' || ch === 'desktop') return (
    <div className={cn(card, 'max-w-[400px]')}>
      <Head icon={ch === 'push' ? Smartphone : Monitor} name={ch === 'push' ? 'Device Notifications' : T('Desktop OS', '桌面通知')} when={T('now', '現在')} />
      {msg.sender ? <span className="text-caption text-fg-secondary">{msg.sender}</span> : null}
      {ch === 'desktop' ? <span className="text-body font-semibold">{msg.title || <Placeholder>{T('Title', '標題')}</Placeholder>}</span> : null}
      <span className={cn('whitespace-pre-wrap text-body', ch === 'push' ? 'line-clamp-4' : 'line-clamp-3')}>{msg.content || <Placeholder>{T('Content', '內容')}</Placeholder>}</span>
    </div>
  )
  if (ch === 'sms') return (
    <div className={cn(card, 'max-w-[400px] gap-2')}>
      <Head icon={MessageSquareText} name="SMS" when={T('now', '現在')} />
      <span className="max-w-[85%] self-start whitespace-pre-wrap rounded-lg bg-neutral-1 px-3 py-2 text-body">{msg.smsText || <Placeholder>{T('SMS text', 'SMS 內容')}</Placeholder>}</span>
    </div>
  )
  return (
    <div className={cn(card, 'max-w-[560px] gap-0 p-0')}>
      <div className="flex flex-col gap-1 border-b border-divider p-3">
        <Head icon={Mail} name="Email" when={T('now', '現在')} />
        <span className="text-h6 font-bold">{msg.subject || <Placeholder>{T('Subject', '主旨')}</Placeholder>}</span>
        <span className="text-caption text-fg-secondary">{T('From', '寄件者')}: MNP &lt;no-reply@tsmc.com&gt;</span>
      </div>
      <div className="mail-html max-h-[260px] overflow-auto p-3 text-body" dangerouslySetInnerHTML={{ __html: msg.html || '<p style="color:#98a1b0">' + T('Email text', 'Email 內文') + '</p>' }} />
    </div>
  )
}
