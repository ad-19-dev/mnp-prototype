// Two languages, chosen in the top bar. Strings are written in place as L('English', '中文'),
// so each sentence reads in context and both versions stay side by side.
import { getApp } from './store'
import { fmtN, pad, plural } from './data'

export type Lang = 'en' | 'zh'
export const isZh = () => getApp().lang === 'zh'
export const L = (en: string, zh: string) => (isZh() ? zh : en)

// Count + noun. English pluralises; Chinese keeps the measure word, e.g. P(3, 'audience', '位收件人')
export function P(n: number, en: string, zh: string, enMany?: string) {
  return isZh() ? fmtN(n) + ' ' + zh : plural(n, en, enMany)
}
// A list read as one phrase: "A, B and C" / 「A、B 和 C」
export function joinL(a: string[], orWord?: boolean) {
  if (a.length <= 1) return a[0] || ''
  if (isZh()) return a.slice(0, -1).join('、') + (orWord ? ' 或 ' : ' 和 ') + a[a.length - 1]
  return a.slice(0, -1).join(', ') + (orWord ? ' or ' : ' and ') + a[a.length - 1]
}

const WD_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WD_ZH = ['日', '一', '二', '三', '四', '五', '六']
const MO_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export function niceDT(d: Date) {
  const hm = pad(d.getHours()) + ':' + pad(d.getMinutes())
  if (isZh()) return (d.getMonth() + 1) + '/' + d.getDate() + '（' + WD_ZH[d.getDay()] + '）' + hm
  return WD_EN[d.getDay()] + ', ' + MO_EN[d.getMonth()] + ' ' + d.getDate() + ' at ' + hm
}

// System text that lives in the sample data (delivery reasons, match results)
const ZH: Record<string, string> = {
  'No registered device': '沒有註冊裝置',
  'Device unreachable for 72+ hours': '裝置超過 72 小時未連線',
  'Notifications turned off on the device': '裝置關閉了通知',
  'Desktop agent offline for 7+ days': '桌面程式超過 7 天未連線',
  'Desktop agent not installed': '沒有安裝桌面程式',
  'SMS fallback: number not in service': 'SMS 備援：號碼已停用',
  'SMS fallback: carrier rejected the message': 'SMS 備援：電信商拒收',
  'SMS fallback: no phone number on file': 'SMS 備援：沒有電話號碼',
  'Not dispatched (MNP-5031)': '未發出（MNP-5031）',
  'Not delivered (MNP-4102)': '未送達（MNP-4102）',
  'Not delivered': '未送達',
  'Recipient address rejected (550)': '收件地址被拒（550）',
  'No registered device, and no phone number for SMS': '沒有註冊裝置，也沒有電話可收 SMS',
  'No registered device and no desktop agent': '沒有註冊裝置，也沒有桌面程式',
  'No desktop agent': '沒有桌面程式',
  'The dispatch service timed out at 08:36.': '派送服務在 08:36 逾時。',
  'No one received this message. The platform team was alerted automatically, and you can retry now.': '所有人都沒收到。平台團隊已收到警示，你可以現在重試。',
  'The mail relay rejected this batch at 09:00 on Oct 10.': '郵件伺服器在 10/10 09:00 拒收這批信。',
  'No one received this email. Retry once the relay is back to normal.': '所有人都沒收到。等郵件伺服器恢復後再重試。',
  'Not dispatched (MNP-5107)': '未發出（MNP-5107）',
  'Not dispatched (MNP-5022)': '未發出（MNP-5022）',
  'Not delivered (MNP-4188)': '未送達（MNP-4188）',
  'Mailbox full (552)': '信箱已滿（552）',
  'The push gateway returned an authentication error at 14:31.': '推播閘道在 14:31 回傳驗證錯誤。',
  'Sending was interrupted by a platform restart at 09:41.': '平台在 09:41 重新啟動，中斷了傳送。',
  'No one received this message. You can retry now.': '所有人都沒收到。你可以現在重試。',
  'The mail relay stopped accepting this batch halfway at 09:12.': '郵件伺服器在 09:12 停止接收，這批信只寄出一半。',
  '290 people received the email; 270 didn’t. Retry sends it only to the people who didn’t get it.': '290 人收到，270 人沒收到。重試只會寄給沒收到的人。',
  'The SMS text includes a personal phone number. Remove it and submit again.': 'SMS 內容有個人電話號碼，請移除後重新送審。',
  // match results
  'Org code': '組織代碼', 'Email': 'Email', 'Employee ID': '工號', 'MVPN': 'MVPN', 'Company mobile': '公務手機',
  'Personal phone': '私人手機', 'Mobile number': '手機', 'NT account': 'NT 帳號', 'Name': '姓名',
  'External email': '外部 Email', 'External phone number': '外部電話',
  'Not a valid email address': 'Email 格式不對', 'No employee with this email': '找不到這個 Email 的員工',
  'No employee with this ID': '找不到這個工號', 'No one uses this MVPN': '沒有人用這個 MVPN',
  'No employee with this phone number': '找不到這支電話的員工', 'No match in the employee directory': '員工名錄找不到',
  'External addresses can’t be group members': '外部 Email 不能加入群組',
  'No org with this code': '找不到這個組織代碼', 'Not an NT account': '不是 NT 帳號格式', 'No employee with this NT account': '找不到這個 NT 帳號',
  'Not a 6-digit employee ID': '不是 6 碼工號', 'Not a 5-digit MVPN': '不是 5 碼 MVPN', 'Not a phone number': '不是電話號碼',
  'No employee with this name': '找不到這個姓名的員工',
}
export const tx = (s: string) => (isZh() && ZH[s]) || s
