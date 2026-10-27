// Templates: message text stored by format, shared with people or orgs
import * as React from 'react'
import {
  Button, DataTable, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Empty,
  Input, Popover, PopoverAnchor, PopoverContent, SegmentedControl, SegmentedControlItem, Tag, Textarea,
} from '@qijenchen/design-system'
import { NO_HIDE } from '../../components/ui'
import { createColumnHelper } from '@tanstack/react-table'
import {
  Building2, Check, CircleAlert, Copy, Eye, LayoutTemplate, Lock, Mail, MessageSquareText, Monitor, MoreVertical, Pencil, Plus,
  Search, Send, Smartphone, Trash2, UserPlus, Users, X,
} from 'lucide-react'
import {
  LIM, ME, ORGS, PEOPLE, PMAP, cleanHtml, fmtDT, fmtN, htmlToText, placeholders, plural, textToHtml, tplFormats, tplHasEmail,
  type Template,
} from '../../lib/data'
import { flash, getApp, go, setApp, useApp } from '../../lib/store'
import { useLogic, scrollTop } from '../../lib/logic'
import { Banner, ConfirmDialog, FmtChips, FormField, IconBox, PAvatar, Section, Two, type Confirm } from '../../components/ui'
import { PageHeader, useNavHome } from '../../components/shell'
import { RichText } from '../../components/RichText'
import { L, P } from '../../lib/i18n'

interface TEd {
  id: string | null; isNew: boolean; role: 'Owner' | 'Viewer'; name: string; sender: string; title: string; content: string; sms: string
  emailMode: 'same' | 'own'; subject: string; html: string; bodyText: string; htmlKey: number
  shared: [string, string][]; owner: string; updated: string; sq: string; sOpen: boolean; tried: boolean; dirty: boolean
}
interface TS { view: 'list' | 'edit'; q: string; own: 'all' | 'mine' | 'shared'; cf: Confirm | null; ed: TEd | null }

function makeTplEd(t: Template | null, dup?: boolean): TEd {
  const base = { sq: '', sOpen: false, tried: false, dirty: false, htmlKey: Date.now() % 100000 }
  if (!t) return { ...base, id: null, isNew: true, role: 'Owner', name: '', sender: '', title: '', content: '', sms: '', emailMode: 'same', subject: '', html: '', bodyText: '', shared: [], owner: ME, updated: '' }
  const own = tplHasEmail(t), h = own ? t.email.html || '' : ''
  const body = { sender: t.sender || '', title: t.title || '', content: t.content || '', sms: t.sms || '', emailMode: (own ? 'own' : 'same') as 'own' | 'same', subject: own ? t.email.subject || '' : '', html: h, bodyText: htmlToText(h) }
  if (dup) return { ...base, ...body, id: null, isNew: true, role: 'Owner', name: (L('Copy of ', '複製 - ') + t.name).slice(0, LIM.name), shared: [], owner: ME, updated: '', dirty: true }
  return { ...base, ...body, id: t.id, isNew: false, role: t.owner === ME ? 'Owner' : 'Viewer', name: t.name, shared: (t.shared || []).map(x => x.slice() as [string, string]), owner: t.owner, updated: t.updated }
}
function shareVM(sh: [string, string]) {
  if (sh[0] === 'o') { const o = ORGS.find(x => x.code === sh[1]) || { code: sh[1], name: '', count: 0 }; return { key: 'o:' + sh[1], isOrg: true, label: o.code, short: o.code, sub: o.name + ' · ' + P(o.count, 'member', '人'), p: null } }
  const p = PMAP[sh[1]]
  return { key: 'p:' + sh[1], isOrg: false, label: p ? (p.zh + ' ' + p.en).trim() : sh[1], short: p ? p.en : sh[1], sub: p ? p.title + ' · ' + p.org : '', p }
}
function shareSummary(shared: [string, string][]) {
  if (!shared || !shared.length) return L('Only me', '只有我')
  const first = shareVM(shared[0]).short
  return shared.length === 1 ? first : first + ' +' + (shared.length - 1)
}

let seq = 0
function makeCtl(get: () => TS, set: (p: Partial<TS> | ((s: TS) => Partial<TS>)) => void) {
  const m = {
    get s() { return get() },
    set,
    setEd(patch: Partial<TEd>, clean?: boolean) { const ed = { ...get().ed!, ...patch }; if (!clean) ed.dirty = true; set({ ed }) },
    listRows() {
      const s = get(), q = s.q.trim().toLowerCase()
      return getApp().templates.filter(t => {
        if (s.own === 'mine' && t.owner !== ME) return false
        if (s.own === 'shared' && t.owner === ME) return false
        if (!q) return true
        const ow = PMAP[t.owner] || ({} as any)
        return [t.name, t.title, t.content, t.sms, t.email && t.email.subject, t.sender, ow.en, ow.zh].join(' ').toLowerCase().indexOf(q) >= 0
      }).sort((a, b) => (b.updated || '').localeCompare(a.updated || '') || a.name.localeCompare(b.name))
    },
    openEd(t: Template | null, dup?: boolean) { set({ view: 'edit', ed: makeTplEd(t, dup) }); scrollTop() },
    useTemplate(t: Template) { set({ view: 'list', ed: null }); setApp({ useTemplateId: t.id }); go('send') },
    goList() {
      const ed = get().ed
      if (get().view === 'edit' && ed && ed.dirty && ed.role !== 'Viewer') {
        set({ cf: { title: L('Discard changes?', '要捨棄變更嗎？'), text: L('Your changes haven’t been saved.', '你的變更還沒儲存。'), icon: CircleAlert, tone: 'warn', cancel: L('Keep editing', '繼續編輯'), ok: L('Discard', '捨棄'), danger: true, run: () => { set({ cf: null, view: 'list', ed: null }); scrollTop() } } })
        return
      }
      set({ view: 'list', ed: null })
      scrollTop()
    },
    askDelete(t: Template) {
      set({ cf: { title: L('Delete “' + t.name + '”?', '刪除「' + t.name + '」？'), text: L('No one can use it anymore. Messages already sent aren’t affected.', '刪除後大家都不能再用，已送出的訊息不受影響。'), icon: Trash2, tone: 'err', cancel: L('Keep', '保留'), ok: L('Delete', '刪除'), danger: true, run: () => {
        setApp(a => ({ templates: a.templates.filter(x => x.id !== t.id) }))
        set({ cf: null, view: 'list', ed: null })
        flash(L('Template deleted', '已刪除模板'), 'ok', t.name)
        scrollTop()
      } } })
    },
    errs() {
      const ed = get().ed!, e: Record<string, string> = {}, nm = ed.name.trim()
      const tooLong = (n: number) => L('Up to ' + fmtN(n) + ' characters.', '最多 ' + fmtN(n) + ' 字。')
      if (!nm) e.name = L('Enter a name.', '請輸入名稱。')
      else if (ed.name.length > LIM.name) e.name = tooLong(LIM.name)
      else if (getApp().templates.some(t => t.id !== ed.id && t.name.toLowerCase() === nm.toLowerCase())) e.name = L('This name is taken.', '這個名稱已經有人用了。')
      if (!ed.sender.trim()) e.sender = L('Enter a sender name.', '請輸入寄件人名稱。')
      else if (ed.sender.length > LIM.sender) e.sender = tooLong(LIM.sender)
      const hasT = !!ed.title.trim(), hasC = !!ed.content.trim()
      if (hasT && !hasC) e.content = L('Add text, or clear the title.', '請輸入內文，或清空標題。')
      if (hasC && !hasT) e.title = L('Add a title, or clear the text.', '請輸入標題，或清空內文。')
      if (ed.title.length > LIM.title) e.title = tooLong(LIM.title)
      if (ed.content.length > LIM.push) e.content = tooLong(LIM.push)
      if (ed.sms.length > LIM.sms) e.sms = tooLong(LIM.sms)
      if (ed.emailMode === 'own') {
        if (!ed.subject.trim()) e.subject = L('Enter a subject.', '請輸入主旨。')
        else if (ed.subject.length > LIM.subject) e.subject = tooLong(LIM.subject)
        if (!ed.bodyText.trim()) e.body = L('Write the email.', '請輸入 Email 內文。')
        else if (ed.bodyText.trim().length > LIM.body) e.body = tooLong(LIM.body)
      }
      if (!hasT && !hasC && ed.emailMode !== 'own') e.formats = L('Add notification text, an email, or both.', '請至少填寫通知或 Email 其中一種。')
      return e
    },
    saveTpl() {
      const ed = get().ed!, e = m.errs()
      if (Object.keys(e).length) { m.setEd({ tried: true }, true); flash(L('Fix the highlighted fields', '請修正標示的欄位'), 'err'); return }
      const patch: Partial<Template> = { name: ed.name.trim(), sender: ed.sender.trim(), title: ed.title.trim(), content: ed.content.trim(), sms: ed.sms.trim(), email: ed.emailMode === 'own' ? { mode: 'own', subject: ed.subject.trim(), html: cleanHtml(ed.html) } : { mode: 'same' }, shared: ed.shared.map(x => x.slice() as [string, string]), updated: fmtDT(new Date()).slice(0, 10), fresh: Date.now() }
      if (ed.id) setApp(a => ({ templates: a.templates.map(t => t.id === ed.id ? { ...t, ...patch } : t) }))
      else setApp(a => ({ templates: [{ id: 'tt' + (++seq), owner: ME, ...patch } as Template].concat(a.templates) }))
      set({ view: 'list', ed: null, own: 'all', q: '' })
      flash(ed.id ? L('Changes saved', '已儲存變更') : L('Template created', '已建立模板'), 'ok', patch.name)
      scrollTop()
    },
    setEmailMode(mode: 'same' | 'own') {
      const ed = get().ed!, p: Partial<TEd> = { emailMode: mode }
      if (mode === 'own' && !ed.bodyText.trim() && !ed.subject.trim()) { const h = textToHtml(ed.content); Object.assign(p, { subject: ed.title, html: h, bodyText: htmlToText(h), htmlKey: ed.htmlKey + 1 }) }
      m.setEd(p)
    },
    insertPh(tok: string) { const c = get().ed!.content; m.setEd({ content: c + (c && !/\s$/.test(c) ? ' ' : '') + tok }) },
    shareResults() {
      const ed = get().ed!, low = ed.sq.trim().toLowerCase(), have: Record<string, boolean> = {}
      if (!low) return { people: [] as ShareOpt[], orgs: [] as ShareOpt[], orgsFirst: false }
      ed.shared.forEach(x => { have[x[0] + ':' + x[1]] = true })
      const people: ShareOpt[] = PEOPLE.filter(p => p.id !== ed.owner && [p.zh, p.en, p.nt, p.emp].some(v => v.toLowerCase().indexOf(low) >= 0)).slice(0, 5).map(p => ({ key: 'p:' + p.id, p, name: p.zh + ' ' + p.en, sub: p.title + ' · ' + p.org, added: !!have['p:' + p.id], add: () => m.addShare(['p', p.id]) }))
      const orgs: ShareOpt[] = ORGS.filter(o => o.code.toLowerCase().indexOf(low) >= 0 || o.name.toLowerCase().indexOf(low) >= 0).slice(0, 4).map(o => ({ key: 'o:' + o.code, p: null, name: o.code, sub: o.name + ' · ' + P(o.count, 'member', '人'), added: !!have['o:' + o.code], add: () => m.addShare(['o', o.code]) }))
      return { people, orgs, orgsFirst: low.indexOf('/') >= 0 || ORGS.some(o => o.code.toLowerCase().indexOf(low) === 0) }
    },
    addShare(sh: [string, string]) {
      const ed = get().ed!
      if (ed.shared.some(x => x[0] === sh[0] && x[1] === sh[1])) return
      m.setEd({ shared: ed.shared.concat([sh]), sq: '', sOpen: false })
    },
    removeShare(key: string) { m.setEd({ shared: get().ed!.shared.filter(x => x[0] + ':' + x[1] !== key) }) },
  }
  return m
}
type TCtl = ReturnType<typeof makeCtl>

function TplMenu({ m, t }: { m: TCtl; t: Template }) {
  const mine = t.owner === ME
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="text" size="xs" iconOnly startIcon={MoreVertical} aria-label={L('Actions for ', '操作：') + t.name} /></DropdownMenuTrigger>
      <DropdownMenuContent align="end" minWidth={208}>
        <DropdownMenuItem startIcon={Send} onSelect={() => m.useTemplate(t)}>{L('Use', '使用')}</DropdownMenuItem>
        <DropdownMenuItem startIcon={mine ? Pencil : Eye} onSelect={() => m.openEd(t)}>{mine ? L('Edit', '編輯') : L('View', '檢視')}</DropdownMenuItem>
        <DropdownMenuItem startIcon={Copy} onSelect={() => m.openEd(t, true)}>{L('Duplicate', '複製')}</DropdownMenuItem>
        {mine ? <><DropdownMenuSeparator /><DropdownMenuItem startIcon={Trash2} className="text-error-text" onSelect={() => m.askDelete(t)}>{L('Delete', '刪除')}</DropdownMenuItem></> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const tcol = createColumnHelper<Template>()
function TplList({ m }: { m: TCtl }) {
  const app = useApp(), s = m.s, rows = m.listRows(), nAll = app.templates.length, nMine = app.templates.filter(t => t.owner === ME).length
  const filtered = s.q.trim() || s.own !== 'all'
  const cols = React.useMemo(() => [
    tcol.accessor('name', { header: L('Template', '模板'), meta: { width: 280 }, cell: i => { const t = i.row.original, first = t.title || (t.email && t.email.subject) || ''; return (
      <span className="flex min-w-0 flex-col">
        <button type="button" className="min-w-0 truncate text-left font-medium text-primary hover:text-primary-hover hover:underline" title={t.name} onClick={() => m.openEd(t)}>{t.name}</button>
        <span className="truncate text-caption text-fg-secondary" title={first}>{first}</span>
      </span>
    ) } }),
    tcol.display({ id: 'fmt', header: L('Channels', '通道'), meta: { width: 140 }, cell: i => <FmtChips list={tplFormats(i.row.original)} /> }),
    tcol.display({ id: 'text', header: L('Text', '內容'), meta: { width: 300 }, cell: i => { const t = i.row.original, text = (t.content || htmlToText(t.email && t.email.html)).replace(/\s+/g, ' '); return <span className="truncate text-fg-secondary" title={text}>{text}</span> } }),
    tcol.display({ id: 'sh', header: L('Shared with', '分享對象'), meta: { width: 160 }, cell: i => { const sh = i.row.original.shared || [], I = !sh.length ? Lock : sh[0][0] === 'o' ? Building2 : Users; return <span className="flex min-w-0 items-center gap-1.5"><I className="size-3.5 shrink-0 text-fg-secondary" aria-hidden /><span className="truncate">{shareSummary(sh)}</span></span> } }),
    tcol.accessor('updated', { header: L('Updated', '更新日期'), meta: { width: 110 } }),
    tcol.accessor('owner', { header: L('Owner', '擁有者'), meta: { width: 180 }, cell: i => { const p = PMAP[i.getValue()] || PEOPLE[0]; return <span className="flex min-w-0 items-center gap-2"><PAvatar p={p} /><Two a={p.en + (i.getValue() === ME ? L(' (you)', '（你）') : '')} b={p.zh} /></span> } }),
  ], [m, app.lang])
  return (
    <div className="flex h-full flex-col gap-[var(--layout-space-loose)] p-[var(--layout-space-loose)]">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-60 max-w-sm flex-1"><Input startIcon={Search} type="search" placeholder={L('Search templates', '搜尋模板')} aria-label={L('Search templates', '搜尋模板')} value={s.q} onChange={e => m.set({ q: e.target.value })} /></div>
        <SegmentedControl value={s.own} onValueChange={v => v && m.set({ own: v as TS['own'] })} aria-label={L('Ownership', '擁有者')}>
          <SegmentedControlItem value="all" badge={<span className="text-fg-muted [[data-state=on]_&]:text-primary">{nAll}</span>}>{L('All', '全部')}</SegmentedControlItem>
          <SegmentedControlItem value="mine" badge={<span className="text-fg-muted [[data-state=on]_&]:text-primary">{nMine}</span>}>{L('Mine', '我建立的')}</SegmentedControlItem>
          <SegmentedControlItem value="shared" badge={<span className="text-fg-muted [[data-state=on]_&]:text-primary">{nAll - nMine}</span>}>{L('Shared with me', '分享給我的')}</SegmentedControlItem>
        </SegmentedControl>
      </div>
      <DataTable tableOptions={NO_HIDE} pinnedLeftColumns={['name']} columns={cols as any} data={rows} bordered height="100%" autoRowHeight getRowId={t => t.id}
        rowActions={(t: Template) => <TplMenu m={m} t={t} />}
        emptyState={<Empty icon={LayoutTemplate} title={L('No matching templates', '找不到符合的模板')} description={L('Try another search.', '換個關鍵字試試。')} action={<Button onClick={() => m.set({ q: '', own: 'all' })}>{L('Show all', '顯示全部')}</Button>} />} />
      <span className="text-body text-fg-secondary">{filtered ? L(rows.length + ' of ' + nAll, rows.length + ' / ' + nAll + ' 個模板') : P(nAll, 'template', '個模板')}</span>
    </div>
  )
}

interface ShareOpt { key: string; p: import('../../lib/data').Person | null; name: string; sub: string; added: boolean; add: () => void }
function ShareField({ m, ro }: { m: TCtl; ro: boolean }) {
  const ed = m.s.ed!, r = m.shareResults(), open = !ro && ed.sOpen && !!ed.sq.trim(), none = !r.people.length && !r.orgs.length
  const ow = PMAP[ed.owner] || PEOPLE[0], anchor = React.useRef<HTMLDivElement>(null)
  const opt = (o: ShareOpt) => (
    <button key={o.key} type="button" disabled={o.added} onClick={o.add} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-neutral-hover disabled:opacity-60">
      {o.p ? <PAvatar p={o.p} size={28} /> : <IconBox icon={Building2} />}<Two a={o.name} b={o.sub} strong className="flex-1" /><span className="text-caption text-fg-muted">{o.added ? L('Added', '已加入') : L('Can use', '可使用')}</span>
    </button>
  )
  const orgs = r.orgs.length ? <><div className="px-3 pb-1 pt-2 text-caption font-medium text-fg-secondary">{L('Orgs', '組織')}</div>{r.orgs.map(opt)}</> : null
  const first = (r.orgsFirst && r.orgs.find(x => !x.added)) || r.people.find(x => !x.added) || r.orgs.find(x => !x.added)
  return (
    <div className="flex flex-col gap-2">
      <span className="text-body font-medium">{L('Shared with', '分享對象')}</span>
      {ro ? null : (
        <Popover open={open} onOpenChange={o => { if (!o) m.setEd({ sOpen: false }, true) }}>
          <PopoverAnchor asChild>
            <div ref={anchor}>
              <Input startIcon={UserPlus} autoComplete="off" placeholder={L('Add people or orgs', '加入人員或組織')} aria-label={L('Share with people or orgs', '分享給人員或組織')} value={ed.sq}
                onChange={e => m.setEd({ sq: e.target.value, sOpen: true }, true)}
                onKeyDown={e => { if (e.key === 'Escape') m.setEd({ sOpen: false }, true); if (e.key === 'Enter') { e.preventDefault(); first?.add() } }} />
            </div>
          </PopoverAnchor>
          <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-1" onOpenAutoFocus={e => e.preventDefault()} onInteractOutside={e => { if (anchor.current?.contains(e.target as Node)) e.preventDefault() }}>
            {none ? <div className="px-3 py-3 text-body text-fg-secondary">{L('No match for “' + ed.sq.trim() + '”.', '找不到「' + ed.sq.trim() + '」。')}</div> : null}
            {r.orgsFirst ? orgs : null}
            {r.people.length ? <><div className="px-3 pb-1 pt-2 text-caption font-medium text-fg-secondary">{L('People', '人員')}</div>{r.people.map(opt)}</> : null}
            {r.orgsFirst ? null : orgs}
          </PopoverContent>
        </Popover>
      )}
      <div className="flex flex-col divide-y divide-divider rounded-md border border-divider">
        <div className="flex min-h-12 items-center gap-3 px-3 py-2"><PAvatar p={ow} size={28} /><Two a={ow.zh + ' ' + ow.en + (ed.owner === ME ? L(' (you)', '（你）') : '')} b={ow.title + ' · ' + ow.org} strong className="flex-1" /><Tag size="sm" color="blue">{L('Owner', '擁有者')}</Tag>{ro ? null : <span className="w-7 shrink-0" aria-hidden />}</div>
        {ed.shared.map(sh => { const v = shareVM(sh); return (
          <div key={v.key} className="flex min-h-12 items-center gap-3 px-3 py-2">
            {v.p ? <PAvatar p={v.p} size={28} /> : <IconBox icon={Building2} />}<Two a={v.label} b={v.sub} strong className="flex-1" /><Tag size="sm">{L('Can use', '可使用')}</Tag>
            {ro ? null : <Button variant="text" size="sm" iconOnly startIcon={X} aria-label={L('Stop sharing with ', '取消分享：') + v.label} onClick={() => m.removeShare(v.key)} />}
          </div>
        ) })}
      </div>
      <span className="text-caption text-fg-secondary">{ed.shared.length ? L('They can use and copy it. Only you can edit it.', '他們可以使用和複製，只有擁有者能編輯。') : L('Only you can see this template.', '目前只有你看得到。')}</span>
    </div>
  )
}

function Block({ icon, title, right, children, tone }: { icon: typeof Mail; title: string; right?: React.ReactNode; children: React.ReactNode; tone?: 'warn' }) {
  return (
    <div className="flex flex-col gap-[var(--layout-space-tight)] pt-[var(--layout-space-tight)]">
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-2 text-body font-semibold"><IconBox icon={icon} tone={tone || 'info'} />{title}</span>{right}</div>
      {children}
    </div>
  )
}

function TplEditor({ m }: { m: TCtl }) {
  const app = useApp(), ed = m.s.ed!, ro = ed.role === 'Viewer', ow = PMAP[ed.owner] || PEOPLE[0], e = m.errs()
  const show = (k: string) => (e[k] && (ed.tried || /up to|Another/.test(e[k]))) ? e[k] : ''
  const saved = ed.id ? app.templates.find(t => t.id === ed.id) || null : null, mode = ed.emailMode, bodyN = ed.bodyText.trim().length
  const title = ed.name.trim() || (ed.isNew ? L('New template', '新模板') : L('Untitled template', '未命名模板'))
  return (
    <div className="flex min-h-full flex-col">
      <PageHeader crumbs={[{ label: L('Templates', '模板'), onClick: () => m.goList() }, { label: title }]} actions={<><Tag size="sm" color={ro ? 'neutral' : 'blue'}>{ro ? L('View only', '僅檢視') : L('Owner', '擁有者')}</Tag>{ed.isNew ? null : <span className="hidden text-caption text-fg-secondary lg:inline">{L('Updated ' + ed.updated + ' · by ' + ow.en, ed.updated + ' 更新 · ' + ow.en)}</span>}</>} />
      <div data-layout-space="lg" className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-[var(--layout-space-loose)] p-[var(--layout-space-loose)] pb-[var(--layout-space-bottom)]">
        {ro ? <Banner tone="neutral" action={<Button size="sm" variant="secondary" startIcon={Copy} onClick={() => m.openEd(saved, true)}>{L('Duplicate', '複製')}</Button>}>{L(ow.en + ' shared this with you. Duplicate it to make changes.', ow.en + ' 分享給你的模板。想修改請先複製一份。')}</Banner> : null}
        <Section title={L('Details', '基本資料')}>
          <div className="flex flex-col gap-[var(--layout-space-loose)]">
            <FormField id="t-name" label={L('Name', '名稱')} required count={ed.name.length + ' / ' + LIM.name} over={ed.name.length > LIM.name} error={show('name')}>
              <Input id="t-name" disabled={ro} value={ed.name} error={!!show('name')} onChange={ev => m.setEd({ name: ev.target.value })} placeholder={L('e.g. Chiller maintenance notice', '例如：冰水機維修通知')} />
            </FormField>
            <ShareField m={m} ro={ro} />
          </div>
        </Section>
        <Section title={L('Content', '內容')} sub={L('Fill in the channels you need. Only the text is saved.', '填寫需要的通道就好，模板只存文字。')}>
          <div className="flex flex-col gap-[var(--layout-space-loose)]">
            {ed.tried && e.formats ? <Banner tone="error">{e.formats}</Banner> : null}
            <FormField id="t-sender" label={L('Sender name', '寄件人名稱')} required count={ed.sender.length + ' / ' + LIM.sender} over={ed.sender.length > LIM.sender} error={show('sender')}>
              <Input id="t-sender" disabled={ro} value={ed.sender} error={!!show('sender')} onChange={ev => m.setEd({ sender: ev.target.value })} placeholder={L('e.g. IT Service Desk', '例如：IT Service Desk')} />
            </FormField>
            <Block icon={MessageSquareText} title={L('Notification', '通知')} right={<span className="flex gap-1.5"><Tag size="sm" icon={Smartphone}>{L('Device notifications', '裝置推播')}</Tag><Tag size="sm" icon={Monitor}>{L('Desktop OS', '桌面通知')}</Tag></span>}>
              <FormField id="t-title" label={L('Title', '標題')} count={ed.title.length + ' / ' + LIM.title} over={ed.title.length > LIM.title} error={show('title')}>
                <Input id="t-title" disabled={ro} value={ed.title} error={!!show('title')} onChange={ev => m.setEd({ title: ev.target.value })} placeholder={L('e.g. Fire drill at [time] today', '例如：今天 [time] 消防演習')} />
              </FormField>
              <FormField id="t-content" label={L('Text', '內文')} count={fmtN(ed.content.length) + ' / ' + LIM.push} over={ed.content.length > LIM.push} hint={L('Desktop shows about 120 characters. Put the action first.', '桌面通知只顯示約 60 個中文字，重點放前面。')} error={show('content')}>
                <Textarea id="t-content" rows={4} disabled={ro} value={ed.content} error={!!show('content')} onChange={ev => m.setEd({ content: ev.target.value })} placeholder={L('What’s happening and what to do', '發生什麼事、需要做什麼')} />
              </FormField>
            </Block>
            <Block icon={MessageSquareText} tone="warn" title="SMS" right={<Tag size="sm" unbounded>{L('Optional', '選填')}</Tag>}>
              <FormField id="t-sms" label={L('SMS text', 'SMS 內容')} count={ed.sms.length + ' / ' + LIM.sms} over={ed.sms.length > LIM.sms} error={show('sms')}>
                <Textarea id="t-sms" rows={2} disabled={ro} value={ed.sms} error={!!show('sms')} onChange={ev => m.setEd({ sms: ev.target.value })} placeholder={L('Short version for SMS fallback', 'SMS 備援用的簡短版本')} />
              </FormField>
            </Block>
            <Block icon={Mail} title="Email" right={ro ? <Tag size="sm">{mode === 'own' ? L('Separate email', '另寫 Email') : L('Same as notification', '同通知內容')}</Tag> : (
              <SegmentedControl size="sm" value={mode} onValueChange={v => v && m.setEmailMode(v as 'same' | 'own')} aria-label="Email">
                <SegmentedControlItem value="same">{L('Same as notification', '同通知內容')}</SegmentedControlItem>
                <SegmentedControlItem value="own">{L('Separate email', '另寫 Email')}</SegmentedControlItem>
              </SegmentedControl>
            )}>
              {mode === 'same' ? <div className="border-l-2 border-divider pl-3 text-body text-fg-secondary">{L('Sends the notification as plain text.', '用通知內容寄出純文字 Email。')}</div> : (
                <>
                  <FormField id="t-subject" label={L('Subject', '主旨')} required count={ed.subject.length + ' / ' + LIM.subject} over={ed.subject.length > LIM.subject} error={show('subject')}>
                    <Input id="t-subject" disabled={ro} value={ed.subject} error={!!show('subject')} onChange={ev => m.setEd({ subject: ev.target.value })} placeholder={L('Email subject', 'Email 主旨')} />
                  </FormField>
                  <FormField id="t-body" label={L('Email text', 'Email 內文')} required count={fmtN(bodyN) + ' / ' + fmtN(LIM.body)} over={bodyN > LIM.body} hint={L('Attachments are added when sending.', '附件在發送時再加入。')} error={show('body')}>
                    <RichText id="t-body" seedKey={'trte-' + ed.htmlKey} html={ed.html} label={L('Email text', 'Email 內文')} readOnly={ro} error={!!show('body')} placeholder={L('Write the email…', '輸入 Email 內文…')} onInput={(h, t) => m.setEd({ html: h, bodyText: t.trim() ? t : '' })} />
                  </FormField>
                </>
              )}
            </Block>
          </div>
        </Section>
      </div>
      <div className="sticky bottom-0 z-10 border-t border-divider bg-surface">
        <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center gap-2 px-[var(--layout-space-loose)] py-[var(--layout-space-tight)]">
          {!ro && !ed.isNew && saved ? <Button variant="text" danger startIcon={Trash2} onClick={() => m.askDelete(saved)}>{L('Delete', '刪除')}</Button> : null}
          <div className="ml-auto flex gap-2">
            <Button variant="text" onClick={() => m.goList()}>{ro ? L('Back', '返回') : L('Cancel', '取消')}</Button>
            {!ed.isNew && saved ? <Button variant="tertiary" startIcon={Send} onClick={() => { if (ed.dirty && !ro) { flash(L('Save your changes first', '請先儲存變更'), 'err'); return } m.useTemplate(saved) }}>{L('Use template', '使用模板')}</Button> : null}
            {ro ? null : <Button variant="primary" startIcon={Check} onClick={() => m.saveTpl()}>{ed.isNew ? L('Create template', '建立模板') : L('Save', '儲存')}</Button>}
          </div>
        </div>
      </div>
    </div>
  )
}

export function TemplatesPage() {
  const [s, m] = useLogic<TS, TCtl>(() => ({ view: 'list', q: '', own: 'all', cf: null, ed: null }), makeCtl)
  useNavHome(() => m.goList())
  return (
    <>
      {s.view === 'edit' && s.ed ? <TplEditor m={m} /> : (
        <>
          <PageHeader crumbs={[{ label: L('Templates', '模板') }]} actions={<Button variant="primary" startIcon={Plus} onClick={() => m.openEd(null)}>{L('New template', '新增模板')}</Button>} />
          <TplList m={m} />
        </>
      )}
      <ConfirmDialog cf={s.cf} onClose={() => m.set({ cf: null })} />
    </>
  )
}
