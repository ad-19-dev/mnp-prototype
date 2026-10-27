// Send flow dialogs: batch import, SMS numbers, save group, save template, template picker, unreachable receivers
import * as React from 'react'
import {
  Button, Checkbox, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, FileUpload,
  Input, RadioGroup, RadioGroupItem, Tag, Textarea, cn,
} from '@qijenchen/design-system'
import { ArrowRight, Building2, ChevronLeft, Globe, Lock, Phone, Plus, Search, Wand2 } from 'lucide-react'
import { LIM, ME, PEOPLE, PMAP, fmtPhone, maskPhone, plural, splitTokens, tplFormats, SAMPLE_SEND } from '../../lib/data'
import { effEmailMode, hasNotif, multiPeople, recvFlat, smsOn, tplFit } from '../../lib/compose'
import { useApp } from '../../lib/store'
import { Banner, FmtChips, FormField, IconBox, KV, ListBox, ListRow, PAvatar, Two } from '../../components/ui'
import type { SendCtl } from './ctl'

function Shell({ open, onClose, title, sub, width = 560, children, foot }: { open: boolean; onClose: () => void; title: string; sub?: React.ReactNode; width?: number; children: React.ReactNode; foot: React.ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      {open ? (
        <DialogContent maxWidth={width} height="hug">
          <DialogHeader>
            <div className="flex flex-col gap-0.5">
              <DialogTitle>{title}</DialogTitle>
              {sub ? <DialogDescription className="text-body text-fg-secondary">{sub}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
            </div>
          </DialogHeader>
          <DialogBody><div className="flex flex-col gap-[var(--layout-space-tight)]">{children}</div></DialogBody>
          <DialogFooter>{foot}</DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
const H3 = ({ children }: { children: React.ReactNode }) => <h3 className="text-body font-medium">{children}</h3>

// ---------- batch import ----------
export function ImportDialog({ m }: { m: SendCtl }) {
  const imp = m.s.imp, close = () => m.set({ imp: null })
  if (!imp) return <Shell open={false} onClose={close} title="" foot={null}>{null}</Shell>
  const howto = 'MNP matches NT accounts, employee IDs, names, MVPN, mobile numbers and org codes, and accepts external email addresses (they only get Email). Separate entries with commas, semicolons or new lines.'
  if (!imp.res) {
    const n = splitTokens(imp.text).length
    return (
      <Shell open onClose={close} width={720} title="Batch import receivers" sub="Paste a list or upload a file. Nothing is added until you review the matches."
        foot={<><Button variant="tertiary" onClick={close}>Cancel</Button><Button variant="primary" startIcon={Wand2} disabled={!n} onClick={() => m.identify()}>Identify receivers</Button></>}>
        <FormField id="imp-text" label="Paste your list" count={n ? plural(n, 'entry', 'entries') : ''}>
          <Textarea id="imp-text" rows={9} className="font-mono" autoFocus value={imp.text} onChange={ev => m.setImp({ text: ev.target.value, file: '' })} placeholder="gywu, 120588, 陳怡君, 61204, 0918-226-588, PLT/UX, partner@example.com" />
        </FormField>
        <div className="flex flex-wrap items-center gap-3">
          <FileUpload variant="button" accept=".csv,.txt,text/csv,text/plain" buttonLabel="Upload .csv or .txt" onUpload={files => m.onImpFile(files[0])} />
          <Button variant="link" size="sm" onClick={() => m.setImp({ text: SAMPLE_SEND, file: '' })}>Use a sample list</Button>
          {imp.file ? <span className="text-caption text-fg-secondary">Loaded {imp.file}</span> : null}
        </div>
        <Banner tone="info">{howto}</Banner>
      </Shell>
    )
  }
  const sets = m.impSets(), picks = imp.picks
  let pickedN = 0
  const amb = sets.amb.map(a => {
    const pk = picks[a.i] || {}
    return { tok: a.m.tok!, i: a.i, cands: a.m.cands.map(p => { const key = 'p:' + p.id, added = !!(sets.have[key] || sets.seen[key]), on = !added && !!pk[p.id]; if (on) pickedN++; return { p, added, on } }) }
  })
  const addN = sets.ready.length + pickedN
  return (
    <Shell open onClose={close} width={720} title="Batch import receivers" sub="Check the matches, then add them to this message."
      foot={<><Button variant="tertiary" startIcon={ChevronLeft} onClick={() => m.setImp({ res: null, picks: {} })}>Edit list</Button><Button variant="primary" disabled={!addN} onClick={() => m.impAdd()}>{addN ? 'Add ' + plural(addN, 'receiver') : 'Nothing to add yet'}</Button></>}>
      <div className="flex flex-wrap gap-2">
        <Tag size="md" color="green">{sets.ready.length} ready to add</Tag>
        {amb.length ? <Tag size="md" color="amber">{amb.length} need your choice</Tag> : null}
        {sets.miss.length ? <Tag size="md" color="red">{sets.miss.length} not found</Tag> : null}
        {sets.dup ? <Tag size="md">{sets.dup} already in the list</Tag> : null}
      </div>
      {amb.length ? <>
        <H3>Choose who you mean</H3>
        {amb.map(a => (
          <div key={a.i} className="flex flex-col gap-1 rounded-md border border-divider p-2">
            <div className="px-1 text-body text-fg-secondary">“{a.tok}” matches {a.cands.length} people</div>
            {a.cands.map(k => (
              <div key={k.p.id} className={cn('flex items-center gap-3 rounded-md px-1 py-1', k.added && 'opacity-60')}>
                <Checkbox checked={k.on || k.added} disabled={k.added} onCheckedChange={() => m.impPick(a.i, k.p.id)} aria-label={k.p.zh + ' ' + k.p.en} />
                <PAvatar p={k.p} /><Two a={k.p.zh + ' ' + k.p.en} b={k.p.title + ' · ' + k.p.org + ' · ' + k.p.emp} strong className="flex-1" />
                {k.added ? <Tag size="sm">Already in the list</Tag> : null}
              </div>
            ))}
          </div>
        ))}
      </> : null}
      {sets.ready.length ? <>
        <H3>Ready to add</H3>
        <ListBox max={240}>
          {sets.ready.map((x, i) => {
            const mm = x.m
            return (
              <ListRow key={i}>
                <code className="w-32 shrink-0 truncate font-mono text-caption text-fg-secondary">{mm.tok}</code>
                <ArrowRight className="size-3.5 shrink-0 text-fg-muted" aria-hidden />
                {mm.kind === 'one' ? <PAvatar p={mm.p} size={20} /> : <IconBox icon={mm.kind === 'org' ? Building2 : (mm as any).email && (mm as any).email.indexOf('@') < 0 ? Phone : Globe} />}
                <span className="min-w-0 flex-1 truncate text-body font-medium">{mm.kind === 'one' ? mm.p.zh + ' ' + mm.p.en + ' · ' + mm.p.org : mm.kind === 'org' ? mm.org.code + ' · ' + plural(mm.org.count, 'member') : (mm as any).email + ' · External'}</span>
                <span className="text-caption text-fg-secondary">{(mm as any).by}</span>
              </ListRow>
            )
          })}
        </ListBox>
      </> : null}
      {sets.miss.length ? <>
        <H3>Not found</H3>
        <ListBox>{sets.miss.map((x, i) => <ListRow key={i}><code className="w-32 shrink-0 truncate font-mono text-caption">{x.tok}</code><span className="text-body text-fg-secondary">{x.why}</span></ListRow>)}</ListBox>
      </> : null}
    </Shell>
  )
}

// ---------- SMS numbers ----------
export function NumbersDialog({ m }: { m: SendCtl }) {
  const num = m.s.num, close = () => m.closeNumbers()
  const people = num ? multiPeople(m.s.c) : [], d = num ? num.draft : {}
  const chosen = people.filter(p => d['p:' + p.id]).length
  return (
    <Shell open={!!num} onClose={close} width={720} title="Choose SMS numbers" sub={plural(people.length, 'person has', 'people have') + ' more than one phone number. Pick the one that should get the SMS fallback.'}
      foot={<><span className="mr-auto text-body text-fg-secondary">{chosen} of {people.length} chosen</span><Button variant="tertiary" onClick={close}>Cancel</Button><Button variant="primary" onClick={() => m.confirmNum()}>Save choices</Button></>}>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => m.numAllCo()}>Use company mobile for everyone</Button>
        <span className="ml-auto inline-flex items-center gap-1 text-caption text-fg-secondary"><Lock className="size-3.5" aria-hidden />Personal numbers are masked under PIP</span>
      </div>
      <ListBox max={380}>
        {people.map(p => {
          const key = 'p:' + p.id
          return (
            <div key={p.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
              <span className="flex min-w-48 flex-1 items-center gap-2"><PAvatar p={p} /><Two a={p.zh + ' ' + p.en} b={p.title + ' · ' + p.org} strong /></span>
              <RadioGroup value={d[key] || ''} onValueChange={v => m.numPick(key, v as 'co' | 'pp')} className="flex flex-wrap gap-4" aria-label={'SMS number for ' + p.en}>
                <RadioGroupItem value="co" label={<span className="font-mono">{fmtPhone(p.co)}</span>} description={'Company mobile · MVPN ' + p.mvpn} />
                <RadioGroupItem value="pp" label={<span className="font-mono">{maskPhone(p.pp)}</span>} description="Personal phone · masked under PIP" />
              </RadioGroup>
            </div>
          )
        })}
      </ListBox>
    </Shell>
  )
}

// ---------- save receivers as group ----------
export function SaveGroupDialog({ m }: { m: SendCtl }) {
  const app = useApp(), s = m.s, sg = s.sg, close = () => m.set({ sg: null })
  let body: React.ReactNode = null, sub = ''
  if (sg) {
    const nm = sg.name.trim(), dup = app.groups.some(g => g.name.toLowerCase() === nm.toLowerCase())
    const err = (sg.tried && !nm) ? 'Enter a group name.' : sg.name.length > 50 ? 'Group names can be up to 50 characters.' : (nm && dup) ? 'A group with this name already exists.' : ''
    const hasSets = s.c.receivers.some(t => t.type === 'group' || t.type === 'org'), ext = s.c.receivers.some(t => t.type === 'ext')
    sub = 'Saves ' + plural(recvFlat(s.c, app.groups).people.length, 'person', 'people') + ' as a group you can reuse.' + (hasSets ? ' Groups and orgs are saved as their current members.' : '') + (ext ? ' External addresses aren’t saved.' : '')
    body = <>
      <FormField id="sg-name" label="Group name" required count={sg.name.length + ' / 50'} over={sg.name.length > 50} error={err}>
        <Input id="sg-name" autoFocus value={sg.name} error={!!err} onChange={ev => m.set({ sg: { ...m.s.sg!, name: ev.target.value } })} placeholder="e.g. Fab 18 drill wardens" />
      </FormField>
      <FormField id="sg-desc" label="Description" count={sg.desc.length + ' / 200'} over={sg.desc.length > 200}>
        <Textarea id="sg-desc" rows={3} value={sg.desc} onChange={ev => m.set({ sg: { ...m.s.sg!, desc: ev.target.value } })} placeholder="What this group is for, so others pick the right one" />
      </FormField>
      <Banner tone="info">You’ll be the owner. Add collaborators and review members in Audience Group.</Banner>
    </>
  }
  return <Shell open={!!sg} onClose={close} title="Save receivers as group" sub={sub} foot={<><Button variant="tertiary" onClick={close}>Cancel</Button><Button variant="primary" onClick={() => m.saveGroup()}>Save group</Button></>}>{body}</Shell>
}

// ---------- save message as template ----------
export function SaveTplDialog({ m }: { m: SendCtl }) {
  const app = useApp(), s = m.s, st = s.stpl, c = s.c, close = () => m.set({ stpl: null })
  let body: React.ReactNode = null
  if (st) {
    const nm = st.name.trim(), dup = app.templates.some(t => t.name.toLowerCase() === nm.toLowerCase())
    const err = (st.tried && !nm) ? 'Enter a template name.' : st.name.length > LIM.name ? 'Template names can be up to 50 characters.' : (nm && dup) ? 'A template with this name already exists.' : ''
    const mode = effEmailMode(c), rows = [{ k: 'Sender name', v: c.sender }]
    if (hasNotif(c)) rows.push({ k: 'Notification text', v: c.title })
    if (smsOn(c)) rows.push({ k: 'SMS text', v: c.smsText })
    if (c.ch.email) rows.push({ k: 'Email', v: mode === 'own' ? c.subject : 'Same as the notification text' })
    body = <>
      <FormField id="stpl-name" label="Template name" required count={st.name.length + ' / ' + LIM.name} over={st.name.length > LIM.name} error={err}>
        <Input id="stpl-name" autoFocus value={st.name} error={!!err} onChange={ev => m.set({ stpl: { ...m.s.stpl!, name: ev.target.value } })} placeholder="e.g. Chiller maintenance notice" />
      </FormField>
      <KV rows={rows} />
    </>
  }
  return <Shell open={!!st} onClose={close} title="Save as template" sub="Saves the text so you and your team can reuse it. Receivers, attachments and send time aren’t saved." foot={<><Button variant="tertiary" onClick={close}>Cancel</Button><Button variant="primary" onClick={() => m.saveTpl()}>Save template</Button></>}>{body}</Shell>
}

// ---------- choose a template ----------
export function TplPickerDialog({ m }: { m: SendCtl }) {
  const app = useApp(), s = m.s, tp = s.tp, close = () => m.set({ tp: null })
  const q = tp ? tp.q.trim().toLowerCase() : ''
  const list = app.templates.filter(t => !q || [t.name, t.title, t.content, t.email && t.email.subject].join(' ').toLowerCase().indexOf(q) >= 0)
  return (
    <Shell open={!!tp} onClose={close} width={720} title="Choose a template" sub="The template fills in the text. Receivers, channels and attachments stay as they are." foot={<Button variant="tertiary" onClick={close}>Cancel</Button>}>
      <Input startIcon={Search} type="search" autoFocus placeholder="Search templates" aria-label="Search templates" value={tp ? tp.q : ''} onChange={ev => m.set({ tp: { q: ev.target.value } })} />
      <div className="flex max-h-[420px] flex-col gap-2 overflow-auto">
        {list.map(t => {
          const fit = tplFit(s.c, t), ow = PMAP[t.owner] || PEOPLE[0], on = s.c.tplId === t.id
          return (
            <button key={t.id} type="button" aria-pressed={on} onClick={() => m.askTemplate(t)}
              className={cn('flex flex-col gap-1 rounded-lg border p-3 text-left hover:border-border-hover hover:bg-neutral-hover focus-visible:outline-2 focus-visible:outline-ring', on ? 'border-primary bg-primary-subtle/40' : 'border-divider')}>
              <span className="flex items-center gap-2"><span className="flex-1 text-body font-medium">{t.name}</span><FmtChips list={tplFormats(t)} /></span>
              <span className="truncate text-body text-fg-secondary">{t.title || (t.email && t.email.subject) || ''}</span>
              <span className={cn('text-caption', fit.warn ? 'text-warning-text' : 'text-success-text')}>{fit.text}</span>
              <span className="text-caption text-fg-muted">Updated {t.updated} · {ow.en}{t.owner === ME ? ' (you)' : ''}</span>
            </button>
          )
        })}
        {list.length ? null : <p className="text-body text-fg-secondary">No templates match that search.</p>}
      </div>
    </Shell>
  )
}

// ---------- receivers no channel reaches ----------
export function UnreachDialog({ m }: { m: SendCtl }) {
  const s = m.s, open = s.unr, close = () => m.set({ unr: false })
  const c = s.c, rc = m.reach()
  const why = () => { const w: string[] = []; if (c.ch.push) w.push(c.ch.sms ? 'no registered device or phone number' : 'no registered device'); if (c.ch.desktop) w.push('no desktop agent'); return w.join(', ').replace(/^./, x => x.toUpperCase()) }
  return (
    <Shell open={open} onClose={close} width={720} title={plural(rc.unrN, 'receiver') + ' would miss this message'} sub="None of the channels you picked can reach them."
      foot={<><Button variant="tertiary" onClick={close}>Close</Button>{rc.viaSms ? <Button variant="secondary" startIcon={Plus} onClick={() => { m.pickChannel('sms'); close() }}>Turn on SMS fallback</Button> : null}{rc.viaEmail ? <Button variant="primary" startIcon={Plus} onClick={() => { m.pickChannel('email'); close() }}>Add Email</Button> : null}</>}>
      <ListBox max={380}>
        {rc.unr.map(p => <ListRow key={p.id}><PAvatar p={p} /><Two a={p.zh + ' ' + p.en} b={p.emp + ' · ' + p.org} strong className="flex-1" /><span className="text-caption text-fg-secondary">{why()}</span></ListRow>)}
        {rc.flat.ext.filter(x => x.indexOf('@') >= 0 ? rc.unrE : rc.unrP).map(x => { const ph = x.indexOf('@') < 0; return <ListRow key={x}><IconBox icon={ph ? Phone : Globe} /><Two a={x} b={ph ? 'External phone number' : 'External email'} strong className="flex-1" /><span className="text-caption text-fg-secondary">{ph ? 'Gets SMS only' : 'Gets Email only'}</span></ListRow> })}
      </ListBox>
    </Shell>
  )
}
