// Send flow state and rules: receivers, reach per channel, approvals and validation.
import {
  CAP, CH_ORDER, LIM, ORGS, PMAP, SUPERVISOR, addMin, flatten, fromIso, fmtN, htmlToText, isExtPhone, joinList, plural,
  tplHasEmail, tplHasNotif, type Channel, type Group, type Person, type Tag, type Template,
} from './data'
import { L, P, joinL } from './i18n'

export interface Att { id: string; name: string; size: number }
export interface Compose {
  mode: 'new' | 'edit' | 'duplicate' | 'resend'
  editId: string | null
  step: number
  maxStep: number
  receivers: Tag[]
  pick: Record<string, 'co' | 'pp'>
  ch: Record<Channel, boolean>
  tplId: string | null
  sender: string; title: string; content: string; smsText: string
  emailMode: 'same' | 'own'; subject: string; html: string; bodyText: string; htmlKey: number
  atts: Att[]; attErr: string
  sendMode: 'now' | 'schedule'; schedAt: string
  tried: Record<number, boolean>
  dirty: boolean
  result: null | { reqId: string; ap: Approval; when: string; sends: string; total: number; chs: Channel[] }
}
export interface Approval { icsd: boolean; mgr: boolean; ext: number; need: boolean; who: string[] }

export function blankCompose(): Compose {
  return {
    mode: 'new', editId: null, step: 1, maxStep: 1,
    receivers: [], pick: {},
    ch: { push: false, desktop: false, email: false, sms: false },
    tplId: null, sender: '', title: '', content: '', smsText: '',
    emailMode: 'same', subject: '', html: '', bodyText: '', htmlKey: 0, atts: [], attErr: '',
    sendMode: 'now', schedAt: '', tried: {}, dirty: false, result: null,
  }
}

export const hasNotif = (c: Compose) => !!(c.ch.push || c.ch.desktop)
// SMS reaches employees only as a fallback when the device notification can't
export const smsOn = (c: Compose) => !!(c.ch.push && c.ch.sms)
export const effEmailMode = (c: Compose) => c.ch.email ? (hasNotif(c) ? c.emailMode : 'own') : null
export const selChs = (c: Compose) => CH_ORDER.filter(k => c.ch[k])

export function recvCount(t: Tag, groups: Group[]) {
  if (t.type === 'person' || t.type === 'ext') return 1
  if (t.type === 'group') { const g = groups.find(x => x.id === t.id); return g ? g.count : 0 }
  const o = ORGS.find(x => x.code === t.id)
  return o ? o.count : 0
}

export function recvFlat(c: Compose, groups: Group[]) {
  const internal = c.receivers.filter(t => t.type !== 'ext')
  const all = flatten(internal, groups).map(x => PMAP[x.pid]).filter(Boolean)
  const ext = c.receivers.filter(t => t.type === 'ext').map(t => t.email as string)
  // contractors saved inside audience groups count as external receivers
  all.forEach(p => { if (p.extKind && ext.indexOf(p.value!) < 0) ext.push(p.value!) })
  return { people: all.filter(p => !p.extKind), ext }
}

export type Reach = ReturnType<typeof reach>
// who each selected channel can reach, worked out from the expanded receiver list
export function reach(c: Compose, groups: Group[]) {
  const f = recvFlat(c, groups), P = f.people
  const extE = f.ext.filter(x => x.indexOf('@') >= 0).length, extP = f.ext.length - extE
  const phone = (p: Person) => !!(p.co || p.pp), fb = !!(c.ch.sms && c.ch.push)
  const ok = (p: Person) => (c.ch.push && (p.dev || (fb && phone(p)))) || (c.ch.desktop && p.desk) || c.ch.email
  const unr = P.filter(p => !ok(p)), unrE = c.ch.email ? 0 : extE, unrP = c.ch.sms ? 0 : extP
  const noDev = P.filter(p => !p.dev), smsable = noDev.filter(phone).length, total = P.length + f.ext.length, unrN = unr.length + unrE + unrP
  return {
    flat: f, total, people: P.length, ext: f.ext.length, extE, extP,
    push: P.length - noDev.length, desktop: P.filter(p => p.desk).length, email: P.length + extE, sms: extP + (c.ch.push ? smsable : 0),
    noDev: noDev.length, smsable, unr, unrE, unrP, unrExt: unrE + unrP, unrN, reachable: total - unrN,
    viaEmail: c.ch.email ? 0 : unr.length + unrE,
    viaSms: c.ch.sms ? 0 : unrP + (c.ch.push ? unr.filter(p => !p.dev && phone(p)).length : 0),
  }
}

// ICSD reviews every SMS; your supervisor approves anything going outside the company
export function approval(c: Compose): Approval {
  const icsd = !!c.ch.sms
  const ext = c.receivers.filter(t => t.type === 'ext' && (isExtPhone(t) ? c.ch.sms : c.ch.email)).length, mgr = ext > 0
  const who: string[] = []
  if (mgr) who.push(L('your supervisor', '你的主管'))
  if (icsd) who.push('ICSD')
  return { icsd, mgr, ext, need: icsd || mgr, who }
}

export function peopleTags(c: Compose) { return c.receivers.filter(t => t.type === 'person').map(t => PMAP[t.id!]).filter(Boolean) }
export function multiPeople(c: Compose) { return smsOn(c) ? peopleTags(c).filter(p => p.co && p.pp) : [] }
export function unresolved(c: Compose) { return multiPeople(c).filter(p => !c.pick['p:' + p.id]) }
export function noNumber(c: Compose) { return smsOn(c) ? peopleTags(c).filter(p => !p.co && !p.pp) : [] }

export type Errs = Partial<Record<'recv' | 'ch' | 'ext' | 'extp' | 'sender' | 'title' | 'content' | 'sms' | 'subject' | 'body' | 'sched', string>>
export function errs(c: Compose, groups: Group[]): Errs {
  const e: Errs = {}, lim = LIM.push, total = recvFlat(c, groups)
  const totalN = total.people.length + total.ext.length
  const tooLong = (n: number) => L('Up to ' + fmtN(n) + ' characters.', '最多 ' + fmtN(n) + ' 字。')
  // 1. Receivers and channels
  if (!c.receivers.length) e.recv = L('Add at least one audience.', '請加入至少一位收件人。')
  else if (totalN > CAP) e.recv = L('Over the ' + CAP + '-audience limit.', '超過 ' + CAP + ' 人上限。')
  const extP = c.receivers.filter(t => isExtPhone(t)).length, extE = c.receivers.filter(t => t.type === 'ext').length - extP
  if (!c.ch.push && !c.ch.desktop && !c.ch.email) e.ch = L('Pick at least one channel.', '請選擇至少一個通道。')
  if (extE && !c.ch.email) e.ext = L(P(extE, 'external email', '', 'external emails') + ' can only get Email. Turn on Email or remove ' + (extE === 1 ? 'it' : 'them') + '.', extE + ' 個外部 Email 只能收 Email。請開啟 Email，或移除它們。')
  if (extP && !c.ch.sms) e.extp = L(P(extP, 'external phone', '', 'external phones') + ' can only get SMS. Turn on SMS fallback or remove ' + (extP === 1 ? 'it' : 'them') + '.', extP + ' 支外部電話只能收 SMS。請開啟 SMS 備援，或移除它們。')
  // 2. Message
  // the sender name only shows on Device Notifications
  if (c.ch.push && c.sender.length > LIM.sender) e.sender = tooLong(LIM.sender)
  if (hasNotif(c)) {
    if (!c.title.trim()) e.title = L('Enter a title.', '請輸入標題。')
    else if (c.title.length > LIM.title) e.title = tooLong(LIM.title)
    if (!c.content.trim()) e.content = L('Enter the text.', '請輸入內文。')
    else if (c.content.length > lim) e.content = tooLong(lim)
  }
  if (smsOn(c)) {
    if (!c.smsText.trim()) e.sms = L('Enter the SMS text.', '請輸入 SMS 內容。')
    else if (c.smsText.length > LIM.sms) e.sms = tooLong(LIM.sms)
  }
  if (effEmailMode(c) === 'own') {
    if (!c.subject.trim()) e.subject = L('Enter a subject.', '請輸入主旨。')
    else if (c.subject.length > LIM.subject) e.subject = tooLong(LIM.subject)
    const n = c.bodyText.trim().length
    if (!n) e.body = L('Write the email.', '請輸入 Email 內文。')
    else if (n > LIM.body) e.body = tooLong(LIM.body)
  }
  // 3. Schedule
  if (c.sendMode === 'schedule') {
    const d = fromIso(c.schedAt), now = new Date()
    if (!d) e.sched = L('Pick a date and time.', '請選擇日期和時間。')
    else if (d < addMin(now, 10)) e.sched = L('Pick a time at least 10 minutes from now.', '請選 10 分鐘以後的時間。')
    else if (d > addMin(now, 30 * 24 * 60)) e.sched = L('Pick a time within 30 days.', '最多只能排 30 天內。')
  }
  return e
}
export function stepOk(n: number, e: Errs) {
  if (n === 1) return !e.recv && !e.ch && !e.ext && !e.extp
  if (n === 2) return !e.sender && !e.title && !e.content && !e.sms && !e.subject && !e.body
  return !e.sched
}
export const msgErr = (e: Errs) => e.sender || e.title || e.content || e.sms || e.subject || e.body

// which parts of the message a template fills, given the channels picked
export function tplFit(c: Compose, t: Template) {
  const fills: string[] = [], gaps: string[] = []
  const notif = L('notification', '通知'), smsW = 'SMS', emailW = 'Email'
  if (hasNotif(c)) (tplHasNotif(t) ? fills : gaps).push(notif)
  if (smsOn(c)) ((t.sms || '').trim() ? fills : gaps).push(smsW)
  if (c.ch.email) {
    if (tplHasEmail(t)) fills.push(emailW)
    else if (!tplHasNotif(t)) gaps.push(emailW)
  }
  const text = fills.length
    ? L('Fills ', '會填入') + joinL(fills) + (gaps.length ? L('. You’ll write the ' + joinL(gaps) + '.', '；' + joinL(gaps) + '要自己寫') : '')
    : L('No text for your channels', '沒有你選的通道的內容')
  return { text, warn: gaps.some(g => g !== smsW) }
}

export function seedEmail(c: Compose, subject: string, h: string) {
  return { subject: subject || '', html: h, bodyText: htmlToText(h), htmlKey: (c.htmlKey || 0) + 1 }
}

export function smsCoverText(rc: Reach) {
  const miss = rc.noDev - rc.smsable
  const parts: string[] = []
  if (rc.smsable) parts.push(L('Reaches ' + P(rc.smsable, 'person', '', 'people') + ' without the app', '可送到 ' + rc.smsable + ' 位沒裝 App 的人'))
  if (rc.extP) parts.push(L(P(rc.extP, 'external phone', '', 'external phones'), rc.extP + ' 支外部電話'))
  let t = parts.length ? ' ' + parts.join(L(' and ', '和')) + L('.', '。') : ''
  if (miss) t += L(' ' + P(miss, 'person has', '', 'people have') + ' no phone number.', miss + ' 人沒有電話。')
  return t
}
export function reachNote(k: Channel, rc: Reach, c: Compose) {
  if (k === 'email') return rc.extP ? L('External phones can’t get it', '外部電話收不到') : L('Everyone has a mailbox', '每個人都有信箱')
  if (k === 'sms') return ''
  const miss = k === 'push' ? rc.noDev : rc.people - rc.desktop, parts: string[] = []
  if (miss) parts.push(k === 'push' ? L(P(miss, 'person', '', 'people') + ' without a device', miss + ' 人沒有裝置') : L(P(miss, 'person', '', 'people') + ' without the agent', miss + ' 人沒裝桌面程式'))
  if (rc.ext) parts.push(L(P(rc.ext, 'external audience', '', 'external audiences') + ' can’t get it', rc.ext + ' 位外部收件人收不到'))
  return parts.length ? parts.join(L('; ', '；')) : L('Everyone can get it', '每個人都收得到')
}
