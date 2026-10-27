// Messages page controller: list, row actions, the 3-step send flow and its dialogs.
import {
  BLOCKED, CAP, CH_ORDER, DOMAIN, LIM, ME, PMAP, audToTags, cleanHtml, failList, flatten, fmtDT, fromIso, htmlToText,
  joinList, pad, parseDT, parseList, plural, rowChs, splitTokens, tagsToAud, textToHtml, toIso, tplHasEmail,
  type Channel, type Group, type Match, type Row, type Status, type Tag, type Template,
} from '../../lib/data'
import {
  approval, blankCompose, effEmailMode, errs, hasNotif, msgErr, multiPeople, reach, recvFlat, seedEmail, selChs, smsOn,
  stepOk, unresolved, type Compose,
} from '../../lib/compose'
import { flash, getApp, patchRow, setApp } from '../../lib/store'
import { scrollTop } from '../../lib/logic'
import type { Confirm } from '../../components/ui'
import { chText } from '../../components/ui'
import { L, P, joinL, niceDT } from '../../lib/i18n'
import { CircleAlert, LayoutTemplate, Trash2, Ban } from 'lucide-react'
import type { RiState } from '../../components/RecvInput'

export interface ImpState { text: string; file: string; res: Match[] | null; picks: Record<number, Record<string, boolean>> }
export interface SendState {
  view: 'list' | 'compose'
  q: string; fS: Status[]; fC: Channel[]; page: number
  det: string | null; ns: string | null; cf: Confirm | null
  c: Compose
  ri: RiState; rf: string
  imp: ImpState | null
  num: { draft: Record<string, 'co' | 'pp'> } | null
  sg: { name: string; desc: string; tried: boolean } | null
  stpl: { name: string; tried: boolean } | null
  tp: { q: string } | null
  unr: boolean
  gp: { q: string; tab: 'all' | 'mine' | 'shared'; sel: Record<string, boolean> } | null
}
export const initSend = (): SendState => ({
  view: 'list', q: '', fS: [], fC: [], page: 1, det: null, ns: null, cf: null,
  c: blankCompose(), ri: { type: 'person', q: '', open: false, exp: null }, rf: '',
  imp: null, num: null, sg: null, stpl: null, tp: null, unr: false, gp: null,
})

let seq = 0
export type SendCtl = ReturnType<typeof makeSendCtl>

export function makeSendCtl(get: () => SendState, set: (p: Partial<SendState> | ((s: SendState) => Partial<SendState>)) => void) {
  const app = getApp
  let afterNum: number | null = null

  const m = {
    get s() { return get() },
    set,
    setC(patch: Partial<Compose>, clean?: boolean) {
      const c = { ...get().c, ...patch }
      if (!clean) c.dirty = true
      set({ c })
    },
    tplById(id?: string | null) { return app().templates.find(x => x.id === id) },
    tplName(id?: string | null) { const t = m.tplById(id); return t ? t.name : '' },

    // ---------- list ----------
    filtered() {
      const s = get(), q = s.q.trim().toLowerCase()
      return app().rows.filter(r => {
        if (s.fS.length && s.fS.indexOf(r.status) < 0) return false
        if (s.fC.length && !rowChs(r).some(k => s.fC.indexOf(k) >= 0)) return false
        if (!q) return true
        const cr = PMAP[r.creator] || ({} as any)
        return [r.sender, m.tplName(r.tpl), r.title, r.content, r.email && r.email.subject, cr.en, cr.zh].join(' ').toLowerCase().indexOf(q) >= 0
      })
    },
    toggleIn(key: 'fS' | 'fC', val: string) {
      const arr = (get()[key] as string[]).slice(), i = arr.indexOf(val)
      if (i >= 0) arr.splice(i, 1); else arr.push(val)
      set({ page: 1, [key]: arr } as any)
    },
    retry(id: string) {
      const r = app().rows.find(x => x.id === id)!
      set({ ns: null, det: null })
      patchRow(id, { status: 'progress', ok: 0, err: null, fresh: Date.now() })
      flash(L('Retrying', '重新傳送中'), 'ok', r.title)
      setTimeout(() => patchRow(id, { ok: Math.round(r.total * 0.6) }), 1300)
      setTimeout(() => patchRow(id, { status: 'sent', ok: r.total }), 2800)
    },
    askCancel(r: Row) {
      set({ cf: { title: L('Cancel this message?', '取消這則排程？'), text: L('“' + r.title + '” won’t be sent. This can’t be undone.', '「' + r.title + '」將不會送出，無法復原。'), icon: Ban, tone: 'err', cancel: L('Keep', '保留'), ok: L('Cancel message', '取消排程'), danger: true, run: () => m.cancelSched(r.id) } })
    },
    cancelSched(id: string) {
      const r = app().rows.find(x => x.id === id)!
      setApp(s => ({ rows: s.rows.filter(x => x.id !== id) }))
      set({ cf: null, det: null })
      flash(L('Message canceled', '已取消排程'), 'ok', r.title)
    },
    // delivery per channel; SMS counts the people the device notification missed
    chStats(r: Row) {
      const b = r.byCh || {}
      return rowChs(r).map(k => {
        let v = b[k]
        if (!v) v = k === 'sms' ? [0, Math.max(0, r.total - r.ok)] : (r.status === 'error' ? [0, r.total] : [r.ok, r.total])
        return { k, ok: v[0], of: v[1] }
      })
    },
    resendNotSent(r: Row) {
      if (r.status === 'error') { m.retry(r.id); return }
      const tags: Tag[] = failList(r).map(f => f.ext ? { key: 'e:' + f.ext, type: 'ext' as const, email: f.ext } : { key: 'p:' + f.p!.id, type: 'person' as const, id: f.p!.id })
      m.startCompose('resend', r, tags)
    },

    // ---------- compose: setup ----------
    startCompose(mode: Compose['mode'], r?: Row, recv?: Tag[]) {
      const c = blankCompose()
      c.mode = mode || 'new'
      c.htmlKey = (get().c.htmlKey || 0) + 1
      if (r) {
        c.ch = { push: r.channels.indexOf('push') >= 0, desktop: r.channels.indexOf('desktop') >= 0, email: r.channels.indexOf('email') >= 0, sms: !!r.sms }
        c.sender = r.sender
        c.tplId = r.tpl || null
        c.smsText = r.smsText || ''
        if (c.ch.push || c.ch.desktop) { c.title = r.title; c.content = r.content }
        if (r.email && r.email.mode === 'own') {
          c.emailMode = 'own'
          c.subject = r.email.subject || ''
          c.html = r.email.html || ''
          c.bodyText = htmlToText(r.email.html)
          c.atts = (r.email.atts || []).map(a => ({ id: 'f' + (++seq), name: a.name, size: a.size }))
        }
        c.receivers = audToTags(r.aud)
        c.maxStep = 3
        if (mode === 'edit') { c.editId = r.id; const d = parseDT(r.sched); if (d) { c.sendMode = 'schedule'; c.schedAt = toIso(d) } }
      }
      if (recv) c.receivers = recv
      set({ view: 'compose', c, det: null, ns: null, cf: null, tp: null, unr: false, rf: '' })
      scrollTop()
    },
    toList() { set({ view: 'list', c: blankCompose(), cf: null }); scrollTop() },
    goList() {
      const s = get()
      if (s.view === 'compose' && s.c.dirty && !s.c.result) {
        set({ cf: { title: L('Leave without sending?', '還沒送出，要離開嗎？'), text: L('Save a draft to finish later.', '可以先存成草稿，之後再完成。'), icon: CircleAlert, tone: 'warn', cancel: L('Keep editing', '繼續編輯'), alt: L('Discard', '捨棄'), altDanger: true, runAlt: () => m.toList(), ok: L('Save draft', '存草稿'), run: () => { m.toList(); flash(L('Draft saved', '已存草稿')) } } })
        return
      }
      m.toList()
    },

    // ---------- receivers ----------
    addRecv(tag: Tag) {
      const c = get().c
      if (c.receivers.some(x => x.key === tag.key)) return
      m.setC({ receivers: c.receivers.concat([tag]) })
    },
    removeRecv(key: string) {
      const c = get().c, pick = { ...c.pick }
      delete pick[key]
      m.setC({ receivers: c.receivers.filter(x => x.key !== key), pick })
    },
    recvTotal() { const f = recvFlat(get().c, app().groups); return f.people.length + f.ext.length },
    reach() { return reach(get().c, app().groups) },
    approval() { return approval(get().c) },
    errs() { return errs(get().c, app().groups) },
    // groups shown first in pickers: yours first, then the most recently updated
    groupSuggest() {
      const rank = (g: { role: string }) => (g.role === 'Owner' ? 0 : g.role === 'Editor' ? 1 : 2)
      return app().groups.slice().sort((a, b) => rank(a) - rank(b) || b.updated.localeCompare(a.updated)).slice(0, 5)
    },
    openGroups() { set({ gp: { q: '', tab: 'all', sel: {} } }) },
    gpToggle(id: string) { const gp = get().gp!; set({ gp: { ...gp, sel: { ...gp.sel, [id]: !gp.sel[id] } } }) },
    gpAdd() {
      const s = get(), ids = Object.keys(s.gp!.sel).filter(k => s.gp!.sel[k])
      const add: Tag[] = ids.filter(id => !s.c.receivers.some(t => t.key === 'g:' + id)).map(id => ({ key: 'g:' + id, type: 'group' as const, id }))
      m.setC({ receivers: s.c.receivers.concat(add) })
      set({ gp: null })
      flash(L('Added ', '已加入 ') + P(add.length, 'group', '個群組'))
    },

    // ---------- channels and message ----------
    pickChannel(id: Channel) {
      const c = get().c, ch = { ...c.ch }
      ch[id] = !ch[id]
      // SMS is only a fallback for Device notification
      if (id === 'push' && !ch.push) ch.sms = false
      if (id === 'sms' && ch.sms) ch.push = true
      const p: Partial<Compose> = { ch }
      // Email on its own needs its own text: start it from the notification text
      if (ch.email && !ch.push && !ch.desktop && !c.bodyText.trim() && (c.title.trim() || c.content.trim())) Object.assign(p, seedEmail(c, c.subject || c.title, textToHtml(c.content)))
      m.setC(p)
    },
    setEmailMode(mode: 'same' | 'own') {
      const c = get().c, p: Partial<Compose> = { emailMode: mode }
      if (mode === 'own' && !c.bodyText.trim() && !c.subject.trim()) Object.assign(p, seedEmail(c, c.title, textToHtml(c.content)))
      m.setC(p)
    },
    onEmailInput(html: string, text: string) { m.setC({ html, bodyText: text.trim() ? text : '' }) },
    addFiles(files: File[]) {
      const atts = get().c.atts.slice()
      let err = ''
      files.forEach(f => {
        const ext = (f.name.split('.').pop() || '').toLowerCase(), used = atts.reduce((a, x) => a + x.size, 0)
        if (BLOCKED.indexOf(ext) >= 0) err = L(f.name + ': program files aren’t allowed.', f.name + '：不能附加執行檔。')
        else if (atts.length >= LIM.files) err = L('Up to ' + LIM.files + ' files.', '最多 ' + LIM.files + ' 個檔案。')
        else if (used + f.size > LIM.bytes) err = L(f.name + ' is too big. 10 MB total max.', f.name + ' 太大，附件總共最多 10 MB。')
        else atts.push({ id: 'f' + (++seq), name: f.name, size: f.size })
      })
      m.setC({ atts, attErr: err })
    },
    removeFile(id: string) { m.setC({ atts: get().c.atts.filter(a => a.id !== id), attErr: '' }) },
    copySms() {
      const c = get().c, b = (c.title.trim() ? c.title.trim() + ': ' : '') + c.content.replace(/\s+/g, ' ').trim()
      m.setC({ smsText: b.length > LIM.sms ? b.slice(0, LIM.sms - 1).trim() + '…' : b })
    },

    // ---------- steps ----------
    // show the first problem in place instead of a toast that could cover it
    scrollToErr() {
      setTimeout(() => {
        const el = document.querySelector('[data-compose] [aria-invalid="true"], [data-compose] [data-err]')
        if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 60)
    },
    goStep(n: number) {
      const c = get().c
      if (n === c.step || n < 1 || n > 3) return
      if (n < c.step) { m.setC({ step: n }, true); scrollTop(); return }
      const e = m.errs()
      for (let k = c.step; k < n; k++) {
        if (!stepOk(k, e)) { m.setC({ step: k, tried: { ...c.tried, [k]: true } }, true); m.scrollToErr(); return }
        if (k === 1 && unresolved(get().c).length) { afterNum = n; m.openNumbers(); return }
      }
      m.setC({ step: n, maxStep: Math.max(c.maxStep, n) }, true)
      scrollTop()
    },
    openNumbers() { set({ num: { draft: { ...get().c.pick } } }) },
    closeNumbers() { afterNum = null; set({ num: null }) },
    numPick(key: string, v: 'co' | 'pp') { set({ num: { draft: { ...get().num!.draft, [key]: v } } }) },
    numAllCo() { const d = { ...get().num!.draft }; multiPeople(get().c).forEach(p => { d['p:' + p.id] = 'co' }); set({ num: { draft: d } }) },
    confirmNum() {
      const d = get().num!.draft, next = afterNum
      afterNum = null
      m.setC({ pick: d })
      set({ num: null })
      if (next && !unresolved(get().c).length) m.goStep(next)
      else flash(L('SMS numbers saved', '已儲存 SMS 號碼'))
    },

    // ---------- templates ----------
    askTemplate(t: Template) {
      const c = get().c, has = (c.title + c.content + c.smsText + c.subject + c.bodyText).trim()
      if (!has || c.tplId === t.id) { m.applyTemplate(t); return }
      set({ tp: null, cf: { title: L('Replace your text?', '要取代目前的內容嗎？'), text: L('“' + t.name + '” will replace what you’ve written. Receivers and channels stay the same.', '「' + t.name + '」會取代你寫的內容，收件人和通道不變。'), icon: LayoutTemplate, tone: 'warn', cancel: L('Keep mine', '保留我的'), ok: L('Replace', '取代'), run: () => m.applyTemplate(t) } })
    },
    applyTemplate(t: Template, quiet?: boolean) {
      const c = get().c, own = tplHasEmail(t)
      const sub = own ? t.email.subject || '' : (t.title || ''), body = own ? t.email.html || '' : textToHtml(t.content)
      m.setC({ tplId: t.id, sender: t.sender || c.sender, title: t.title || '', content: t.content || '', smsText: t.sms || '', emailMode: own ? 'own' : 'same', ...seedEmail(c, sub, body) })
      set({ tp: null, cf: null })
      if (!quiet) flash(L('Template applied', '已套用模板'), 'ok', L('Fill in the [brackets] before sending.', '送出前記得替換 [方括號] 的內容。'))
    },
    clearTemplate() { m.setC({ tplId: null }); flash(L('Template removed. Your text stays.', '已取消模板，內容保留。')) },

    // ---------- sending ----------
    submit() {
      const c = get().c, e = m.errs()
      for (let k = 1; k <= 3; k++) {
        if (!stepOk(k, e)) { m.setC({ step: k, tried: { ...c.tried, [k]: true } }, true); m.scrollToErr(); return }
      }
      if (unresolved(c).length) { m.openNumbers(); return }
      const ap = approval(c)
      if (ap.need) {
        const now = new Date(), schedD = c.sendMode === 'schedule' ? fromIso(c.schedAt) : null
        const reqId = 'MNP-' + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '-' + (1000 + Math.floor(Math.random() * 9000))
        m.setC({ result: { reqId, ap, when: fmtDT(now), sends: schedD ? niceDT(schedD) + ', if it’s approved by then' : 'As soon as it’s approved', total: m.recvTotal(), chs: selChs(c) }, dirty: false }, true)
        scrollTop()
        return
      }
      m.doSend()
    },
    emailOut() {
      const c = get().c
      if (!c.ch.email) return null
      return effEmailMode(c) === 'own' ? { mode: 'own' as const, subject: c.subject.trim(), html: cleanHtml(c.html), atts: c.atts.map(a => ({ name: a.name, size: a.size })) } : { mode: 'same' as const }
    },
    doSend() {
      const c = get().c, now = new Date(), rc = m.reach(), hasN = hasNotif(c)
      const schedD = c.sendMode === 'schedule' ? fromIso(c.schedAt) : null, em = m.emailOut()
      const channels = CH_ORDER.filter(k => k !== 'sms' && c.ch[k])
      const why: string[] = []
      if (c.ch.push) why.push('no registered device')
      if (c.ch.desktop) why.push('no desktop agent')
      const reason = why.length ? why.join(' and ').replace(/^./, x => x.toUpperCase()) : 'Not delivered' // stored in English; shown through tx()
      const base: Partial<Row> = {
        sender: c.sender.trim(), tpl: c.tplId, title: hasN ? c.title.trim() : (em as any).subject, content: hasN ? c.content.trim() : htmlToText((em as any).html),
        smsText: smsOn(c) ? c.smsText.trim() : '', channels, sms: smsOn(c), email: em,
        total: rc.total, ok: 0, aud: tagsToAud(c.receivers), fresh: Date.now(), _f: null, err: null, byCh: null,
        fw: rc.unr.map(p => p.id), fr: [[reason + (smsOn(c) ? ', and no phone number for SMS' : '')]],
        status: schedD ? 'scheduled' : 'progress', sched: schedD ? fmtDT(schedD) : null,
      }
      let id: string
      if (c.mode === 'edit' && c.editId) { id = c.editId; setApp(s => ({ rows: s.rows.map(r => r.id === id ? { ...r, ...base } as Row : r) })) }
      else { id = 'n' + (++seq); setApp(s => ({ rows: [{ id, creator: ME, created: fmtDT(now), ...base } as Row].concat(s.rows) })) }
      set({ view: 'list', cf: null, c: blankCompose(), page: 1, q: '', fS: [], fC: [] })
      scrollTop()
      if (schedD) { flash(L('Scheduled for ', '已排程：') + niceDT(schedD)); return }
      flash(L('Sending to ', '傳送給 ') + P(rc.total, 'receiver', '位收件人'), 'ok', chText(rowChs(base as Row)))
      const byCh: Partial<Record<Channel, [number, number]>> = {}
      if (c.ch.push) byCh.push = [rc.push, rc.people]
      if (c.ch.sms) byCh.sms = [rc.sms, rc.extP + (c.ch.push ? rc.noDev : 0)]
      if (c.ch.desktop) byCh.desktop = [rc.desktop, rc.people]
      if (c.ch.email) byCh.email = [rc.email, rc.total]
      setTimeout(() => patchRow(id, { ok: Math.round(rc.reachable * 0.55) }), 1400)
      setTimeout(() => patchRow(id, { status: 'sent', ok: rc.reachable, byCh }), 3000)
    },
    saveDraft() { m.setC({ savedAt: new Date(), dirty: false }, true); flash(L('Draft saved', '已存草稿')) },
    sendTest() {
      if (msgErr(m.errs())) { m.setC({ tried: { ...get().c.tried, 2: true } }, true); flash(L('Finish the message first', '請先完成訊息內容'), 'err'); return }
      const c = get().c, where: string[] = []
      if (c.ch.push) where.push(L('your phone', '你的手機'))
      if (c.ch.desktop) where.push(L('your PC', '你的電腦'))
      if (c.ch.email) where.push('gywu@' + DOMAIN)
      flash(L('Test sent', '已寄出測試'), 'ok', L('To ', '寄到') + joinL(where) + (smsOn(c) ? L('. SMS isn’t included.', '（不含 SMS）') : ''))
    },
    openSaveTpl() {
      if (msgErr(m.errs())) { m.setC({ tried: { ...get().c.tried, 2: true } }, true); flash(L('Finish the message first', '請先完成訊息內容'), 'err'); return }
      set({ stpl: { name: '', tried: false } })
    },
    saveTpl() {
      const s = get(), st = s.stpl!, name = st.name.trim(), c = s.c, templates = app().templates
      if (!name || name.length > LIM.name || templates.some(t => t.name.toLowerCase() === name.toLowerCase())) { set({ stpl: { ...st, tried: true } }); return }
      const hasN = hasNotif(c), em = m.emailOut()
      const t: Template = { id: 'tn' + (++seq), name, sender: c.sender.trim(), title: hasN ? c.title.trim() : '', content: hasN ? c.content.trim() : '', sms: smsOn(c) ? c.smsText.trim() : '', email: em && em.mode === 'own' ? { mode: 'own', subject: em.subject, html: em.html } : { mode: 'same' }, shared: [], updated: fmtDT(new Date()).slice(0, 10), owner: ME, fresh: Date.now() }
      setApp({ templates: [t].concat(templates) })
      set({ stpl: null })
      m.setC({ tplId: t.id }, true)
      flash(L('Template saved', '已存成模板'), 'ok', name)
    },
    saveGroup() {
      const s = get(), sg = s.sg!, name = sg.name.trim(), groups = app().groups
      if (!name || name.length > 50 || sg.desc.length > 200 || groups.some(g => g.name.toLowerCase() === name.toLowerCase())) { set({ sg: { ...sg, tried: true } }); return }
      const members = flatten(s.c.receivers, groups)
      const g = { id: 'gs' + (++seq), name, desc: sg.desc.trim(), count: members.length, updated: fmtDT(new Date()), creator: ME, role: 'Owner' as const, members, collabs: [{ pid: ME, role: 'Owner' }], fresh: Date.now() }
      setApp({ groups: [g as Group].concat(groups) })
      set({ sg: null })
      flash(L('Group saved', '已存成群組'), 'ok', name + ' · ' + P(g.count, 'member', '人'))
    },
    askRemoveAll() {
      set({ cf: { title: L('Remove all receivers?', '移除所有收件人？'), text: L('Channels and text stay the same.', '通道和內容不受影響。'), icon: Trash2, tone: 'warn', cancel: L('Keep', '保留'), ok: L('Remove all', '全部移除'), danger: true, run: () => { m.setC({ receivers: [], pick: {} }); set({ cf: null }) } } })
    },

    // ---------- batch import ----------
    openImport() { set({ imp: { text: '', file: '', res: null, picks: {} } }) },
    setImp(p: Partial<ImpState>) { set({ imp: { ...get().imp!, ...p } }) },
    identify() { m.setImp({ res: parseList(get().imp!.text, { allowExt: true, extWhy: '' }), picks: {} }) },
    impSets() {
      const s = get(), imp = s.imp!, have: Record<string, boolean> = {}, seen: Record<string, boolean> = {}
      const ready: { m: Match; tag: Tag }[] = [], amb: { m: Match & { kind: 'amb' }; i: number }[] = [], miss: (Match & { kind: 'miss' })[] = []
      let dup = 0
      s.c.receivers.forEach(t => { have[t.key] = true })
      ;(imp.res || []).forEach((x, i) => {
        if (x.kind === 'one' || x.kind === 'org' || x.kind === 'ext') {
          const tag: Tag = x.kind === 'one' ? { key: 'p:' + x.p.id, type: 'person', id: x.p.id } : x.kind === 'org' ? { key: 'o:' + x.org.code, type: 'org', id: x.org.code } : { key: 'e:' + x.email, type: 'ext', email: x.email }
          if (have[tag.key] || seen[tag.key]) { dup++; return }
          seen[tag.key] = true
          ready.push({ m: x, tag })
        } else if (x.kind === 'amb') amb.push({ m: x, i })
        else miss.push(x)
      })
      return { ready, amb, miss, dup, have, seen }
    },
    impPick(i: number, pid: string) {
      const picks = { ...get().imp!.picks }, cur = { ...(picks[i] || {}) }
      cur[pid] = !cur[pid]
      picks[i] = cur
      m.setImp({ picks })
    },
    impAdd() {
      const s = get(), imp = s.imp!, sets = m.impSets(), tags = sets.ready.map(x => x.tag)
      sets.amb.forEach(a => {
        const pk = imp.picks[a.i] || {}
        a.m.cands.forEach(p => { const key = 'p:' + p.id; if (pk[p.id] && !sets.have[key] && !sets.seen[key] && !tags.some(t => t.key === key)) tags.push({ key, type: 'person', id: p.id }) })
      })
      m.setC({ receivers: s.c.receivers.concat(tags) })
      set({ imp: null })
      flash(L('Added ', '已加入 ') + P(tags.length, 'receiver', '位收件人'))
    },
    onImpFile(f?: File) {
      if (!f) return
      const rd = new FileReader()
      rd.onload = () => m.setImp({ text: String(rd.result || ''), file: f.name, res: null })
      rd.onerror = () => flash(L('Can’t read that file. Use .csv or .txt.', '無法讀取檔案，請用 .csv 或 .txt。'), 'err')
      rd.readAsText(f)
    },
    tokenCount(text: string) { return splitTokens(text).length },
    over: (n: number) => n > CAP,
  }
  return m
}
