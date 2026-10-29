// Small building blocks shared by every page. All of them are thin compositions of DS components,
// so the look and behaviour come from @qijenchen/design-system.
import * as React from 'react'
import {
  Alert, Avatar, Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  Field, FieldDescription, FieldError, FieldLabel, ProgressBar, Tag, Tooltip, TooltipContent, TooltipTrigger, cn, useTruncated,
  type CategoricalColor,
} from '@qijenchen/design-system'
import {
  AlertTriangle, Bell, CheckCircle2, Clock, Globe, Hash, LoaderCircle, Mail, MessageSquareText, Monitor, Smartphone, type LucideIcon,
} from 'lucide-react'
import type { Channel, Fmt, Person, Status } from '../lib/data'

// ---------- channels, formats and statuses ----------
export const CHN: Record<Channel, { name: string; short: string; icon: LucideIcon; desc: string }> = {
  push: { name: 'Device notifications', short: 'Device', icon: Smartphone, desc: 'Push to the app on company phones.' },
  desktop: { name: 'Desktop OS', short: 'Desktop', icon: Monitor, desc: 'Pop-up on company Windows PCs.' },
  email: { name: 'Email', short: 'Email', icon: Mail, desc: 'Company mailbox, with formatting and files.' },
  sms: { name: 'SMS fallback', short: 'SMS', icon: MessageSquareText, desc: '' },
}
export function chText(list: Channel[]) { return list.length === 1 ? CHN[list[0]].name : list.map(k => CHN[k].short).join(' + ') }

export const FMT: Record<Fmt, { label: string; short: string; icon: LucideIcon }> = {
  notif: { label: 'Notification text', short: 'Notification', icon: Bell },
  sms: { label: 'SMS text', short: 'SMS', icon: MessageSquareText },
  email: { label: 'Email version', short: 'Email', icon: Mail },
}

export const STATUS: Record<Status, { label: string; color: CategoricalColor; icon: LucideIcon }> = {
  scheduled: { label: 'Scheduled', color: 'neutral', icon: Clock },
  progress: { label: 'In progress', color: 'blue', icon: LoaderCircle },
  sent: { label: 'Sent', color: 'green', icon: CheckCircle2 },
  error: { label: 'System error', color: 'red', icon: AlertTriangle },
}
export function StatusTag({ s }: { s: Status }) {
  const st = STATUS[s]
  return <Tag size="sm" color={st.color as any} icon={st.icon}>{st.label}</Tag>
}
// A template's formats, shown with the same icons as the Send channel column:
// notification text fills Device notifications and Desktop OS, then Email and SMS
export function FmtChips({ list }: { list: Fmt[] }) {
  const chs: Channel[] = []
  if (list.indexOf('notif') >= 0) chs.push('push', 'desktop')
  if (list.indexOf('email') >= 0) chs.push('email')
  if (list.indexOf('sms') >= 0) chs.push('sms')
  return <ChIcons list={chs} />
}

// channel icons with a tooltip each, drawn as icon-only DS Tags so they read like the Status tag next
// to them (data indicators, not buttons); SMS is amber as the fallback channel. The empty text slot is hidden.
export function ChIcons({ list }: { list: Channel[] }) {
  return (
    <span className="inline-flex items-center gap-1">
      {list.map(k => {
        const I = CHN[k].icon
        return (
          <Tooltip key={k}>
            <TooltipTrigger asChild>
              <span tabIndex={0} aria-label={CHN[k].name} className="inline-flex rounded-sm focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]">
                <Tag size="sm" color={k === 'sms' ? 'amber' : 'neutral'} icon={I} aria-hidden className="[&_[data-tag-text]]:hidden" />
              </span>
            </TooltipTrigger>
            <TooltipContent>{CHN[k].name}</TooltipContent>
          </Tooltip>
        )
      })}
    </span>
  )
}

// ---------- people ----------
const AV: CategoricalColor[] = ['blue', 'green', 'purple', 'deep-orange', 'turquoise', 'magenta', 'indigo', 'amber']
export const avColor = (c: number) => AV[c % AV.length]
export function PAvatar({ p, size = 24 }: { p: Person; size?: number }) {
  if (p.extKind) return <Avatar size={size} icon={p.extKind === 'phone' ? Hash : Globe} alt={p.value || ''} color="neutral" />
  return <Avatar size={size} alt={p.en} color={avColor(p.c)} />
}
export function Two({ a, b, strong, className }: { a: React.ReactNode; b?: React.ReactNode; strong?: boolean; className?: string }) {
  return (
    <span className={cn('flex min-w-0 flex-col', className)}>
      <span className={cn('truncate text-body', strong ? 'font-medium text-foreground' : 'text-foreground')}>{a}</span>
      {b != null && b !== '' ? <span className="truncate text-caption text-fg-secondary">{b}</span> : null}
    </span>
  )
}
export function Who({ p, sub, size = 24, strong }: { p: Person; sub?: React.ReactNode; size?: number; strong?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <PAvatar p={p} size={size} />
      <Two a={p.extKind ? p.value : (p.zh ? p.zh + ' ' + p.en : p.en)} b={sub} strong={strong} />
    </span>
  )
}
export function IconBox({ icon: I, tone }: { icon: LucideIcon; tone?: 'warn' | 'err' | 'info' | 'ok' | 'neutral' }) {
  const cls = tone === 'warn' ? 'bg-warning-subtle text-warning-text' : tone === 'err' ? 'bg-error-subtle text-error-text' : tone === 'ok' ? 'bg-success-subtle text-success-text' : tone === 'info' ? 'bg-info-subtle text-info-text' : 'bg-neutral-2 text-fg-secondary'
  return <span className={cn('inline-flex size-6 shrink-0 items-center justify-center rounded-md', cls)}><I className="size-4" aria-hidden /></span>
}

// DataTable: columns can't be hidden in this product (see globals.css for the header menu)
export const NO_HIDE = { enableHiding: false }

// ---------- hover text ----------
// Hover text always goes through the DS Tooltip, never the browser's own `title` box.
// Trunc: one line that ends in "…" when it doesn't fit; the full text shows only while it is cut off
// (DS truncated-text pattern: the Tooltip is always there, `open` is held closed when nothing is cut).
export function Trunc({ text, className, onClick }: { text: string; className?: string; onClick?: () => void }) {
  const { ref, isTruncated } = useTruncated<HTMLElement>({ deps: [text] })
  const cls = cn('min-w-0 truncate', className)
  const el = onClick
    ? <button ref={ref as React.Ref<HTMLButtonElement>} type="button" className={cn(cls, 'text-left')} onClick={onClick}>{text}</button>
    : <span ref={ref as React.Ref<HTMLSpanElement>} className={cls} tabIndex={isTruncated ? 0 : undefined}>{text}</span>
  return (
    <Tooltip open={isTruncated ? undefined : false}>
      <TooltipTrigger asChild>{el}</TooltipTrigger>
      <TooltipContent className="max-w-[360px] whitespace-normal break-words">{text}</TooltipContent>
    </Tooltip>
  )
}
// Tip: a short hint on something that isn't truncated text (a tag, a status mark)
export function Tip({ text, children }: { text: React.ReactNode; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  )
}

// ---------- layout ----------
export function Section({ title, sub, actions, children, className }: { title?: React.ReactNode; sub?: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-lg border border-divider bg-surface p-[var(--layout-space-loose)]', className)}>
      {title ? (
        <div className="mb-[var(--layout-space-loose)] flex items-start justify-between gap-[var(--layout-space-loose)]">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-h5 text-foreground">{title}</h2>
            {sub ? <p className="text-body text-fg-secondary">{sub}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  )
}
export function PageIntro({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-h3 text-foreground">{title}</h1>
      <p className="text-body text-fg-secondary">{sub}</p>
    </div>
  )
}

// Banner = DS Alert. `title` is the bold lead-in; `children` is the rest of the sentence.
type BannerTone = 'info' | 'warning' | 'error' | 'neutral' | 'success'
export function Banner({ tone = 'info', title, children, action, className }: { tone?: BannerTone; title?: React.ReactNode; children?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  // the DS Alert keeps its title on one line; banners here are sentences, so let them wrap
  const wrap = (x: React.ReactNode) => <span className="whitespace-normal">{x}</span>
  return <Alert variant={tone} title={wrap(title ?? children)} description={title ? children : undefined} endContent={action} className={className} />
}

// Bar with a value 0–100. tone: ok (green), err (red), default (blue)
export function Meter({ pct, tone, label }: { pct: number; tone?: 'ok' | 'err' | 'warn'; label?: string }) {
  return <ProgressBar aria-label={label || 'Progress'} value={Math.max(0, Math.min(100, pct))} status={tone === 'ok' ? 'success' : tone === 'err' ? 'error' : 'inProgress'} affix={null as any} />
}

// ---------- form fields ----------
export function FormField({ id, label, required, count, over, hint, error, children, className }: {
  id?: string; label?: React.ReactNode; required?: boolean; count?: string; over?: boolean; hint?: React.ReactNode; error?: string; children: React.ReactNode; className?: string
}) {
  // the character counter sits top-right, level with the label
  return (
    <div className={cn('relative', className)}>
      {count ? <span className={cn('absolute right-0 top-0 text-caption leading-5 tabular-nums', over ? 'font-medium text-error-text' : 'text-fg-muted')}>{count}</span> : null}
      <Field id={id} required={required} invalid={!!error}>
        {label ? <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel> : null}
        {children}
        {hint && !error ? <FieldDescription>{hint}</FieldDescription> : null}
        {error ? <FieldError>{error}</FieldError> : null}
      </Field>
    </div>
  )
}
export function ErrText({ children }: { children: React.ReactNode }) {
  return <p className="flex items-center gap-1 text-body text-error-text"><AlertTriangle className="size-4 shrink-0" aria-hidden />{children}</p>
}

// ---------- confirm dialog ----------
export interface Confirm {
  title: string; text: string; icon?: LucideIcon; tone?: 'warn' | 'err' | 'info'
  cancel: string; ok: string; danger?: boolean; run: () => void
  alt?: string; altDanger?: boolean; runAlt?: () => void
  rows?: { k: string; v: React.ReactNode }[]
}
export function ConfirmDialog({ cf, onClose }: { cf: Confirm | null; onClose: () => void }) {
  return (
    <Dialog open={!!cf} onOpenChange={o => { if (!o) onClose() }}>
      {cf ? (
        <DialogContent height="hug" maxWidth={480}>
          <DialogHeader>
            <DialogTitle>{cf.title}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-[var(--layout-space-tight)]">
              <DialogDescription className="text-body text-fg-secondary">{cf.text}</DialogDescription>
              {cf.rows ? <KV rows={cf.rows} /> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="tertiary" onClick={onClose}>{cf.cancel}</Button>
            {cf.alt ? <Button variant="tertiary" danger={cf.altDanger} onClick={cf.runAlt}>{cf.alt}</Button> : null}
            <Button variant="primary" danger={cf.danger} onClick={cf.run}>{cf.ok}</Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}

// key / value list, as used in confirmations and review panels
export function KV({ rows }: { rows: { k: string; v: React.ReactNode }[] }) {
  return (
    <dl className="flex flex-col divide-y divide-divider rounded-md border border-divider">
      {rows.map(r => (
        <div key={r.k} className="grid grid-cols-[140px_1fr] gap-3 px-3 py-2">
          <dt className="text-body text-fg-secondary">{r.k}</dt>
          <dd className="min-w-0 break-words text-body text-foreground">{r.v}</dd>
        </div>
      ))}
    </dl>
  )
}

// a bordered list box with rows, for dialogs and side lists
export function ListBox({ children, max, className }: { children: React.ReactNode; max?: number; className?: string }) {
  return <div className={cn('flex flex-col divide-y divide-divider overflow-auto rounded-md border border-divider', className)} style={max ? { maxHeight: max } : undefined}>{children}</div>
}
export function ListRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex min-h-11 items-center gap-3 px-3 py-2', className)}>{children}</div>
}
