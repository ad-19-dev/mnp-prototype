// Small building blocks shared by every page. All of them are thin compositions of DS components,
// so the look and behaviour come from @qijenchen/design-system.
import * as React from 'react'
import {
  Alert, Avatar, Badge, Button, Checkbox, DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  Field, FieldDescription, FieldError, FieldLabel, ProgressBar, Select, Tag, Tooltip, TooltipContent, TooltipTrigger, cn, useTruncated,
  type CategoricalColor,
} from '@qijenchen/design-system'
import { AlertTriangle, Calendar, CheckCircle2, ChevronDown, Filter, Globe, Hash, Mail, Share2, User, Users, MessageSquareText, Monitor, Send, Smartphone, type LucideIcon, UsersRound } from 'lucide-react'
import { ME as ME_UI, PMAP as PMAP_UI, type Channel, type Fmt, type Person, type Status } from '../lib/data'
import { L } from '../lib/i18n'
import { inTeam, myTeams, teamName } from '../lib/teams'

// ---------- channels and statuses ----------
const CH_ICON: Record<Channel, LucideIcon> = { push: Smartphone, desktop: Monitor, email: Mail, sms: MessageSquareText }
export function chn(k: Channel) {
  const names: Record<Channel, [string, string, string, string, string, string]> = {
    push: ['Device Notifications', 'Device Notifications', 'Device', 'Device', 'Push to the app on company phones.', '推播到公司手機的 App。'],
    desktop: ['Desktop OS', '桌面通知', 'Desktop', '桌面', 'Pop-up on company Windows PCs.', '在公司 Windows 電腦跳出通知。'],
    email: ['Email', 'Email', 'Email', 'Email', 'Company mailbox, with formatting and files.', '寄到公司信箱，可加格式和附件。'],
    sms: ['SMS fallback', 'SMS 備援', 'SMS', 'SMS', '', ''],
  }
  const x = names[k]
  return { name: L(x[0], x[1]), short: L(x[2], x[3]), desc: L(x[4], x[5]), icon: CH_ICON[k] }
}
export const CHN = new Proxy({} as Record<Channel, ReturnType<typeof chn>>, { get: (_t, k: string) => chn(k as Channel) })
export function chText(list: Channel[]) { return list.length === 1 ? chn(list[0]).name : list.map(k => chn(k).short).join(' + ') }

const ST: Record<Status, { en: string; zh: string; color: CategoricalColor; icon: LucideIcon }> = {
  scheduled: { en: 'Scheduled', zh: '已排程', color: 'neutral', icon: Calendar },
  progress: { en: 'Sending', zh: '傳送中', color: 'blue', icon: Send },
  sent: { en: 'Sent', zh: '已送出', color: 'green', icon: CheckCircle2 },
  error: { en: 'Failed', zh: '傳送失敗', color: 'red', icon: AlertTriangle },
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

// ---------- teams ----------
// The team a message belongs to; a person's own messages read "Personal"
export function TeamTag({ id }: { id?: string | null }) {
  return <Tag size="sm" color="neutral" icon={id ? UsersRound : User} unbounded>{teamName(id)}</Tag>
}
// The teams a template or group is shared with: the first one, then "+N" with the rest on hover
export function TeamTags({ ids }: { ids: string[] }) {
  if (!ids.length) return null
  const first = <TeamTag id={ids[0]} />
  if (ids.length === 1) return first
  return (
    <span className="inline-flex min-w-0 items-center gap-1">{first}
      <Tip text={ids.slice(1).map(teamName).join('、')}><span tabIndex={0} className="inline-flex rounded-sm focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-[var(--ring)]"><Tag size="sm" color="neutral">+{ids.length - 1}</Tag></span></Tip>
    </span>
  )
}

// A filter button that opens a checklist; used for status, channel and team filters
export function FilterMenu<K extends string>({ label, opts, sel, toggle, clear }: {
  label: string; sel: K[]; toggle: (k: K) => void; clear: () => void
  opts: { k: K; view: React.ReactNode; n: number }[]
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="tertiary" startIcon={Filter} endIcon={ChevronDown} pressed={sel.length > 0} badge={sel.length ? <Badge count={sel.length} variant="low" /> : undefined}>{label}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" minWidth={260}>
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

// Share a template or group with teams. Every member of a checked team can use and edit it.
// Teams you aren't in stay as they are; you can only add or remove your own.
export function TeamsField({ value, onChange, disabled, what }: { value: string[]; onChange: (ids: string[]) => void; disabled?: boolean; what: 'template' | 'group' }) {
  const teams = myTeams(), others = value.filter(id => !teams.some(t => t.id === id))
  const thing = what === 'template' ? L('template', '模板') : L('group', '群組')
  const toggle = (id: string) => onChange(value.indexOf(id) >= 0 ? value.filter(x => x !== id) : value.concat([id]))
  return (
    <div className="flex flex-col gap-2">
      <span className="text-body font-medium">{L('Share with teams', '共享給團隊')}</span>
      {teams.length ? (
        <div className="flex flex-col divide-y divide-divider rounded-md border border-divider">
          {teams.map(t => (
            <label key={t.id} className={cn('flex min-h-11 items-center gap-3 px-3 py-2', !disabled && 'cursor-pointer')}>
              <Checkbox checked={value.indexOf(t.id) >= 0} disabled={disabled} onCheckedChange={() => toggle(t.id)} aria-label={t.name} />
              <UsersRound className="size-4 shrink-0 text-fg-secondary" aria-hidden />
              <span className="flex-1 text-body">{t.name}</span>
              <span className="text-caption text-fg-secondary tabular-nums">{L(t.members.length + ' members', t.members.length + ' 人')}</span>
            </label>
          ))}
        </div>
      ) : null}
      {others.length ? <span className="flex flex-wrap items-center gap-1.5 text-caption text-fg-secondary">{L('Also shared with', '也共享給')}{others.map(id => <TeamTag key={id} id={id} />)}</span> : null}
      <span className="text-caption text-fg-secondary">{value.length ? L('Members of these teams can use and edit this ' + thing + '.', '這些團隊的成員都能使用和編輯這個' + thing + '。') : L('Not shared with a team.', '沒有共享給團隊。')}</span>
    </div>
  )
}

// filter keys for templates and groups: each team it's shared with, plus "personal" (yours, not shared with a team)
// or "shared" (someone else's, shared with you directly)
export function ownKeys(x: { teams?: string[]; owner?: string; creator?: string }) {
  const t = (x.teams || []).filter(inTeam)
  if (t.length) return t
  return [(x.owner || x.creator) === ME_UI ? 'personal' : 'shared']
}
export function ownOpts(items: { teams?: string[]; owner?: string; creator?: string }[]) {
  const keys = ['personal', 'shared'].concat(myTeams().map(t => t.id))
  return keys.map(k => ({
    k, n: items.filter(x => ownKeys(x).indexOf(k) >= 0).length,
    view: <span className="inline-flex items-center gap-2">{k === 'shared' ? <Share2 className="size-4 text-fg-secondary" aria-hidden /> : k === 'personal' ? <User className="size-4 text-fg-secondary" aria-hidden /> : <UsersRound className="size-4 text-fg-secondary" aria-hidden />}{k === 'personal' ? L('My personal', '我的個人項目') : k === 'shared' ? L('Shared with me', '分享給我的') : teamName(k)}</span>,
  })).filter(o => o.n > 0)
}
// owner column in the templates and groups lists
export function OwnTag({ x }: { x: { teams?: string[]; owner?: string; creator?: string } }) {
  const k = ownKeys(x)
  if (k[0] === 'shared') return <Tag size="sm" color="neutral" icon={Share2} unbounded>{L('Shared with me', '分享給我')}</Tag>
  if (k[0] === 'personal') return <TeamTag id={null} />
  return <TeamTags ids={k} />
}

// ---------- tables ----------
// Rows per page next to the DS Pagination. Its own size menu labels options in Chinese only ("N 筆/頁"),
// so the menu is a DS Select here, worded in the current language.
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
            <h2 className="text-h5 font-semibold text-foreground">{title}</h2>
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
