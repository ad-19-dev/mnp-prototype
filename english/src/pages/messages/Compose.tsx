// Send flow: 1 Receivers & channels, 2 Message, 3 Schedule & review, plus the approval result
import * as React from 'react'
import {
  Button, Checkbox, DataTable, DatePicker, Empty, FileItem, FileUpload, Input, RadioGroup, RadioGroupItem, SegmentedControl,
  SegmentedControlItem, StepDescription, StepItem, StepLabel, Steps, Tag, Textarea, cn, useIsNarrowViewport,
} from '@qijenchen/design-system'
import { NO_HIDE } from '../../components/ui'
import { createColumnHelper } from '@tanstack/react-table'
import {
  AlertTriangle, Building2, CalendarClock, ChevronLeft, ChevronRight, FlaskConical, Globe, Info, LayoutTemplate, Mail,
  MessageSquareText, Monitor, Phone, Plus, Save, Search, Send, ShieldCheck, Smartphone, Upload, UserPlus, Users, X, Zap,
} from 'lucide-react'
import {
  CAP, CH_CARDS, DESK, DOMAIN, LIM, ORGS, PMAP, SUPERVISOR, addMin, cutAt, flatten, fmtN, fmtSize, fromIso, isExtPhone,
  joinList, niceDT, pad, placeholders, plural, toIso, tplFormats, tplHasNotif, vwidth, type Channel, type Tag as RTag,
} from '../../lib/data'
import {
  approval, effEmailMode, hasNotif, multiPeople, noNumber, reachNote, recvCount, smsCoverText, smsOn, stepOk, unresolved,
  type Errs, type Reach,
} from '../../lib/compose'
import { useApp } from '../../lib/store'
import { Banner, CHN, ErrText, FmtChips, FormField, IconBox, KV, Meter, PAvatar, Section, Two } from '../../components/ui'
import { RecvInput, riKey } from '../../components/RecvInput'
import { RichText } from '../../components/RichText'
import { PageHeader } from '../../components/shell'
import type { SendCtl } from './ctl'

const TITLES = { new: 'New message', edit: 'Edit scheduled message', duplicate: 'Duplicate message', resend: 'Resend to not-sent receivers' }

export function ComposeView({ m }: { m: SendCtl }) {
  useApp()
  const c = m.s.c, ap = approval(c), e = m.errs()
  return (
    <div data-compose className="flex min-h-full flex-col">
      <PageHeader
        crumbs={[{ label: 'Messages', onClick: () => m.goList() }, { label: TITLES[c.mode] || 'New message' }]}
        actions={c.result ? null : (
          <>
            {ap.mgr ? <Tag size="md" color="amber" icon={ShieldCheck}>Needs supervisor approval</Tag> : null}
            {ap.icsd ? <Tag size="md" color="amber" icon={ShieldCheck}>Needs ICSD approval</Tag> : null}
            {c.savedAt ? <span className="text-caption text-fg-secondary">Draft saved at {pad(c.savedAt.getHours())}:{pad(c.savedAt.getMinutes())}</span> : null}
            <Button variant="tertiary" startIcon={Save} onClick={() => m.saveDraft()}>Save draft</Button>
          </>
        )}
      />
      {c.result ? <ResultView m={m} /> : (
        <>
          <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-[var(--layout-space-loose)] p-[var(--layout-space-loose)] pb-[var(--layout-space-bottom)]">
            <StepBar m={m} e={e} />
            {c.step === 1 ? <Step1 m={m} e={e} /> : c.step === 2 ? <Step2 m={m} e={e} /> : <Step3 m={m} e={e} />}
          </div>
          <FootBar m={m} />
        </>
      )}
    </div>
  )
}

function StepBar({ m, e }: { m: SendCtl; e: Errs }) {
  const c = m.s.c, narrow = useIsNarrowViewport()
  const steps = [['Receivers & channels', 'Who gets it, and how'], ['Message', 'What each channel shows'], ['Schedule & review', 'When, and a last check']]
  const done = [1, 2, 3].filter(n => n !== c.step && n <= c.maxStep && stepOk(n, e)).map(n => 's' + n)
  // on a phone the three steps don't fit side by side
  if (narrow) return (
    <div className="flex items-center gap-3 rounded-lg border border-divider bg-surface px-[var(--layout-space-loose)] py-[var(--layout-space-tight)]">
      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-body font-medium text-on-emphasis">{c.step}</span>
      <Two a={steps[c.step - 1][0]} b={'Step ' + c.step + ' of 3 · ' + steps[c.step - 1][1]} strong />
    </div>
  )
  return (
    <div className="rounded-lg border border-divider bg-surface px-[var(--layout-space-loose)] py-[var(--layout-space-tight)]">
      <Steps orientation="horizontal" value={'s' + c.step} completedValues={done} onValueChange={v => m.goStep(+v.slice(1))}>
        {steps.map((x, i) => {
          const n = i + 1, can = n === c.step || n <= Math.max(c.maxStep, c.step + 1)
          return (
            <StepItem key={n} value={'s' + n} disabled={!can}>
              <StepLabel>{x[0]}</StepLabel>
              <StepDescription>{x[1]}</StepDescription>
            </StepItem>
          )
        })}
      </Steps>
    </div>
  )
}

// ---------- step 1 ----------
const rcol = createColumnHelper<{ t: RTag; label: string; sub: string; kind: string; cnt: number; can: { k: Channel; n: number; of: number }[]; warn: boolean; badge: string; badgeBtn: boolean }>()

function recvKind(t: RTag) { return t.type === 'person' ? 'Person' : t.type === 'org' ? 'Org' : t.type === 'group' ? 'Audience group' : isExtPhone(t) ? 'External phone' : 'External email' }

function RecvTable({ m }: { m: SendCtl }) {
  const app = useApp(), s = m.s, c = s.c, q = (s.rf || '').trim().toLowerCase(), sms = smsOn(c)
  const rows = c.receivers.map(t => {
    let label = '', sub = '', ppl: any[] = [], cnt = 1, warn = false, badge = '', badgeBtn = false
    if (t.type === 'person') {
      const p = PMAP[t.id!]; ppl = [p].filter(Boolean)
      label = p ? p.zh + ' ' + p.en : t.id!; sub = p ? p.nt + ' · ' + p.emp + ' · ' + p.org : ''
      const multi = sms && p && p.co && p.pp, unres = multi && !c.pick[t.key], noNum = sms && p && !p.co && !p.pp
      badge = unres ? 'Choose number' : noNum ? 'No phone' : ''; badgeBtn = !!unres; warn = !!unres
    } else if (t.type === 'group' || t.type === 'org') {
      ppl = flatten([t], app.groups).map(x => PMAP[x.pid]).filter(Boolean); cnt = ppl.length
      if (t.type === 'group') { const g = app.groups.find(x => x.id === t.id); label = g ? g.name : t.id!; sub = 'Audience group · ' + plural(g ? g.count : 0, 'member') }
      else { const o = ORGS.find(x => x.code === t.id); label = t.id!; sub = (o ? o.name : '') + ' · ' + plural(o ? o.count : 0, 'member') }
    } else {
      const ph = isExtPhone(t), on = ph ? c.ch.sms : c.ch.email
      label = t.email!; sub = ph ? 'External phone number · gets the SMS fallback only' : 'External email · gets Email only'; warn = !on
    }
    const internal = ppl.filter(p => !p.extKind), xe = ppl.filter(p => p.extKind === 'email').length, xp = ppl.filter(p => p.extKind === 'phone').length
    const can = t.type === 'ext'
      ? [{ k: (isExtPhone(t) ? 'sms' : 'email') as Channel, n: 1, of: 1 }]
      : [{ k: 'push' as Channel, n: internal.filter(p => p.dev).length, of: cnt }, { k: 'desktop' as Channel, n: internal.filter(p => p.desk).length, of: cnt }, { k: 'email' as Channel, n: internal.length + xe, of: cnt }, { k: 'sms' as Channel, n: internal.filter(p => p.co || p.pp).length + xp, of: cnt }]
    return { t, label, sub, kind: recvKind(t), cnt, can, warn, badge, badgeBtn }
  }).filter(x => !q || (x.label + ' ' + x.sub + ' ' + x.kind).toLowerCase().indexOf(q) >= 0)

  const cols = React.useMemo(() => [
    rcol.display({ id: 'who', header: 'Receiver', meta: { width: 320 }, cell: i => {
      const x = i.row.original, t = x.t, p = t.type === 'person' ? PMAP[t.id!] : null
      const Icon = t.type === 'group' ? Users : t.type === 'org' ? Building2 : isExtPhone(t) ? Phone : Globe
      return (
        <span className="flex min-w-0 items-center gap-2">
          {p ? <PAvatar p={p} /> : <IconBox icon={Icon} tone={t.type === 'ext' ? (x.warn ? 'warn' : 'neutral') : 'neutral'} />}
          <Two a={x.label} b={x.sub} strong />
          {x.badgeBtn ? <Button size="xs" variant="secondary" onClick={() => m.openNumbers()}>{x.badge}</Button> : x.badge ? <Tag size="sm">{x.badge}</Tag> : null}
        </span>
      )
    } }),
    rcol.accessor('kind', { header: 'Type', meta: { width: 140 } }),
    rcol.accessor('cnt', { header: 'Count', meta: { width: 90, align: 'right' }, cell: i => <span className="tabular-nums">{fmtN(i.getValue())}</span> }),
    rcol.display({ id: 'can', header: 'Can receive', meta: { width: 260 }, cell: i => (
      <span className="flex flex-wrap items-center gap-1.5">
        {i.row.original.can.map(x => {
          const I = CHN[x.k].icon
          return <span key={x.k} title={CHN[x.k].name + (x.of > 1 ? ': ' + x.n + ' of ' + x.of : x.n ? '' : ': not available')} className={cn('inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-caption tabular-nums', x.n ? 'bg-neutral-2 text-foreground' : 'bg-transparent text-fg-disabled line-through')}><I className="size-3.5" aria-hidden />{x.of > 1 ? fmtN(x.n) : null}</span>
        })}
      </span>
    ) }),
  ], [m])

  if (!c.receivers.length) return <Empty icon={Users} title="No receivers yet" description="Pick a type above and search, or use Batch import to paste a list." />
  return (
    <div className="flex flex-col gap-2">
      {c.receivers.length > 6 ? (
        <div className="flex items-center gap-2">
          <div className="w-64"><Input size="sm" startIcon={Search} type="search" placeholder="Filter receivers" aria-label="Filter receivers" value={s.rf} onChange={ev => m.set({ rf: ev.target.value })} /></div>
          {rows.length !== c.receivers.length ? <span className="text-caption text-fg-secondary">Showing {rows.length} of {c.receivers.length}</span> : null}
          <Button variant="link" size="sm" danger className="ml-auto" onClick={() => m.askRemoveAll()}>Remove all</Button>
        </div>
      ) : null}
      <DataTable tableOptions={NO_HIDE} pinnedLeftColumns={['who']} columns={cols as any} data={rows} bordered height={rows.length > 6 ? '320px' : 'auto'} getRowId={x => x.t.key}
        rowActions={(x: any) => <Button variant="text" size="xs" iconOnly startIcon={X} aria-label={'Remove ' + x.label} onClick={() => m.removeRecv(x.t.key)} />} />
    </div>
  )
}

function ChCard({ m, k, rc }: { m: SendCtl; k: Channel; rc: Reach }) {
  const c = m.s.c, on = !!c.ch[k], meta = CHN[k], n = (rc as any)[k] as number, hasR = rc.total > 0
  const tpl = c.tplId ? m.tplById(c.tplId) : null
  const tplHas = !tpl ? false : k === 'email' ? (tpl.email.mode === 'own' || tplHasNotif(tpl)) : tplHasNotif(tpl)
  const pct = Math.round(n / Math.max(1, rc.total) * 100), id = 'ch-' + k
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer flex-col gap-3 rounded-lg border p-[var(--layout-space-tight)] transition-colors', on ? 'border-primary bg-primary-subtle/40' : 'border-border hover:border-border-hover')}>
      <span className="flex items-start gap-3">
        <IconBox icon={meta.icon} tone={on ? 'info' : 'neutral'} />
        <Two a={meta.name} b={meta.desc} strong className="flex-1 [&>span:last-child]:whitespace-normal" />
        <Checkbox id={id} checked={on} onCheckedChange={() => m.pickChannel(k)} aria-label={meta.name} />
      </span>
      {hasR ? (
        <span className="flex flex-col gap-1.5 border-t border-divider pt-2.5">
          <span className="flex items-baseline justify-between text-caption text-fg-secondary"><span>Reaches</span><span><span className="text-body font-medium text-foreground tabular-nums">{fmtN(n)}</span> of {fmtN(rc.total)}</span></span>
          <Meter pct={pct} tone={pct >= 100 ? 'ok' : undefined} label={meta.name + ' reach'} />
          <span className={cn('text-caption', pct < 80 ? 'text-warning-text' : 'text-fg-secondary')}>{reachNote(k, rc, c)}</span>
        </span>
      ) : null}
      {tpl ? <span className={cn('flex items-center gap-1 text-caption', tplHas ? 'text-success-text' : 'text-fg-secondary')}>{tplHas ? 'The template has text for this' : 'The template has no text for this'}</span> : null}
    </label>
  )
}

function Step1({ m, e }: { m: SendCtl; e: Errs }) {
  const app = useApp(), s = m.s, c = s.c, tried = c.tried || {}, rc = m.reach(), total = rc.total, hasR = c.receivers.length > 0
  const tpl = c.tplId ? m.tplById(c.tplId) : null, ap = approval(c), sms = smsOn(c)
  const multi = multiPeople(c), unres = unresolved(c), noNum = noNumber(c), anyCh = c.ch.push || c.ch.desktop || c.ch.email
  const kinds = { person: 0, group: 0, org: 0, ext: 0 }
  c.receivers.forEach(t => { kinds[t.type]++ })
  const bd: string[] = []
  if (kinds.person) bd.push(plural(kinds.person, 'person', 'people'))
  if (kinds.group) bd.push(plural(kinds.group, 'group'))
  if (kinds.org) bd.push(plural(kinds.org, 'org'))
  if (kinds.ext) bd.push(plural(kinds.ext, 'external receiver', 'external receivers'))
  const dupes = c.receivers.reduce((a, t) => a + recvCount(t, app.groups), 0) > total
  const capPct = Math.min(100, Math.round(total / CAP * 100))
  return (
    <>
      {tpl ? <Banner tone="info" title={'Using the template ' + tpl.name + '.'} action={<FmtChips list={tplFormats(tpl)} />}>Its text is filled in on the next step.</Banner> : null}
      <Section title="Receivers" sub={'Choose a type, then search or type. Contractors can be added by phone or email. Up to ' + CAP + ' receivers per message.'}>
        <div className="flex flex-col gap-[var(--layout-space-tight)]">
          <RecvInput
            id="ri-send" ri={s.ri} setRi={ri => m.set({ ri })} groups={app.groups}
            bad={(tried[1] && !c.receivers.length) || total > CAP}
            isAdded={it => c.receivers.some(t => t.key === riKey(it))}
            onAdd={it => { const k = riKey(it); if (it.kind === 'ext') m.addRecv({ key: k, type: 'ext', email: it.value }); else m.addRecv({ key: k, type: it.kind, id: it.id }) }}
            extra={<Button variant="tertiary" startIcon={Upload} onClick={() => m.openImport()}>Batch import</Button>}
          />
          <RecvTable m={m} />
          {tried[1] && !hasR ? <ErrText>Add at least one receiver.</ErrText> : null}
          <div className="flex flex-col gap-1.5 rounded-md bg-neutral-1 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-body"><span className="font-medium">{plural(total, 'receiver')}</span> <span className="text-fg-secondary">{bd.length ? '· ' + bd.join(', ') : ''}{dupes ? ' · people in more than one group are counted once' : ''}</span></span>
              <span className="text-caption text-fg-secondary">{fmtN(total)} of {CAP} max</span>
            </div>
            <Meter pct={capPct} tone={total > CAP ? 'err' : undefined} label="Receiver limit" />
            {total > CAP ? <ErrText>That’s {fmtN(total - CAP)} over the {CAP}-receiver limit. Remove some receivers, or split this into separate messages.</ErrText> : null}
          </div>
          {sms && multi.length ? (
            <Banner tone={unres.length ? 'warning' : 'info'} action={<Button size="sm" variant="secondary" onClick={() => m.openNumbers()}>{unres.length ? 'Choose numbers' : 'Review'}</Button>}>
              {unres.length ? plural(unres.length, 'person', 'people') + ' you added ' + (unres.length === 1 ? 'has' : 'have') + ' more than one phone number. Choose which one gets the SMS fallback.' : 'SMS numbers confirmed for ' + plural(multi.length, 'person', 'people') + ' with more than one phone number.'}
            </Banner>
          ) : null}
          {sms && noNum.length ? <Banner tone="neutral">{noNum.map(p => p.en).join(', ')} {noNum.length === 1 ? 'has' : 'have'} no phone number on file, so SMS fallback skips {noNum.length === 1 ? 'them' : 'them all'}.</Banner> : null}
        </div>
      </Section>

      <Section title="Channels" sub={'Pick one or more. ' + (hasR ? 'Reach is worked out from the receivers above.' : 'Add receivers to see how many people each channel reaches.')}>
        <div className="flex flex-col gap-[var(--layout-space-tight)]">
          <div className="grid gap-[var(--layout-space-tight)] md:grid-cols-3">{CH_CARDS.map(k => <ChCard key={k} m={m} k={k} rc={rc} />)}</div>
          {c.ch.push ? (
            <div className="flex flex-col gap-[var(--layout-space-tight)] rounded-md border border-divider bg-neutral-1 p-3">
              <Checkbox
                checked={c.ch.sms} onCheckedChange={() => m.pickChannel('sms')}
                label={<span className="inline-flex items-center gap-2">Fall back to SMS <Tag size="sm" color="amber">ICSD approval</Tag></span>}
                description={'If someone doesn’t get the device notification, MNP sends an SMS instead.' + (hasR ? smsCoverText(rc) : '')}
              />
              {c.ch.sms ? <Banner tone="warning" title="This message will need ICSD approval.">SMS reaches phones outside tWorkspace, so ICSD reviews every SMS fallback. Reviews usually take 1 business day, and nothing is sent on any channel until it’s approved.</Banner> : null}
            </div>
          ) : null}
          {tried[1] && e.ch ? <ErrText>{e.ch}</ErrText> : null}
          {e.ext ? <ErrText>{e.ext}</ErrText> : null}
          {e.extp ? <ErrText>{e.extp}</ErrText> : null}
          {ap.mgr ? <Banner tone="warning">{plural(ap.ext, 'external receiver', 'external receivers')} will get this message. Anything sent outside the company needs approval from your supervisor, {SUPERVISOR}.</Banner> : null}
          {hasR && anyCh ? (
            <div className="flex flex-col gap-2 rounded-md border border-divider p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-body"><span className="font-medium">{fmtN(rc.reachable)} of {fmtN(rc.total)}</span> <span className="text-fg-secondary">receivers can be reached with the channels you picked</span></span>
                {rc.unrN ? <Button variant="link" size="sm" onClick={() => m.set({ unr: true })}>See who would miss it</Button> : null}
              </div>
              <Meter pct={Math.round(rc.reachable / Math.max(1, rc.total) * 100)} tone={rc.unrN ? undefined : 'ok'} label="Coverage" />
              {rc.unrN ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-body text-warning-text">{plural(rc.unrN, 'receiver')} would miss this message.</span>
                  {rc.viaEmail ? <Button size="sm" variant="secondary" startIcon={Plus} onClick={() => m.pickChannel('email')}>{rc.viaEmail === rc.unrN ? 'Add Email to reach all of them' : 'Add Email to reach ' + rc.viaEmail}</Button> : null}
                  {rc.viaSms ? <Button size="sm" variant="secondary" startIcon={Plus} onClick={() => m.pickChannel('sms')}>Turn on SMS fallback to reach {rc.viaSms === rc.unrN ? 'all of them' : rc.viaSms}</Button> : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </Section>
    </>
  )
}

// ---------- step 2 ----------
function FormatBlock({ icon, title, uses, children, tone }: { icon: typeof Mail; title: string; uses?: React.ReactNode; children: React.ReactNode; tone?: 'warn' }) {
  return (
    <div className="flex flex-col gap-[var(--layout-space-tight)] rounded-lg border border-divider p-[var(--layout-space-tight)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-body font-medium"><IconBox icon={icon} tone={tone || 'info'} />{title}</span>
        {uses ? <span className="flex flex-wrap items-center gap-1.5">{uses}</span> : null}
      </div>
      {children}
    </div>
  )
}

function Step2({ m, e }: { m: SendCtl; e: Errs }) {
  const c = m.s.c, tried = c.tried || {}, hasN = hasNotif(c), lim = LIM.push, tpl = c.tplId ? m.tplById(c.tplId) : null
  const show = (k: keyof Errs, v: string, n: number) => (e[k] && (tried[2] || (v && v.length > n))) ? e[k]! : ''
  const eSender = show('sender', c.sender, LIM.sender), eTitle = show('title', c.title, LIM.title), eContent = show('content', c.content, lim), eSms = show('sms', c.smsText, LIM.sms)
  const contentHint = c.ch.desktop ? 'Desktop OS shows only about the first 120 characters (about 60 in Chinese). Put what people need to do first.' : 'Lock screens show about 4 lines, so lead with what receivers need to do.'
  const deskTitle = c.ch.desktop && vwidth(c.title) > DESK.title, deskText = c.ch.desktop && vwidth(c.content) > DESK.text
  const cutNote = (label: string, s: string, w: number) => <Banner tone="warning" title={'Desktop OS cuts the ' + label + ' short.'}>People see “…{cutAt(s, w).slice(-18)}” and click the notification to read the rest in tWorkspace.</Banner>
  const rc = m.reach(), smsWho = ['employees the device notification misses', rc.extP ? 'external phone numbers' : ''].filter(Boolean)
  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-divider bg-surface p-[var(--layout-space-tight)]">
        <IconBox icon={LayoutTemplate} tone="info" />
        <span className="flex min-w-0 flex-1 flex-col">
          {tpl ? <><span className="text-body font-medium">Template: {tpl.name}</span><span className="text-caption text-fg-secondary">Edits here don’t change the template. Replace the [bracketed] parts before sending.</span></>
            : <><span className="text-body font-medium">Start from a template</span><span className="text-caption text-fg-secondary">Fill in wording your team already uses, then adjust it. Or write your own below.</span></>}
        </span>
        <span className="flex gap-2">
          {tpl ? <><Button size="sm" variant="secondary" onClick={() => m.set({ tp: { q: '' } })}>Change</Button><Button size="sm" variant="text" onClick={() => m.clearTemplate()}>Stop using</Button></>
            : <Button variant="secondary" startIcon={LayoutTemplate} onClick={() => m.set({ tp: { q: '' } })}>Choose template</Button>}
        </span>
      </div>
      <Section title="Message" sub={'Write each format once. Device notification and Desktop OS share the notification text' + (c.ch.email ? ', and Email can reuse it or have its own version' : '') + '.'}>
        <div className="flex flex-col gap-[var(--layout-space-loose)]">
          <FormField id="f-sender" label="Sender name" required count={c.sender.length + ' / ' + LIM.sender} over={c.sender.length > LIM.sender} hint="Shown as who the message is from, on every channel." error={eSender}>
            <Input id="f-sender" value={c.sender} error={!!eSender} onChange={ev => m.setC({ sender: ev.target.value })} placeholder="e.g. IT Service Desk" />
          </FormField>
          {hasN ? (
            <FormatBlock icon={MessageSquareText} title="Notification text" uses={<>{c.ch.push ? <Tag size="sm" icon={Smartphone}>Device notification</Tag> : null}{c.ch.desktop ? <Tag size="sm" icon={Monitor}>Desktop OS</Tag> : null}</>}>
              {tpl && !tplHasNotif(tpl) ? <Banner tone="neutral">This template has no notification text. Write a short version here.</Banner> : null}
              <FormField id="f-title" label="Title" required count={c.title.length + ' / ' + LIM.title} over={c.title.length > LIM.title} error={eTitle}>
                <Input id="f-title" value={c.title} error={!!eTitle} onChange={ev => m.setC({ title: ev.target.value })} placeholder="One line receivers can act on" />
              </FormField>
              {deskTitle ? cutNote('title', c.title, DESK.title) : null}
              <FormField id="f-content" label="Text" required count={fmtN(c.content.length) + ' / ' + lim} over={c.content.length > lim} hint={contentHint} error={eContent}>
                <Textarea id="f-content" rows={4} value={c.content} error={!!eContent} onChange={ev => m.setC({ content: ev.target.value })} placeholder="Say what’s happening and what receivers should do." />
              </FormField>
              {deskText ? cutNote('text', c.content, DESK.text) : null}
            </FormatBlock>
          ) : null}
          {smsOn(c) ? (
            <FormatBlock icon={MessageSquareText} tone="warn" title="SMS fallback text" uses={<Tag size="sm" unbounded>{smsWho.length ? 'For ' + joinList(smsWho) : 'No one gets the SMS yet'}</Tag>}>
              <FormField id="f-sms" label="SMS text" required count={c.smsText.length + ' / ' + LIM.sms} over={c.smsText.length > LIM.sms} hint="One SMS holds 70 characters. Keep links out: SMS doesn’t open tWorkspace." error={eSms}>
                <Textarea id="f-sms" rows={2} value={c.smsText} error={!!eSms} onChange={ev => m.setC({ smsText: ev.target.value })} placeholder="Short version of the message" />
              </FormField>
              {hasN ? <div><Button variant="link" size="sm" onClick={() => m.copySms()}>Copy from the notification text</Button></div> : null}
            </FormatBlock>
          ) : null}
          {c.ch.email ? <EmailBlock m={m} e={e} show={show} /> : null}
        </div>
      </Section>
    </>
  )
}

function EmailBlock({ m, e, show }: { m: SendCtl; e: Errs; show: (k: keyof Errs, v: string, n: number) => string }) {
  const c = m.s.c, hasN = hasNotif(c), mode = effEmailMode(c), used = c.atts.reduce((a, x) => a + x.size, 0)
  const eSub = show('subject', c.subject, LIM.subject), bodyN = c.bodyText.trim().length, eBody = show('body', c.bodyText.trim(), LIM.body)
  return (
    <FormatBlock icon={Mail} title="Email" uses={hasN ? (
      <SegmentedControl size="sm" value={mode || 'same'} onValueChange={v => v && m.setEmailMode(v as 'same' | 'own')} aria-label="Email text">
        <SegmentedControlItem value="same">Same as notification</SegmentedControlItem>
        <SegmentedControlItem value="own">Separate email</SegmentedControlItem>
      </SegmentedControl>
    ) : null}>
      {mode === 'same' ? (
        <div className="flex flex-col gap-2 rounded-md bg-neutral-1 p-3">
          <div className="grid grid-cols-[72px_1fr] gap-2 text-body"><span className="text-fg-secondary">Subject</span><span>{c.title.trim() || <span className="text-fg-muted">The notification title</span>}</span></div>
          <div className="grid grid-cols-[72px_1fr] gap-2 text-body"><span className="text-fg-secondary">Text</span><span className="whitespace-pre-wrap">{c.content.trim() || <span className="text-fg-muted">The notification text</span>}</span></div>
          <span className="text-caption text-fg-secondary">Sent as a plain email. Choose Separate email to add formatting, links or attachments.</span>
        </div>
      ) : (
        <>
          <FormField id="f-subject" label="Subject" required count={c.subject.length + ' / ' + LIM.subject} over={c.subject.length > LIM.subject} error={eSub}>
            <Input id="f-subject" value={c.subject} error={!!eSub} onChange={ev => m.setC({ subject: ev.target.value })} placeholder="What the email is about" />
          </FormField>
          <FormField id="f-body" label="Email text" required count={fmtN(bodyN) + ' / ' + fmtN(LIM.body)} over={bodyN > LIM.body} error={eBody}>
            <RichText id="f-body" seedKey={'rte-' + c.htmlKey} html={c.html} label="Email text" error={!!eBody} placeholder="Write the email. Select text to format it or add a link." onInput={(h, t) => m.onEmailInput(h, t)} />
          </FormField>
          <div className="flex flex-col gap-2">
            <span className="text-body font-medium">Attachments</span>
            {c.atts.length ? <div className="flex flex-col gap-2">{c.atts.map(a => <FileItem key={a.id} name={a.name} description={fmtSize(a.size)} actions={<Button variant="text" size="xs" iconOnly startIcon={X} aria-label={'Remove ' + a.name} onClick={() => m.removeFile(a.id)} />} />)}</div> : null}
            <div className="flex flex-wrap items-center gap-3">
              <FileUpload variant="button" multiple buttonLabel="Attach files" onUpload={files => m.addFiles(files)} />
              <span className="text-caption text-fg-secondary">Up to {LIM.files} files, 10 MB in total.{c.atts.length ? ' ' + fmtSize(used) + ' used.' : ''}</span>
            </div>
            {c.attErr ? <ErrText>{c.attErr}</ErrText> : null}
          </div>
        </>
      )}
    </FormatBlock>
  )
}

// ---------- step 3 ----------
function RvRow({ icon, k, v, q, warn, edit }: { icon: typeof Mail; k: string; v: string; q?: string; warn?: boolean; edit?: () => void }) {
  return (
    <div className="flex items-start gap-3 px-3 py-3">
      <IconBox icon={icon} tone={warn ? 'warn' : 'neutral'} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-body font-medium">{k}</span>
        <span className={cn('text-body', warn ? 'text-warning-text' : 'text-fg-secondary')}>{v}</span>
        {q ? <span className="mt-1 border-l-2 border-divider pl-2 text-caption text-fg-secondary">{q}</span> : null}
      </span>
      {edit ? <Button size="sm" variant="text" onClick={edit}>Edit</Button> : null}
    </div>
  )
}

function Step3({ m, e }: { m: SendCtl; e: Errs }) {
  const c = m.s.c, tried = c.tried || {}, rc = m.reach(), ap = approval(c), mode = effEmailMode(c)
  const schedD = fromIso(c.schedAt), nowD = new Date(), schedErr = (e.sched && (tried[3] || c.schedAt)) ? e.sched : ''
  const toMsg = () => m.goStep(2), notif = c.title.trim() + (c.content.trim() ? ' — ' + c.content.trim() : '')
  const rows: React.ReactNode[] = [<RvRow key="r" icon={Users} k="Receivers" v={plural(rc.total, 'receiver') + (rc.ext ? ', including ' + plural(rc.ext, 'external receiver', 'external receivers') : '')} edit={() => m.goStep(1)} />]
  if (c.ch.push) rows.push(<RvRow key="p" icon={Smartphone} k="Device notification" v={'Reaches ' + fmtN(rc.push) + ' of ' + fmtN(rc.total)} q={notif} edit={toMsg} />)
  if (c.ch.desktop) { const cut = vwidth(c.content) > DESK.text || vwidth(c.title) > DESK.title; rows.push(<RvRow key="d" icon={Monitor} warn={cut} k="Desktop OS" v={'Reaches ' + fmtN(rc.desktop) + ' of ' + fmtN(rc.total) + (cut ? ' · the text is cut short on desktop' : '')} q={notif} edit={toMsg} />) }
  if (c.ch.email) rows.push(<RvRow key="e" icon={Mail} k="Email" v={'Reaches ' + (rc.email === rc.total ? 'all ' + fmtN(rc.email) : fmtN(rc.email) + ' of ' + fmtN(rc.total)) + (mode === 'own' ? ' · Separate email' + (c.atts.length ? ' with ' + plural(c.atts.length, 'attachment') : '') : ' · Same as the notification text')} q={mode === 'own' ? c.subject : ''} edit={toMsg} />)
  if (c.ch.sms) rows.push(<RvRow key="s" icon={MessageSquareText} k="SMS fallback" v={[rc.extP ? plural(rc.extP, 'external number', 'external numbers') : '', c.ch.push && rc.smsable ? 'up to ' + fmtN(rc.smsable) + ' employees the device notification misses' : ''].filter(Boolean).join(' and ').replace(/^./, x => x.toUpperCase()) || 'No one gets the SMS'} q={c.smsText} edit={toMsg} />)
  const phs = placeholders([hasNotif(c) ? c.title + ' ' + c.content : '', smsOn(c) ? c.smsText : '', mode === 'own' ? c.subject + ' ' + c.bodyText : ''].join(' '))
  if (phs.length) rows.push(<RvRow key="ph" icon={AlertTriangle} warn k={plural(phs.length, 'placeholder') + ' still in brackets'} v={'Replace ' + joinList(phs) + ' before sending, or receivers will see the brackets.'} edit={toMsg} />)
  if (rc.unrN) rows.push(<RvRow key="u" icon={AlertTriangle} warn k={plural(rc.unrN, 'receiver') + ' won’t get this message'} v="None of the channels you picked can reach them." edit={() => m.goStep(1)} />)
  const tomorrow9 = toIso(new Date(nowD.getFullYear(), nowD.getMonth(), nowD.getDate() + 1, 9, 0))
  return (
    <>
      <Section title="Send time" sub="Taipei time (GMT+8). Every channel goes out at the same time.">
        <div className="flex flex-col gap-[var(--layout-space-tight)]">
          <RadioGroup value={c.sendMode} onValueChange={v => v === 'now' ? m.setC({ sendMode: 'now' }) : m.setC({ sendMode: 'schedule', schedAt: c.schedAt || tomorrow9 })} className="grid gap-[var(--layout-space-tight)] md:grid-cols-2">
            {([['now', Zap, 'Send now', ap.need ? 'Goes out as soon as it’s approved.' : 'Starts delivering as soon as you send.'], ['schedule', CalendarClock, 'Scheduled time', 'Pick a date and time up to 30 days ahead.']] as const).map(x => (
              <label key={x[0]} className={cn('flex cursor-pointer rounded-lg border p-[var(--layout-space-tight)]', c.sendMode === x[0] ? 'border-primary bg-primary-subtle/40' : 'border-border hover:border-border-hover')}>
                <RadioGroupItem value={x[0]} icon={x[1]} label={x[2]} description={x[3]} />
              </label>
            ))}
          </RadioGroup>
          {c.sendMode === 'schedule' ? (
            <FormField id="f-sched" label="Date and time" hint={schedD && !e.sched ? 'Sends ' + niceDT(schedD) + (ap.need ? ', if it’s approved by then.' : '.') : undefined} error={schedErr} className="max-w-sm">
              <DatePicker id="f-sched" showTime typeable locale="en-US" value={c.schedAt || null} error={!!schedErr} onChange={v => m.setC({ schedAt: v })} placeholder="YYYY/MM/DD HH:MM" />
            </FormField>
          ) : null}
        </div>
      </Section>
      <Section title="Review" sub={'Check what goes to whom before you ' + (ap.need ? 'submit it for approval' : 'send it') + '.'}>
        <div className="flex flex-col gap-[var(--layout-space-tight)]">
          <div className="flex flex-col divide-y divide-divider rounded-md border border-divider">{rows}</div>
          {ap.need ? <Banner tone="warning" title={'Needs approval from ' + joinList(ap.who) + '.'}>{(ap.mgr ? 'Sending outside the company needs your supervisor’s approval. ' : '') + (ap.icsd ? 'SMS needs ICSD approval. ' : '') + 'Nothing is sent on any channel until it’s approved.'}</Banner> : null}
        </div>
      </Section>
    </>
  )
}

// ---------- footer and result ----------
function FootBar({ m }: { m: SendCtl }) {
  const c = m.s.c, ap = approval(c)
  const primary = ap.need ? 'Submit for approval' : c.sendMode === 'schedule' ? 'Schedule message' : 'Send message'
  return (
    <div className="sticky bottom-0 z-10 border-t border-divider bg-surface">
      <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center gap-2 px-[var(--layout-space-loose)] py-[var(--layout-space-tight)]">
        <div className="flex flex-wrap gap-2">
          {c.step === 1 ? <Button variant="tertiary" startIcon={UserPlus} disabled={!c.receivers.length} onClick={() => m.set({ sg: { name: '', desc: '', tried: false } })}>Save receivers as group</Button> : null}
          {c.step === 2 ? <Button variant="tertiary" startIcon={LayoutTemplate} onClick={() => m.openSaveTpl()}>Save as template</Button> : null}
          {c.step >= 2 ? <Button variant="tertiary" startIcon={FlaskConical} onClick={() => m.sendTest()}>Send test to me</Button> : null}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="text" onClick={() => m.goList()}>Cancel</Button>
          {c.step > 1 ? <Button variant="tertiary" startIcon={ChevronLeft} onClick={() => m.goStep(c.step - 1)}>Back</Button> : null}
          {c.step < 3
            ? <Button variant="primary" endIcon={ChevronRight} onClick={() => m.goStep(c.step + 1)}>Next</Button>
            : <Button variant="primary" startIcon={ap.need ? ShieldCheck : c.sendMode === 'schedule' ? CalendarClock : Send} onClick={() => m.submit()}>{primary}</Button>}
        </div>
      </div>
    </div>
  )
}

function ResultView({ m }: { m: SendCtl }) {
  const r = m.s.c.result!, ap = r.ap, both = ap.mgr && ap.icsd
  const rows = [{ k: 'Request ID', v: r.reqId }, { k: 'Approver', v: both ? SUPERVISOR + ', then ICSD' : ap.icsd ? 'ICSD' : SUPERVISOR }, { k: 'Channels', v: r.chs.map(k => CHN[k].name).join(', ') }, { k: 'Submitted', v: r.when }, { k: 'Sends', v: r.sends }, { k: 'Receivers', v: fmtN(r.total) }]
  const text = both ? 'Your supervisor reviews the external receivers first, then ICSD reviews the SMS. You’ll get a tWorkspace notification at each step.' : ap.icsd ? 'ICSD will review the SMS. You’ll get a tWorkspace notification when it’s approved, or if they ask for changes.' : 'Your supervisor, Jimmy Chen, will review the external receivers. You’ll get a tWorkspace notification when it’s approved.'
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col items-center gap-[var(--layout-space-loose)] p-[var(--layout-space-loose)] pt-12 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-warning-subtle text-warning-text"><ShieldCheck className="size-6" aria-hidden /></span>
      <h2 className="text-h3">Submitted for approval</h2>
      <p className="text-body text-fg-secondary">{text}</p>
      <div className="w-full text-left"><KV rows={rows} /></div>
      <p className="text-body text-fg-secondary">Nothing is sent on any channel until it’s approved. It shows up in Messages once it is.</p>
      <div className="flex gap-2">
        <Button variant="tertiary" onClick={() => m.startCompose('new')}>Send another message</Button>
        <Button variant="primary" onClick={() => m.toList()}>Back to Messages</Button>
      </div>
    </div>
  )
}

