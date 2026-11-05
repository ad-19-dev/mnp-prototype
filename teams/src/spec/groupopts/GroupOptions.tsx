// Design options: how the records of one message can read as a group in the one-record-per-channel list.
// Every option is the live list (same data and components as the prototype), only the grouping differs.
import * as React from 'react'
import { Tabs, TabsList, TabsTrigger } from '@qijenchen/design-system'
import { useLogic } from '../../lib/logic'
import { setLang, useApp } from '../../lib/store'
import { initSend, makeSendCtl } from '../../pages/messages/ctl'
import { SplitList, type GroupStyle } from '../../pages/messages/split'

const PROTO = 'https://claude.ai/artifact/Kq6FnvbagCvdtmoPXiRD91'

interface Opt { k: GroupStyle; name: string; title: string; how: string; good: string[]; watch: string[] }
const OPTS: Opt[] = [
  { k: 'none', name: '現況', title: '現況：每筆各自獨立', how: '目前 prototype 的樣子。同一則訊息的紀錄排在一起，但每列看起來都一樣。',
    good: ['最單純，每一列都是完整的一筆資料', '排序、篩選後的結果最直覺'],
    watch: ['看不出哪幾列是同一則訊息，只能靠標題和建立時間猜', '狀態、模板、時間在同一組裡重複好幾次'] },
  { k: 'merge', name: 'A 合併共用欄位', title: 'A · 合併共用欄位', how: '同一則訊息共用的欄位（狀態、模板、建立時間、排程時間、建立者）只在第一列出現，其他列留白；組內不畫分隔線，看起來像合併儲存格。',
    good: ['群組感很強，又不多佔一列', '重複的資訊消失，畫面最乾淨', '各通道自己的內容和送達人數仍然一列一列對得上'],
    watch: ['留白的列單獨看時資訊不完整，要往上看第一列', '如果狀態之後要改成「各通道各自的狀態」，就不能合併狀態欄'] },
  { k: 'divider', name: 'B 群組分隔線', title: 'B · 群組分隔線', how: '每一列都保留完整資料；同一則訊息的列之間不畫線，訊息和訊息之間畫一條較深的線。',
    good: ['改動最小，每一列仍然完整', '線的粗細就把群組分出來了'],
    watch: ['群組感比較弱，列多的時候容易看漏', '重複的狀態、時間還在'] },
  { k: 'band', name: 'C 交替底色', title: 'C · 交替底色', how: '每一則訊息輪流用白色與淺灰底色，同一則訊息的列底色相同；組內不畫線。',
    good: ['一眼就看得出哪幾列是一組，列再多也清楚', '每一列仍然完整'],
    watch: ['灰底容易被誤會成「選取」或「停用」', '只有一個通道的訊息也會被染色，底色沒有其他意義'] },
  { k: 'bracket', name: 'D 左側群組線', title: 'D · 左側群組線', how: '在最左側用一條藍色細線，把同一則訊息的列串起來；只有一個通道的訊息沒有線。組內不畫線。',
    good: ['群組感明確，又不影響表格內容', '只有一個通道時自然消失，不會多出雜訊'],
    watch: ['顏色線條是額外的視覺語言，需要寫進規格', '線要跟著固定的第一欄，橫向捲動時才不會消失'] },
  { k: 'header', name: 'E 訊息標題列', title: 'E · 訊息標題列', how: '有兩個以上通道的訊息，多一列淺灰的「訊息列」：標題、通道圖示、狀態、模板、時間，以及整則訊息的操作（編輯、刪除、重新排程）。通道紀錄縮排排在下面，只放各自的內容和送達人數。',
    good: ['群組最清楚，「整則訊息」和「單一通道」的資訊分得很乾淨', '編輯、刪除這類整則訊息的操作終於有自然的位置；通道列的選單只剩「查看詳情」'],
    watch: ['多通道的訊息多佔一列，一頁能看的訊息變少', '又多了一種列，表格的層級比較複雜'] },
  { k: 'fold', name: 'F 可收合群組', title: 'F · 可收合群組', how: '和 E 一樣有訊息列（只有一個通道的訊息不需要），但預設收合，只看得到訊息列（像以前一列一則訊息）；點左邊的箭頭展開，才看到各通道的紀錄與送達人數。',
    good: ['預設畫面最短，跟原本的一列一則很像', '要看各通道再展開，資訊不擠在一起'],
    watch: ['收合時看不到任何送達人數，要多點一下', '展開／收合的狀態要記住，換頁、篩選時行為要再定義'] },
]

function OptList({ k }: { k: GroupStyle }) {
  const [, m] = useLogic(initSend, makeSendCtl)
  return <SplitList m={m} group={k} />
}

const fromHash = (): GroupStyle => { const h = location.hash.slice(1) as GroupStyle; return OPTS.some(o => o.k === h) ? h : 'none' }

export default function GroupOptions() {
  const app = useApp()
  const [k, setK] = React.useState<GroupStyle>(fromHash)
  React.useEffect(() => { const f = () => setK(fromHash()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f) }, [])
  const go = (v: GroupStyle) => { setK(v); try { history.replaceState(null, '', '#' + v) } catch { /* sandboxed */ } }
  const o = OPTS.find(x => x.k === k)!
  return (
    <div className="flex min-h-screen flex-col">
      <div className="spec-top">
        <div className="spec-wrap flex flex-col gap-3 pt-3" style={{ maxWidth: 1720 }}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="spec-eyebrow">MNP · 一個通道一筆紀錄</span>
              <h1 className="spec-h1">同一則訊息的紀錄，怎麼看起來像一組</h1>
              <span className="text-caption text-fg-secondary">2026/11/05 · 每個方案都是可以操作的列表（排序、篩選、分頁、選單都能用），資料和 <a className="text-primary hover:underline" href={PROTO} target="_blank" rel="noreferrer">單一通道紀錄版 prototype</a>（需密碼）相同；詳情面板請到 prototype 看。</span>
            </div>
            <div className="flow-mode inline-flex overflow-hidden rounded-md border border-divider" role="group" aria-label="介面語言">
              {(['zh', 'en'] as const).map(l => <button key={l} type="button" aria-pressed={app.lang === l} onClick={() => setLang(l)} className={'px-3 py-1 text-body ' + (app.lang === l ? 'bg-foreground text-surface' : 'bg-surface text-fg-secondary')}>{l === 'zh' ? '中文' : 'EN'}</button>)}
            </div>
          </div>
          <Tabs value={k} onValueChange={v => go(v as GroupStyle)}>
            <TabsList overflow="scroll">{OPTS.map(x => <TabsTrigger key={x.k} value={x.k}>{x.name}</TabsTrigger>)}</TabsList>
          </Tabs>
        </div>
      </div>
      <main className="spec-wrap flex w-full flex-1 flex-col gap-5 py-6" style={{ maxWidth: 1720 }} key={k}>
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-1.5"><h2 className="spec-h2">{o.title}</h2><p className="spec-lead">{o.how}</p></div>
          <div className="flex flex-col gap-1.5 rounded-lg border border-divider bg-surface p-4"><b className="text-body font-medium text-success-text">優點</b><ul className="list-disc pl-5 text-body text-fg-secondary">{o.good.map(t => <li key={t}>{t}</li>)}</ul></div>
          <div className="flex flex-col gap-1.5 rounded-lg border border-divider bg-surface p-4"><b className="text-body font-medium text-warning-text">要注意</b><ul className="list-disc pl-5 text-body text-fg-secondary">{o.watch.map(t => <li key={t}>{t}</li>)}</ul></div>
        </section>
        <div className="h-[760px] overflow-hidden rounded-lg border border-divider bg-surface shadow-sm"><OptList k={k} /></div>
      </main>
    </div>
  )
}
