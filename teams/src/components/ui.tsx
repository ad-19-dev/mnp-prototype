// Small building blocks shared by every page. All of them are thin compositions of DS components,
// so the look and behaviour come from @qijenchen/design-system.
import * as React from 'react'
import {
  Alert, Avatar, Badge, Button, DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  Field, FieldDescription, FieldError, FieldLabel, ProgressBar, Select, Tag, Tooltip, TooltipContent, TooltipTrigger, cn, useTruncated,
  type CategoricalColor,
} from '@qijenchen/design-system'
import { AlertTriangle, Calendar, CalendarX2, CheckCircle2, ChevronDown, CircleX, Hourglass, Filter, Globe, Hash, Mail, MessageSquareText, Monitor, Send, Smartphone, type LucideIcon } from 'lucide-react'
import type { Channel, Fmt, ListKind, Person, Status } from '../lib/data'
import { LIST_KINDS } from '../lib/data'
import { L } from '../lib/i18n'

// ---------- channels and statuses ----------
const CH_ICON: Record<Channel, LucideIcon> = { push: Smartphone, desktop: Monitor, email: Mail, sms: MessageSquareText }
export function chn(k: Channel) {
  const names: Record<Channel, [string, string, string, string, string, string]> = {
    push: ['Device Notifications', 'Device Notifications', 'Device', 'Device', 'Push to the app on company phones.', '推播到公司手機的 App。'],
    desktop: ['Desktop OS', '桌面通知', 'Desktop', '桌面', 'Pop-up on company Windows PCs.', '在公司 Windows 電腦跳出通知。'],
    email: ['Email', 'Email', 'Email', 'Email', 'Company mailbox, with formatting and files.', '寄到公司信箱，可加格式和附件。'],
    sms: ['Device Notifications (SMS)', 'Device Notifications（SMS）', 'SMS', 'SMS', '', ''],
  }
  const x = names[k]
  return { name: L(x[0], x[1]), short: L(x[2], x[3]), desc: L(x[4], x[5]), icon: CH_ICON[k] }
}
export const CHN = new Proxy({} as Record<Channel, ReturnType<typeof chn>>, { get: (_t, k: string) => chn(k as Channel) })
export function chText(list: Channel[]) { return list.length === 1 ? chn(list[0]).name : list.map(k => chn(k).short).join(' + ') }

const ST: Record<Status, { en: string; zh: string; color: CategoricalColor; icon: LucideIcon }> = {
  pending: { en: 'Pending approval', zh: '待核准', color: 'amber', icon: Hourglass },
  expired: { en: 'Scheduled expired', zh: '排程已過期', color: 'deep-orange', icon: CalendarX2 },
  rejected: { en: 'Rejected', zh: '已駁回', color: 'red', icon: CircleX },
  scheduled: { en: 'Scheduled', zh: '已排程', color: 'neutral', icon: Calendar },
  progress: { en: 'In progress', zh: '傳送中', color: 'blue', icon: Send },
  sent: { en: 'Sent', zh: '已送出', color: 'green', icon: CheckCircle2 },
  error: { en: 'Error', zh: '傳送錯誤', color: 'red', icon: AlertTriangle },
}
export const statusLabel = (s: Status) => L(ST[s].en, ST[s].zh)
export function StatusTag({ s }: { s: Status }) {
  return <Tag size="sm" color={ST[s].color as any} icon={ST[s].icon}>{statusLabel(s)}</Tag>
}

// channel icons with a tooltip each, drawn as icon-only DS Tags so they read like the Status tag next
// to them (data indicators, not buttons); SMS is amber as the fallback channel. The empty text slot is hidden.
export function ChIcons({ list }: { list: Channel[] }) {
  return (
    <span className="inline-flex items-center gap-1">
      {list.map(k => {
        const c = chn(k), I = c.icon
        return (
          <Tooltip key={k}>
            <TooltipTrigger asChild>
              <span tabIndex={0} aria-label={c.name} className="inline-flex rounded-sm focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]">
                <Tag size="sm" color={k === 'sms' ? 'amber' : 'neutral'} icon={I} aria-hidden className="[&_[data-tag-text]]:hidden" />
              </span>
            </TooltipTrigger>
            <TooltipContent>{c.name}</TooltipContent>
          </Tooltip>
        )
      })}
    </span>
  )
}
// A template's formats, shown with the same icons as the Send channel column:
// notification text fills Device Notifications and Desktop OS, then Email and SMS
export function FmtChips({ list }: { list: Fmt[] }) {
  const chs: Channel[] = []
  if (list.indexOf('notif') >= 0) chs.push('push', 'desktop')
  if (list.indexOf('email') >= 0) chs.push('email')
  if (list.indexOf('sms') >= 0) chs.push('sms')
  return <ChIcons list={chs} />
}

// ---------- people ----------
const AV: CategoricalColor[] = ['blue', 'green', 'purple', 'deep-orange', 'turquoise', 'magenta', 'indigo', 'amber']
export const avColor = (c: number) => AV[c % AV.length]
export function PAvatar({ p, size = 24 }: { p: Person; size?: number }) {
  if (p.extKind) return <Avatar size={size} icon={p.extKind === 'phone' ? Hash : Globe} alt={p.value || ''} color="neutral" />
  return <Avatar size={size} alt={p.en} color={avColor(p.c)} />
}
export const pname = (p: Person) => p.extKind ? (p.value || '') : (p.zh ? p.zh + ' ' + p.en : p.en)
export function Two({ a, b, strong, className }: { a: React.ReactNode; b?: React.ReactNode; strong?: boolean; className?: string }) {
  return (
    <span className={cn('flex min-w-0 flex-col', className)}>
      <span className={cn('truncate text-body', strong ? 'font-medium text-foreground' : 'text-foreground')}>{a}</span>
      {b != null && b !== '' ? <span className="truncate text-caption text-fg-secondary">{b}</span> : null}
    </span>
  )
}
export function IconBox({ icon: I, tone }: { icon: LucideIcon; tone?: 'warn' | 'err' | 'info' | 'ok' | 'neutral' }) {
  const cls = tone === 'warn' ? 'bg-warning-subtle text-warning-text' : tone === 'err' ? 'bg-error-subtle text-error-text' : tone === 'ok' ? 'bg-success-subtle text-success-text' : tone === 'info' ? 'bg-info-subtle text-info-text' : 'bg-neutral-2 text-fg-secondary'
  return <span className={cn('inline-flex size-6 shrink-0 items-center justify-center rounded-md', cls)}><I className="size-4" aria-hidden /></span>
}

// DataTable: columns can't be hidden in this product (see globals.css for the header menu)
export const NO_HIDE = { enableHiding: false }

// A filter button that opens a checklist; used for status and channel filters
export function FilterMenu<K extends string>({ label, opts, sel, toggle, clear }: {
  label: string; sel: K[]; toggle: (k: K) => void; clear: () => void
  opts: { k: K; view: React.ReactNode; n: number }[]
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* DS table toolbar: text buttons, pressed while they filter; the badge counts the values picked */}
        <Button variant="text" endIcon={ChevronDown} pressed={sel.length > 0} badge={sel.length ? <Badge count={sel.length} variant="low" /> : undefined}>{label}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" minWidth={260}>
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          {opts.map(o => (
            <DropdownMenuCheckboxItem key={o.k} checked={sel.indexOf(o.k) >= 0} onCheckedChange={() => toggle(o.k)} onSelect={e => e.preventDefault()}>
              <span className="flex w-full items-center justify-between gap-3">{o.view}<span className="text-caption text-fg-muted tabular-nums">{o.n}</span></span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={!sel.length} onSelect={clear}>{sel.length ? L('Clear', '清除') : L('Showing all', '全部顯示中')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


// ---------- tables ----------
// Rows per page next to the DS Pagination. Its own size menu labels options in Chinese only ("N 筆/頁"),
// so the menu is a DS Select here, worded in the current language.
// ---------- pasted lists ----------
// What a pasted list holds; chosen before pasting, one kind per list
export const listKindName = (k: ListKind) => ({
  nt: L('NT accounts', 'NT 帳號'), emp: L('Employee IDs', '工號'), name: L('Names', '姓名'), email: L('Emails', 'Email'),
  phone: L('Mobile numbers', '手機號碼'), mvpn: L('MVPN', 'MVPN'), org: L('Org codes', '組織代碼'),
})[k]
export const listKindExample = (k: ListKind) => ({
  nt: 'gywu, cmchen', emp: '120588, 112306', name: L('陳怡君, Kevin Lin', '陳怡君, Kevin Lin'), email: 'gywu@tsmc.com, partner@example.com',
  phone: '0918-226-588, 0921660734', mvpn: '61588, 60217', org: 'PLT/UX, F18/MFG3',
})[k]
export function ListKindField({ id, value, onChange, error }: { id: string; value: ListKind | null; onChange: (k: ListKind) => void; error?: string }) {
  return (
    <FormField id={id} label={L('Data type', '資料類型')} required hint={L('Every entry in the list must be this type.', '名單裡的每一筆都要是這個類型。')} error={error}>
      <div className="w-64 max-w-full">
        <Select id={id} aria-label={L('Data type', '資料類型')} placeholder={L('Choose a type', '請選擇')} value={value || ''} onChange={v => onChange(v as ListKind)}
          options={LIST_KINDS.map(k => ({ value: k, label: listKindName(k) }))} />
      </div>
    </FormField>
  )
}

export const PAGE_SIZES = [10, 20, 50]
export function PageSize({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="w-36">
      <Select size="sm" aria-label={L('Rows per page', '每頁筆數')} value={String(value)} onChange={v => onChange(Number(v))}
        options={PAGE_SIZES.map(n => ({ value: String(n), label: L(n + ' per page', n + ' 筆/頁') }))} />
    </div>
  )
}

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
    // sections are separated by white space only, no boxes or rules (DS layoutSpace: parallel sections = loose gap)
    <section className={className}>
      {title ? (
        <div className="mb-[var(--layout-space-tight)] flex items-start justify-between gap-[var(--layout-space-loose)]">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-h4 font-bold text-foreground">{title}</h2>
            {sub ? <p className="text-body text-fg-secondary">{sub}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  )
}

// Banner = DS Alert. `title` is the bold lead-in; `children` is the rest.
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
        <div key={r.k} className="grid grid-cols-[120px_1fr] gap-3 px-3 py-2">
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
