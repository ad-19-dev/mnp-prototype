// Example data for the design-spec page. Numbers follow the spec doc's examples so the screens and the
// written rules agree; people come from the prototype's directory.
import { PEOPLE, ROWS0, genPerson, type Channel, type Person, type Row, type Status } from '../lib/data'

// ---------- list ----------
// one row per case the list must show: scheduled, in progress, sent (all / some missing), failed;
// two rows were created by someone else in the same department (read-only for the viewer)
const pick = (id: string, patch: Partial<Row> = {}): Row => ({ ...ROWS0.find(r => r.id === id)!, ...patch })
export const LIST_ROWS: Row[] = [
  pick('m016', { status: 'progress', total: 412, ok: 268 }),
  pick('m018'),
  pick('m012', { status: 'sent', total: 96, ok: 93 }),
  pick('m014'),
  pick('m010'),
  pick('m009', { status: 'error', total: 45, ok: 0 }),
]
// the rows the viewer did not create (shown with a read-only row menu)
export const OTHERS = new Set(['m014', 'm010'])

// ---------- details ----------
export type Via = 'push' | 'desktop' | 'email' | 'sms' | 'none'
export interface ChanResult { k: Channel; of: number; ok: number; fail: number; pending?: number; fallback?: boolean; note: [string, string] }
export interface Recip { p: Person; via: Via; why?: [string, string] }
export interface Scenario {
  key: 'scheduled' | 'progress' | 'sentAll' | 'sentSome' | 'failed'
  label: [string, string]
  status: Status
  mine: boolean
  title: string
  sender: string
  creator: Person
  created: string
  sendAt: string | null
  total: number
  ok: number
  chans: ChanResult[]
  reasons: { why: [string, string]; n: number }[]
  recips: Recip[]
  err?: [string, string]
  updated?: string
}

const P = (i: number) => PEOPLE[i % PEOPLE.length]
const me = PEOPLE[0]

export const SCENARIOS: Scenario[] = [
  {
    key: 'scheduled', label: ['Scheduled', '已排程'], status: 'scheduled', mine: true,
    title: 'Power maintenance: F18 Phase 5, Sat 10/25', sender: 'F18 Facility', creator: me,
    created: '2026/10/20 16:12', sendAt: '2026/10/24 17:00', total: 412, ok: 0,
    chans: [], reasons: [], recips: [],
  },
  {
    key: 'progress', label: ['In progress', '傳送中'], status: 'progress', mine: true,
    title: 'Fire drill at 14:00 today: Fab 18 Phase 5', sender: 'F18 Facility', creator: me,
    created: '2026/10/19 10:05', sendAt: '2026/10/19 10:05', total: 412, ok: 268, updated: '10:07',
    chans: [
      { k: 'push', of: 412, ok: 262, fail: 9, pending: 141, note: ['Still sending', '還在傳送'] },
      { k: 'sms', of: 9, ok: 6, fail: 0, pending: 3, fallback: true, note: ['For people the push did not reach', '只送推播沒送達的人'] },
    ],
    reasons: [], recips: [
      { p: P(3), via: 'push' }, { p: P(7), via: 'sms' }, { p: P(11), via: 'push' },
    ],
  },
  {
    key: 'sentAll', label: ['Sent, all delivered', '已送出・全數送達'], status: 'sent', mine: false,
    title: 'Shift handover moves to 07:15 from 10/20', sender: 'F18 MFG3', creator: PEOPLE[23] || P(23),
    created: '2026/10/15 17:48', sendAt: '2026/10/15 17:48', total: 86, ok: 86,
    chans: [{ k: 'push', of: 86, ok: 86, fail: 0, note: ['', ''] }],
    reasons: [], recips: [{ p: P(4), via: 'push' }, { p: P(8), via: 'push' }, { p: P(12), via: 'push' }],
  },
  {
    key: 'sentSome', label: ['Sent, some not delivered', '已送出・部分未送達'], status: 'sent', mine: true,
    title: 'Typhoon alert: work from home on 10/17', sender: 'ESH Emergency', creator: me,
    created: '2026/10/16 18:20', sendAt: '2026/10/16 18:20', total: 96, ok: 93,
    chans: [
      { k: 'push', of: 96, ok: 90, fail: 6, note: ['6 people had no usable device and went to SMS', '6 人沒有可用裝置，轉 SMS 備援'] },
      { k: 'sms', of: 6, ok: 3, fail: 3, fallback: true, note: ['Only people the push did not reach', '只送推播沒送達的人'] },
    ],
    reasons: [
      { why: ['No registered device, and the SMS number is out of service', '沒有註冊裝置，SMS 號碼也已停用'], n: 2 },
      { why: ['No registered device, and no phone number for SMS', '沒有註冊裝置，也沒有電話可收 SMS'], n: 1 },
    ],
    recips: [
      { p: P(2), via: 'push' },
      { p: P(5), via: 'sms' },
      { p: P(9), via: 'none', why: ['No registered device, and the SMS number is out of service', '沒有註冊裝置，SMS 號碼也已停用'] },
      { p: P(14), via: 'push' },
    ],
  },
  {
    key: 'failed', label: ['Failed', '傳送失敗'], status: 'error', mine: true,
    title: 'Gas detection drill: ERT standby at 09:00', sender: 'F15 ESH', creator: me,
    created: '2026/10/15 08:12', sendAt: '2026/10/15 08:12', total: 45, ok: 0,
    err: ['The dispatch service timed out at 08:36. No one received this message; you can retry now.', '派送服務在 08:36 逾時，所有人都沒收到。可以現在重試。'],
    chans: [
      { k: 'push', of: 45, ok: 0, fail: 45, note: ['Not dispatched', '未發出'] },
      { k: 'sms', of: 45, ok: 0, fail: 45, fallback: true, note: ['Not dispatched', '未發出'] },
    ],
    reasons: [{ why: ['Not dispatched (MNP-5031)', '未發出（MNP-5031）'], n: 45 }],
    recips: [],
  },
]

// ---------- people a message didn't reach ----------
export interface Miss { p: Person; chans: Channel[]; why: [string, string]; sms: [string, string] }
const WHY: [string, string][] = [
  ['No registered device', '沒有註冊裝置'],
  ['Device unreachable for 72+ hours', '裝置超過 72 小時未連線'],
  ['Notifications turned off on the device', '裝置關閉了通知'],
]
const SMS: [string, string][] = [
  ['SMS: number not in service', 'SMS：號碼已停用'],
  ['SMS: no phone number on file', 'SMS：沒有電話號碼'],
  ['SMS: carrier rejected the message', 'SMS：電信商拒收'],
]
// a short list (the typhoon alert above: 3 people) and a long one (128 of 412)
export const MISS_FEW: Miss[] = [
  { p: P(9), chans: ['push', 'sms'], why: WHY[0], sms: SMS[0] },
  { p: P(17), chans: ['push', 'sms'], why: WHY[0], sms: SMS[0] },
  { p: P(21), chans: ['push', 'sms'], why: WHY[0], sms: SMS[1] },
]
export const MISS_MANY: Miss[] = Array.from({ length: 128 }, (_, i) => ({
  p: genPerson('spec-miss-' + i, 'F18/MFG3'), chans: ['push', 'sms'] as Channel[], why: WHY[i % 3], sms: SMS[i % 3],
}))
