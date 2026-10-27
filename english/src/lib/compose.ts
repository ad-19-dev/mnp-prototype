// Send flow state and rules: receivers, reach per channel, approvals and validation.
import {
  CAP, CH_ORDER, LIM, ORGS, PMAP, SUPERVISOR, addMin, flatten, fromIso, fmtN, htmlToText, isExtPhone, joinList, plural,
  tplHasEmail, tplHasNotif, type Channel, type Group, type Person, type Tag, type Template,
} from './data'

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
  savedAt: Date | null
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
    sendMode: 'now', schedAt: '', tried: {}, savedAt: null, dirty: false, result: null,
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
  if (mgr) who.push('your supervisor, ' + SUPERVISOR)
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
  // 1. Receivers and channels
  if (!c.receivers.length) e.recv = 'Add at least one receiver.'
  else if (totalN > CAP) e.recv = 'You’re over the ' + CAP + '-receiver limit.'
  const extP = c.receivers.filter(t => isExtPhone(t)).length, extE = c.receivers.filter(t => t.type === 'ext').length - extP
  if (!c.ch.push && !c.ch.desktop && !c.ch.email) e.ch = 'Choose at least one channel.'
  if (extE && !c.ch.email) e.ext = plural(extE, 'external email address', 'external email addresses') + ' can only get Email. Add Email, or remove ' + (extE === 1 ? 'it' : 'them') + '.'
  if (extP && !c.ch.sms) e.extp = plural(extP, 'external phone number', 'external phone numbers') + ' can only get SMS. Turn on Device notification with SMS fallback, or remove ' + (extP === 1 ? 'it' : 'them') + '.'
  // 2. Message
  if (!c.sender.trim()) e.sender = 'Enter a sender name.'
  else if (c.sender.length > LIM.sender) e.sender = 'Sender name can be up to ' + LIM.sender + ' characters.'
  if (hasNotif(c)) {
    if (!c.title.trim()) e.title = 'Enter a title.'
    else if (c.title.length > LIM.title) e.title = 'Title can be up to ' + LIM.title + ' characters.'
    if (!c.content.trim()) e.content = 'Enter the notification text.'
    else if (c.content.length > lim) e.content = 'Notification text can be up to ' + lim + ' characters' + (c.ch.desktop ? ', because Desktop OS shows less.' : '.')
  }
  if (smsOn(c)) {
    if (!c.smsText.trim()) e.sms = 'Enter the SMS text.'
    else if (c.smsText.length > LIM.sms) e.sms = 'SMS text can be up to ' + LIM.sms + ' characters.'
  }
  if (effEmailMode(c) === 'own') {
    if (!c.subject.trim()) e.subject = 'Enter a subject.'
    else if (c.subject.length > LIM.subject) e.subject = 'Subject can be up to ' + LIM.subject + ' characters.'
    const n = c.bodyText.trim().length
    if (!n) e.body = 'Write the email.'
    else if (n > LIM.body) e.body = 'The email can be up to ' + fmtN(LIM.body) + ' characters.'
  }
  // 3. Schedule
  if (c.sendMode === 'schedule') {
    const d = fromIso(c.schedAt), now = new Date()
    if (!d) e.sched = 'Pick a date and time.'
    else if (d < addMin(now, 10)) e.sched = 'Pick a time at least 10 minutes from now.'
    else if (d > addMin(now, 30 * 24 * 60)) e.sched = 'You can schedule up to 30 days ahead.'
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
  if (hasNotif(c)) (tplHasNotif(t) ? fills : gaps).push('notification text')
  if (smsOn(c)) ((t.sms || '').trim() ? fills : gaps).push('SMS text')
  if (c.ch.email) {
    if (tplHasEmail(t)) fills.push('email')
    else if (!tplHasNotif(t)) gaps.push('email')
  }
  let text = fills.length ? 'Fills the ' + joinList(fills) : 'Has no text for the channels you picked'
  if (gaps.length && fills.length) text += '. No ' + joinList(gaps, 'or') + ', so you’ll write that yourself'
  if (c.ch.email && !tplHasEmail(t) && tplHasNotif(t)) text += (hasNotif(c) ? '. Email uses the notification text' : '. The email starts from its notification text')
  return { text: text + '.', warn: gaps.some(g => g !== 'SMS text') }
}

export function seedEmail(c: Compose, subject: string, h: string) {
  return { subject: subject || '', html: h, bodyText: htmlToText(h), htmlKey: (c.htmlKey || 0) + 1 }
}

export function smsCoverText(rc: Reach) {
  const got: string[] = []
  if (rc.smsable) got.push(rc.smsable === rc.noDev ? plural(rc.noDev, 'employee', 'employees') + ' without the app' : fmtN(rc.smsable) + ' of the ' + plural(rc.noDev, 'employee', 'employees') + ' without the app')
  if (rc.extP) got.push(plural(rc.extP, 'external phone number', 'external phone numbers'))
  const miss = rc.noDev - rc.smsable
  let t = got.length ? ' It reaches ' + got.join(' and ') + '.' : ''
  if (miss) t += ' ' + (miss === 1 ? '1 employee without the app has' : fmtN(miss) + ' employees without the app have') + ' no phone number on file, so SMS can’t reach them.'
  return t
}
export function reachNote(k: Channel, rc: Reach, c: Compose) {
  if (k === 'email') return rc.extE ? 'Everyone, including ' + plural(rc.extE, 'external email', 'external emails') : rc.extP ? 'Every employee. External phone numbers can’t get it' : 'Every employee has a company mailbox'
  if (k === 'sms') {
    const parts: string[] = []
    if (rc.extP) parts.push(plural(rc.extP, 'external number', 'external numbers'))
    parts.push(c.ch.push ? (rc.noDev ? 'up to ' + fmtN(rc.smsable) + ' of the ' + plural(rc.noDev, 'employee', 'employees') + ' without the app, as a fallback' : 'employees only if the device notification fails') : 'employees only as a fallback to Device notification')
    return parts.join(', and ').replace(/^./, x => x.toUpperCase())
  }
  const miss = k === 'push' ? rc.noDev : rc.people - rc.desktop, parts: string[] = []
  if (miss) parts.push(plural(miss, 'person has', 'people have') + ' ' + (k === 'push' ? 'no registered device' : 'no desktop agent'))
  if (rc.ext) parts.push(plural(rc.ext, 'external receiver', 'external receivers') + ' can’t get it')
  return parts.length ? parts.join('; ') : (k === 'push' ? 'Everyone has a registered device' : 'Everyone has the desktop agent')
}
