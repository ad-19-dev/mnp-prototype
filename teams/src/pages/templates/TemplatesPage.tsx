// Templates: message text stored by format. Each belongs to one sending space; everyone in it can use and edit it.
import * as React from 'react'
import {
  Button, DataTable, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Empty,
  Input, Textarea,
} from '@qijenchen/design-system'
import { NO_HIDE, Trunc } from '../../components/ui'
import { ME_SPACE, spaceName, spaceTeam, tplInSpace } from '../../lib/teams'
import { createColumnHelper } from '@tanstack/react-table'
import {
  Check, CircleAlert, Copy, LayoutTemplate, Pencil, Plus,
  Search, Send, Trash2,
} from 'lucide-react'
import {
  LIM, ME, PEOPLE, smsMax, PMAP, cleanHtml, fmtDT, fmtN, htmlToText, tplDesk, tplFormats, tplHasEmail,
  type Template,
} from '../../lib/data'
import { flash, getApp, go, setApp, useApp } from '../../lib/store'
import { useLogic, scrollTop } from '../../lib/logic'
import { Banner, HiddenLabel, MoreButton, CHN, ConfirmDialog, FmtChips, FormatBlock, FormField, Section, Two, personVal, pname, type Confirm } from '../../components/ui'
import { PageHeader, SpaceIntro, SpaceSettings, useNavHome } from '../../components/shell'
import { RichText } from '../../components/RichText'
import { L, P } from '../../lib/i18n'

interface TEd {
  id: string | null; isNew: boolean; role: 'Owner' | 'Viewer'; name: string; sender: string; title: string; content: string; sms: string
  dSender: string; dTitle: string; dContent: string
  subject: string; html: string; bodyText: string; htmlKey: number
  shared: [string, string][]; owner: string; team: string | null; updated: string; updater: string; sq: string; sOpen: boolean; tried: boolean; dirty: boolean
}
interface TS { view: 'list' | 'edit'; q: string; cf: Confirm | null; ed: TEd | null }

function makeTplEd(t: Template | null, dup?: boolean): TEd {
  const base = { sq: '', sOpen: false, tried: false, dirty: false, htmlKey: Date.now() % 100000 }
  if (!t) return { ...base, id: null, isNew: true, role: 'Owner', name: '', sender: '', title: '', content: '', sms: '', dSender: '', dTitle: '', dContent: '', subject: '', html: '', bodyText: '', shared: [], owner: ME, team: spaceTeam(), updated: '', updater: ME }
  // each channel's own text, as New message step 2 has it (2026-11-23); Desktop shows the Mobile text until it has its own
  const own = tplHasEmail(t), h = own ? t.email.html || '' : '', d = tplDesk(t)
  const body = { sender: t.sender || '', title: t.title || '', content: t.content || '', sms: t.sms || '', dSender: d.sender, dTitle: d.title, dContent: d.content, subject: own ? t.email.subject || '' : '', html: h, bodyText: htmlToText(h) }
  if (dup) return { ...base, ...body, id: null, isNew: true, role: 'Owner', name: (L('Copy of ', '複製 - ') + t.name).slice(0, LIM.name), shared: [], owner: ME, team: spaceTeam(), updated: '', updater: ME, dirty: true }
  return { ...base, ...body, id: t.id, isNew: false, role: 'Owner', name: t.name, shared: (t.shared || []).map(x => x.slice() as [string, string]), owner: t.owner, updater: t.updater || t.owner, team: t.team || null, updated: t.updated }
}
let seq = 0
function makeCtl(get: () => TS, set: (p: Partial<TS> | ((s: TS) => Partial<TS>)) => void) {
  const m = {
    get s() { return get() },
    set,
    setEd(patch: Partial<TEd>, clean?: boolean) { const ed = { ...get().ed!, ...patch }; if (!clean) ed.dirty = true; set({ ed }) },
    listRows() {
      const s = get(), q = s.q.trim().toLowerCase()
      return getApp().templates.filter(t => tplInSpace(t)).filter(t => {
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
        set({ cf: { title: L('Discard changes?', '要捨棄變更嗎？'), text: L('Your changes haven’t been saved.', '你的變更還沒儲存。'), icon: CircleAlert, tone: 'warn', cancel: L('Cancel', '取消'), ok: L('Discard', '捨棄'), danger: true, run: () => { set({ cf: null, view: 'list', ed: null }); scrollTop() } } })
        return
      }
      set({ view: 'list', ed: null })
      scrollTop()
    },
    askDelete(t: Template) {
      set({ cf: { title: L('Delete “' + t.name + '”?', '刪除「' + t.name + '」？'), text: L('No one can use it anymore. Messages already sent aren’t affected.', '刪除後大家都不能再用，已送出的訊息不受影響。'), icon: Trash2, tone: 'err', cancel: L('Cancel', '取消'), ok: L('Delete', '刪除'), danger: true, run: () => {
        setApp(a => ({ templates: a.templates.filter(x => x.id !== t.id) }))
        set({ cf: null, view: 'list', ed: null })
        flash(L('Template deleted', '已刪除模板'), 'ok')
        scrollTop()
      } } })
    },
    errs() {
      const ed = get().ed!, e: Record<string, string> = {}, nm = ed.name.trim()
      const tooLong = (n: number) => L('Up to ' + fmtN(n) + ' characters.', '最多 ' + fmtN(n) + ' 字。')
      if (!nm) e.name = L('Enter a name.', '請輸入名稱。')
      else if (ed.name.length > LIM.name) e.name = tooLong(LIM.name)
      else if (getApp().templates.some(t => t.id !== ed.id && t.name.toLowerCase() === nm.toLowerCase())) e.name = L('This name is taken.', '這個名稱已經有人用了。')
      // a channel is filled in or left empty; filled in, it needs its title and content (as in New message step 2)
      const pair = (t: string, c: string, kt: string, kc: string, nt: number, nc: number) => {
        if (t.trim() && !c.trim()) e[kc] = L('Add content, or clear the title.', '請輸入內容，或清空標題。')
        if (c.trim() && !t.trim()) e[kt] = L('Add a title, or clear the content.', '請輸入標題，或清空內容。')
        if (t.length > nt) e[kt] = tooLong(nt)
        if (c.length > nc) e[kc] = tooLong(nc)
      }
      if (ed.sender.length > LIM.sender) e.sender = tooLong(LIM.sender)
      if (ed.dSender.length > LIM.sender) e.dsender = tooLong(LIM.sender)
      pair(ed.title, ed.content, 'title', 'content', LIM.title, LIM.push)
      pair(ed.dTitle, ed.dContent, 'dtitle', 'dcontent', LIM.dTitle, LIM.desktop)
      if (ed.sms.length > smsMax(ed.sms)) e.sms = tooLong(smsMax(ed.sms))
      const hasMail = !!(ed.subject.trim() || ed.bodyText.trim())
      if (hasMail) {
        if (!ed.subject.trim()) e.subject = L('Enter a subject.', '請輸入主旨。')
        else if (ed.subject.length > LIM.subject) e.subject = tooLong(LIM.subject)
        if (!ed.bodyText.trim()) e.body = L('Write the email.', '請輸入 Email 內容。')
        else if (ed.bodyText.trim().length > LIM.body) e.body = tooLong(LIM.body)
      }
      if (!ed.title.trim() && !ed.content.trim() && !ed.dTitle.trim() && !ed.dContent.trim() && !ed.sms.trim() && !hasMail) e.formats = L('Fill in at least one channel.', '請至少填寫一個通道。')
      return e
    },
    saveTpl() {
      const ed = get().ed!, e = m.errs()
      if (Object.keys(e).length) { m.setEd({ tried: true }, true); flash(L('Fix the highlighted fields', '請修正標示的欄位'), 'err'); return }
      const patch: Partial<Template> = { team: ed.team, name: ed.name.trim(), sender: ed.sender.trim(), title: ed.title.trim(), content: ed.content.trim(), sms: ed.sms.trim(), dSender: ed.dSender.trim(), dTitle: ed.dTitle.trim(), dContent: ed.dContent.trim(), email: ed.subject.trim() || ed.bodyText.trim() ? { mode: 'own', subject: ed.subject.trim(), html: cleanHtml(ed.html) } : { mode: 'same' }, shared: ed.shared.map(x => x.slice() as [string, string]), updater: ME, updated: fmtDT(new Date()), fresh: Date.now() }
      if (ed.id) setApp(a => ({ templates: a.templates.map(t => t.id === ed.id ? { ...t, ...patch } : t) }))
      else setApp(a => ({ templates: [{ id: 'tt' + (++seq), owner: ME, ...patch } as Template].concat(a.templates) }))
      set({ view: 'list', ed: null, q: '' })
      flash(ed.id ? L('Changes saved', '已儲存變更') : L('Template created', '已建立模板'), 'ok')
      scrollTop()
    },
  }
  return m
}
type TCtl = ReturnType<typeof makeCtl>

function TplMenu({ m, t }: { m: TCtl; t: Template }) {
  const lid = React.useId()
  return (
    <><HiddenLabel id={lid}>{L('Actions for ', '操作：') + t.name}</HiddenLabel>
    <DropdownMenu>
      <DropdownMenuTrigger asChild><MoreButton labelId={lid} /></DropdownMenuTrigger>
      <DropdownMenuContent align="end" minWidth={208}>
        <DropdownMenuItem startIcon={Send} onSelect={() => m.useTemplate(t)}>{L('Use', '使用')}</DropdownMenuItem>
        <DropdownMenuItem startIcon={Pencil} onSelect={() => m.openEd(t)}>{L('Edit', '編輯')}</DropdownMenuItem>
        <DropdownMenuItem startIcon={Copy} onSelect={() => m.openEd(t, true)}>{L('Duplicate', '複製')}</DropdownMenuItem>
        <DropdownMenuSeparator /><DropdownMenuItem startIcon={Trash2} className="text-error-text" onSelect={() => m.askDelete(t)}>{L('Delete', '刪除')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu></>
  )
}

const tcol = createColumnHelper<Template>()
function TplList({ m }: { m: TCtl }) {
  const app = useApp(), s = m.s, rows = m.listRows(), nAll = app.templates.filter(t => tplInSpace(t)).length
  const filtered = !!s.q.trim()
  const cols = React.useMemo(() => [
    tcol.accessor('name', { header: L('Template', '模板'), meta: { width: 240 }, cell: i => { const t = i.row.original, first = t.title || (t.email && t.email.subject) || ''; return (
      <span className="flex min-w-0 flex-col">
        <Trunc text={t.name} className="font-medium text-primary hover:text-primary-hover hover:underline" onClick={() => m.openEd(t)} />
        <Trunc text={first} className="text-caption text-fg-secondary" />
      </span>
    ) } }),
    tcol.display({ id: 'fmt', header: L('Channels', '通道'), meta: { width: 140 }, cell: i => <FmtChips list={tplFormats(i.row.original)} /> }),
    tcol.display({ id: 'text', header: L('Text', '內容'), meta: { width: 300 }, cell: i => { const t = i.row.original, text = (t.content || htmlToText(t.email && t.email.html)).replace(/\s+/g, ' '); return <Trunc text={text} className="text-fg-secondary" /> } }),
    // who changed it last and when (2026-11-23)
    tcol.accessor('updated', { header: L('Last update', '最後更新'), meta: { width: 200 }, cell: i => { const x = i.row.original, p = PMAP[x.updater || x.owner] || PEOPLE[0]; return <Two a={pname(p)} b={<span className="tabular-nums">{x.updated}</span>} /> } }),  // the name, then the date and time, no avatar (2026-11-23)
    // the personal space holds only your own templates, so Created by appears in team spaces only
    ...(app.space === ME_SPACE ? [] : [tcol.accessor(t => personVal(PMAP[t.owner] || PEOPLE[0], t.owner === ME), { id: 'owner', header: L('Creator', '建立者'), meta: { width: 200, type: 'person' } })]),
  ], [m, app.lang, app.space])
  return (
    <div className="flex h-full flex-col gap-[var(--layout-space-loose)] p-[var(--layout-space-loose)]">
      <SpaceIntro />
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-60 max-w-sm flex-1"><Input startIcon={Search} type="search" placeholder={L('Search templates', '搜尋模板')} aria-label={L('Search templates', '搜尋模板')} value={s.q} onChange={e => m.set({ q: e.target.value })} /></div>
      </div>
      {/* every cell centred vertically (2026-11-23): rows keep their height for two lines; no frozen column */}
      <div className="tbl-vcenter contents">
        <DataTable tableOptions={NO_HIDE} columns={cols as any} data={rows} bordered height="100%" autoRowHeight getRowId={t => t.id}
          rowActions={(t: Template) => <TplMenu m={m} t={t} />}
          emptyState={<Empty icon={LayoutTemplate} title={L('No matching templates', '找不到符合的模板')} description={L('Try another search.', '換個關鍵字試試。')} action={<Button onClick={() => m.set({ q: '' })}>{L('Show all', '顯示全部')}</Button>} />} />
      </div>
      <span className="text-body text-fg-secondary">{filtered ? L(rows.length + ' of ' + nAll, rows.length + ' / ' + nAll + ' 個模板') : P(nAll, 'template', '個模板')}</span>
    </div>
  )
}


function TplEditor({ m }: { m: TCtl }) {
  const app = useApp(), ed = m.s.ed!, ro = ed.role === 'Viewer', ow = PMAP[ed.owner] || PEOPLE[0], e = m.errs()
  const show = (k: string) => (e[k] && (ed.tried || /up to|Another/.test(e[k]))) ? e[k] : ''
  const saved = ed.id ? app.templates.find(t => t.id === ed.id) || null : null
  const title = ed.name.trim() || (ed.isNew ? L('New template', '新模板') : L('Untitled template', '未命名模板'))
  return (
    <div className="flex min-h-full flex-col">
      <PageHeader crumbs={[{ label: spaceName(getApp().space), onClick: () => m.goList() }, { label: title }]} actions={<>{ed.isNew ? null : <span className="hidden text-caption text-fg-secondary lg:inline">{L('Last update ' + ed.updated + ' · by ' + (PMAP[ed.updater] || ow).en, ed.updated + ' 最後更新 · ' + (PMAP[ed.updater] || ow).en)}</span>}</>} />
      <div data-layout-space="lg" className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-[calc(var(--layout-space-loose)*2)] p-[var(--layout-space-loose)] pb-[var(--layout-space-bottom)]">
        {ro ? <Banner tone="neutral" action={<Button size="sm" variant="secondary" startIcon={Copy} onClick={() => m.openEd(saved, true)}>{L('Duplicate', '複製')}</Button>}>{L(ow.en + ' shared this with you. Duplicate it to make changes.', ow.en + ' 分享給你的模板。想修改請先複製一份。')}</Banner> : null}
        <FormField id="t-name" label={L('Template name', '模板名稱')} required count={ed.name.length + ' / ' + LIM.name} over={ed.name.length > LIM.name} error={show('name')}>
          <Input id="t-name" disabled={ro} value={ed.name} error={!!show('name')} onChange={ev => m.setEd({ name: ev.target.value })} placeholder={L('e.g. Chiller maintenance notice', '例如：冰水機維修通知')} />
        </FormField>
        {/* the content as in New message step 2 (2026-11-23): one card per channel, same order, fields and hints;
            in a template every channel is optional (fill in the ones it's for) */}
        <Section title={L('Content', '內容')} sub={L('Fill in the channels you need. Only the text is saved.', '填寫需要的通道就好，模板只存文字。')}>
          <div className="flex flex-col gap-[calc(var(--layout-space-loose)*2)]">
            {ed.tried && e.formats ? <Banner tone="error">{e.formats}</Banner> : null}
            <FormatBlock title={CHN.push.name} icon={CHN.push.icon}>
              <FormField id="t-sender" label={L('Sender', '寄件人')} count={ed.sender.length + ' / ' + LIM.sender} over={ed.sender.length > LIM.sender} hint={<><span className="font-medium text-foreground">{L('English only.', '只能輸入英文。')}</span>{L(' Recipients see this name as the notification source in the Mobile notifications app (PNS).', '收件人會在 Mobile notifications App（PNS）看到這個名稱作為通知來源。')}</>} error={show('sender')}>
                <Input id="t-sender" disabled={ro} value={ed.sender} error={!!show('sender')} onChange={ev => m.setEd({ sender: ev.target.value })} placeholder={L('e.g. ESH Emergency', '例如：ESH Emergency')} />
              </FormField>
              <FormField id="t-title" label={L('Title', '標題')} count={ed.title.length + ' / ' + LIM.title} over={ed.title.length > LIM.title} error={show('title')}>
                <Input id="t-title" disabled={ro} value={ed.title} error={!!show('title')} onChange={ev => m.setEd({ title: ev.target.value })} />
              </FormField>
              <FormField id="t-content" label={L('Content', '內容')} count={fmtN(ed.content.length) + ' / ' + LIM.push} over={ed.content.length > LIM.push} error={show('content')}>
                <Textarea id="t-content" rows={4} disabled={ro} value={ed.content} error={!!show('content')} onChange={ev => m.setEd({ content: ev.target.value })} />
              </FormField>
            </FormatBlock>
            <FormatBlock title="SMS" icon={CHN.sms.icon} desc={L('Sent as a backup via SMS only if the push notification can’t be sent.', '只有推播未送出時，才會用 SMS 補送。')}>
              <FormField id="t-sms" label={L('SMS content', 'SMS 內容')} count={ed.sms.length + ' / ' + smsMax(ed.sms)} over={ed.sms.length > smsMax(ed.sms)} hint={L('Up to 534 half-width characters, or 267 if any character is full-width.', '半形最多 534 字；只要有任一個全形字元，最多 267 字。')} error={show('sms')}>
                <Textarea id="t-sms" rows={2} disabled={ro} value={ed.sms} error={!!show('sms')} onChange={ev => m.setEd({ sms: ev.target.value })} />
              </FormField>
            </FormatBlock>
            <FormatBlock title={CHN.desktop.name} icon={CHN.desktop.icon}>
              <FormField id="t-dsender" label={L('Sender (Optional)', '寄件人（選填）')} count={ed.dSender.length + ' / ' + LIM.sender} over={ed.dSender.length > LIM.sender} error={show('dsender')}>
                <Input id="t-dsender" disabled={ro} value={ed.dSender} error={!!show('dsender')} onChange={ev => m.setEd({ dSender: ev.target.value })} />
              </FormField>
              <FormField id="t-dtitle" label={L('Title', '標題')} count={ed.dTitle.length + ' / ' + LIM.dTitle} over={ed.dTitle.length > LIM.dTitle} error={show('dtitle')}>
                <Input id="t-dtitle" disabled={ro} value={ed.dTitle} error={!!show('dtitle')} onChange={ev => m.setEd({ dTitle: ev.target.value })} />
              </FormField>
              <FormField id="t-dcontent" label={L('Content', '內容')} count={fmtN(ed.dContent.length) + ' / ' + LIM.desktop} over={ed.dContent.length > LIM.desktop} hint={L('Supports Chinese, English, and numbers only.', '僅支援中文、英文、數字。')} error={show('dcontent')}>
                <Textarea id="t-dcontent" rows={3} disabled={ro} value={ed.dContent} error={!!show('dcontent')} onChange={ev => m.setEd({ dContent: ev.target.value })} />
              </FormField>
            </FormatBlock>
            <FormatBlock title="Email" icon={CHN.email.icon}>
              <FormField id="t-subject" label={L('Subject', '主旨')} count={ed.subject.length + ' / ' + LIM.subject} over={ed.subject.length > LIM.subject} error={show('subject')}>
                <Input id="t-subject" disabled={ro} value={ed.subject} error={!!show('subject')} onChange={ev => m.setEd({ subject: ev.target.value })} />
              </FormField>
              <FormField id="t-body" label={L('Content', '內容')} hint={L('Supports text, tables, and images.', '支援文字、表格、圖片。')} error={show('body')}>
                <RichText id="t-body" seedKey={'trte-' + ed.htmlKey} html={ed.html} label={L('Content', '內容')} readOnly={ro} error={!!show('body')} onInput={(h, t) => m.setEd({ html: h, bodyText: t.trim() ? t : '' })} />
              </FormField>
            </FormatBlock>
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
  const [s, m] = useLogic<TS, TCtl>(() => ({ view: 'list', q: '', cf: null, ed: null }), makeCtl)
  const { space } = useApp()
  // another space opens on its list
  React.useEffect(() => { m.set({ view: 'list', ed: null, q: '' }) }, [space, m])
  useNavHome(() => m.goList())
  return (
    <>
      {s.view === 'edit' && s.ed ? <TplEditor m={m} /> : (
        <>
          <PageHeader crumbs={[{ label: spaceName(space) }]} actions={<><Button variant="primary" startIcon={Plus} onClick={() => m.openEd(null)}>{L('New template', '新增模板')}</Button><SpaceSettings /></>} />
          <TplList m={m} />
        </>
      )}
      <ConfirmDialog cf={s.cf} onClose={() => m.set({ cf: null })} />
    </>
  )
}
