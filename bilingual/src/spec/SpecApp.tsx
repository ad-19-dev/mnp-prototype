// Design spec for the message log (Messages page): one page, a tab per screen, routed on the URL hash.
import * as React from 'react'
import { SegmentedControl, SegmentedControlItem, Tabs, TabsList, TabsTrigger, Tag } from '@qijenchen/design-system'
import { setLang, useApp } from '../lib/store'
import { StatusTag, ChIcons } from '../components/ui'
import { fmtN } from '../lib/data'
import { Section, SpecTable } from './parts'
import { DeliveredCell } from './mocks'
import { LIST_ROWS } from './specData'
import { DetailTab, FailedTab, FlowTab, ListTab } from './screens'

const DOC = 'https://claude.ai/artifact/1Jr75RVdRT2ZJuC3xW9gRt'
const PROTO = 'https://claude.ai/artifact/QwiqnwmVSsZWpNSdb5Jnpq'
const TABS = [
  ['overview', '總覽'], ['status', '狀態呈現'], ['list', '訊息列表'], ['detail', '單筆詳情'],
  ['failed', '未成功名單'], ['flow', '互動流程'], ['edge', '邊界情境'],
] as const
type TabKey = typeof TABS[number][0]
const isTab = (h: string): h is TabKey => TABS.some(t => t[0] === h)

export default function SpecApp() {
  const app = useApp()
  const [tab, setTab] = React.useState<TabKey>(() => { const h = location.hash.slice(1); return isTab(h) ? h : 'overview' })
  React.useEffect(() => {
    const on = () => { const h = location.hash.slice(1); if (isTab(h)) setTab(h) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const go = (k: TabKey) => { setTab(k); try { history.replaceState(null, '', '#' + k) } catch { /* sandboxed */ } window.scrollTo(0, 0) }
  return (
    <>
      <div className="spec-top">
        <div className="spec-wrap flex flex-col gap-2 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="spec-eyebrow">MNP · Messages</span>
              <h1 className="spec-h1">訊息發送紀錄設計規格</h1>
              <span className="text-caption text-fg-secondary">
                2026/10/28 · 搭配文件 <a className="text-primary hover:underline" href={DOC} target="_blank" rel="noreferrer">訊息發送紀錄設計規格</a> 閱讀 · 完整流程見 <a className="text-primary hover:underline" href={PROTO} target="_blank" rel="noreferrer">MNP prototype</a>（需密碼）
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-caption text-fg-secondary">畫面語言</span>
              <SegmentedControl size="sm" value={app.lang} onValueChange={v => { if (!v) return; setLang(v as 'en' | 'zh'); try { localStorage.setItem('mnp-spec-lang', v) } catch { /* storage blocked */ } }} aria-label="畫面語言">
                <SegmentedControlItem value="zh">中文</SegmentedControlItem>
                <SegmentedControlItem value="en">EN</SegmentedControlItem>
              </SegmentedControl>
            </div>
          </div>
          <Tabs value={tab} onValueChange={v => go(v as TabKey)}>
            <TabsList overflow="scroll">
              {TABS.map(([k, t]) => <TabsTrigger key={k} value={k}>{t}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        </div>
      </div>
      <main className="spec-wrap spec-main" key={tab + app.lang}>
        {tab === 'overview' ? <Overview go={go} /> : null}
        {tab === 'status' ? <StatusTab /> : null}
        {tab === 'list' ? <ListTab /> : null}
        {tab === 'detail' ? <DetailTab /> : null}
        {tab === 'failed' ? <FailedTab /> : null}
        {tab === 'flow' ? <FlowTab /> : null}
        {tab === 'edge' ? <EdgeTab /> : null}
      </main>
    </>
  )
}

// ---------- overview ----------
function Overview({ go }: { go: (k: TabKey) => void }) {
  const cards: [TabKey, string, string][] = [
    ['status', '狀態呈現', '四種狀態在列表上的標籤與「已送達」欄，所有畫面共用'],
    ['list', '訊息列表', '預設、篩選中、篩選無結果、還沒有訊息、載入中、載入失敗，加上列選單'],
    ['detail', '單筆詳情', '右側面板，五種狀態各一版，含各通道結果與「經 SMS 送達」'],
    ['failed', '未成功名單', '對話框：少量與大量兩版，以及補發入口'],
    ['flow', '互動流程', '從列表點「n 人未送達」到用名單發新訊息，可以實際點'],
    ['edge', '邊界情境', 'PRD 的三條加上八個畫面上會碰到的情況'],
  ]
  return (
    <>
      <Section eyebrow="Scope" title="這份規格涵蓋的畫面" lead="三個主畫面加一份狀態規格。每個畫面都用正式的 design system 元件畫成，紅色數字對應旁邊的說明。">
        <div className="spec-cards">
          {cards.map(([k, t, d]) => <button key={k} type="button" className="spec-card" onClick={() => go(k)}><b>{t}</b><span>{d}</span></button>)}
        </div>
      </Section>
      <Section eyebrow="States" title="一則訊息的狀態怎麼變" lead="只要還有一個勾選的通道（含 SMS 備援）在送，就是傳送中。全部完成後，看有沒有人送達決定 Sent 或 Failed。">
        <div className="spec-flow" role="img" aria-label="已排程到傳送中，再到已送出或傳送失敗；傳送失敗可重試回到傳送中">
          <div className="node"><StatusTag s="scheduled" /><span>建立時選了未來時間</span></div>
          <span className="arrow" aria-hidden>→</span>
          <div className="node"><StatusTag s="progress" /><span>到排程時間或立即傳送；任一通道還在送就維持</span></div>
          <span className="arrow" aria-hidden>→</span>
          <div className="ends">
            <div className="node"><StatusTag s="sent" /><span>所有通道完成，至少一人送達；有人沒收到時加黃色人數</span></div>
            <div className="node"><StatusTag s="error" /><span>所有通道完成卻沒有人送達，或系統錯誤；可重試回到傳送中</span></div>
          </div>
        </div>
      </Section>
      <Section eyebrow="Decide first" title="會議上要先決定的三件事" lead="這三題會改變列表與詳情的核心呈現，畫面上用的是建議做法。">
        <SpecTable head={['問題', '建議', '影響的畫面']} rows={[
          ['部分失敗算什麼狀態？', '至少一人送達就是 Sent，再用黃色「n 人未送達」提醒；Failed 只用在沒有人收到。', '狀態呈現、列表、詳情'],
          ['「已送達」量的是什麼？', '需工程確認：推播服務或郵件伺服器收下，還是裝置確實收到。後者會延遲，畫面要加「更新於」。', '列表、詳情'],
          ['勾了多個通道時，一個人怎樣算送達？', '任一通道收到就算一人送達；各通道的人數放在詳情。缺點見邊界情境第 1 條。', '列表、詳情、未成功名單'],
        ]} />
      </Section>
    </>
  )
}

// ---------- status ----------
function StatusTab() {
  const ex = (id: string) => LIST_ROWS.find(r => r.id === id)!
  return (
    <>
      <Section eyebrow="Component" title="狀態呈現" lead="列表的「狀態」與「已送達」兩欄一起看。進度條只在傳送中出現，黃色未送達人數只在送完之後出現，兩者不會同時出現。">
        <SpecTable head={['狀態', '狀態欄', '已送達欄', '何時出現', '規則']} rows={[
          ['Scheduled 已排程', <StatusTag s="scheduled" />, <DeliveredCell r={ex('m018')} />, '建立時選了未來時間', '還沒開始，不顯示進度'],
          ['In progress 傳送中', <StatusTag s="progress" />, <DeliveredCell r={ex('m016')} />, '開始派送，到所有通道完成', '進度條 = 已送達 ÷ 總人數；還沒輪到的人不算未送達'],
          ['Sent 已送出（全數）', <StatusTag s="sent" />, <DeliveredCell r={ex('m010')} />, '所有通道完成，全部送達', '只有數字'],
          ['Sent 已送出（部分）', <StatusTag s="sent" />, <DeliveredCell r={ex('m012')} />, '所有通道完成，有人沒收到', '黃色連結開啟未成功名單'],
          ['Failed 傳送失敗', <StatusTag s="error" />, <DeliveredCell r={ex('m009')} />, '沒有人收到，或系統錯誤', '同上；詳情另有錯誤說明與重試'],
        ]} />
      </Section>
      <Section eyebrow="Tokens" title="元件與顏色" lead="全部用 design system 現有元件，沒有新元件。">
        <SpecTable head={['元素', '元件', '設定']} rows={[
          ['狀態標籤', <code>Tag</code>, <>size <code>sm</code>；Scheduled <code>neutral</code>＋日曆、In progress <code>blue</code>＋紙飛機、Sent <code>green</code>＋勾、Failed <code>red</code>＋警示</>],
          ['通道標籤', <code>Tag</code>, <>size <code>sm</code>，只有圖示；SMS 備援 <code>amber</code>，其他 <code>neutral</code>；滑鼠移上顯示通道名稱</>],
          ['傳送進度', <code>ProgressBar</code>, <>status <code>inProgress</code>，只在傳送中出現</>],
          ['n 人未送達', <code>Button</code>, <>variant <code>link</code> size <code>xs</code>＋<code>CircleAlert</code>；文字色 <code>warning-text</code>，滑鼠移上加底線</>],
          ['數字', '—', <>「已送達」粗體、「/ 總人數」次要色；數字用等寬數字</>],
        ]} />
      </Section>
    </>
  )
}

// ---------- edge cases ----------
function EdgeTab() {
  const prd = <Tag size="sm" color="blue">PRD</Tag>
  const line = (a: React.ReactNode, b: React.ReactNode) => <span className="flex items-center justify-between gap-3 text-body"><span>{a}</span><span className="tabular-nums text-fg-secondary">{b}</span></span>
  return (
    <Section eyebrow="Edge cases" title="邊界情境" lead="標了 PRD 的三條來自需求文件，其餘是畫畫面時一定會碰到、PRD 還沒寫的情況。最右欄是畫面上的樣子。">
      <SpecTable head={['情境', '規則', '畫面']} rows={[
        [<span className="flex flex-col items-start gap-1">{prd}Device Notifications 還在送，Email 已送完</span>, '所有通道完成前維持傳送中。注意：以「任一通道」計算時，Email 送完那一刻已送達就是 292 / 292，進度條會是滿的。',
          <span className="flex w-80 flex-col gap-1.5"><StatusTag s="progress" />{line('Email', '292 / 292 完成')}{line('Device Notifications', '241 / 292 傳送中')}</span>],
        [<span className="flex flex-col items-start gap-1">{prd}推播失敗、SMS 備援成功</span>, '這個人算已送達', <Tag size="sm" color="amber" unbounded>經 SMS 送達</Tag>],
        [<span className="flex flex-col items-start gap-1">{prd}可以看到哪些訊息</span>, '自己建立的＋同部門／同發送單位的；別人的只能看', <span className="text-body text-fg-secondary">列選單只有查看、複製</span>],
        ['推播與 SMS 備援都失敗', '算未送達，兩個原因都列出', <span className="flex flex-col gap-1"><Tag size="sm" color="red" unbounded>未送達</Tag><span className="text-caption text-fg-secondary">沒有註冊裝置，SMS 號碼也已停用</span></span>],
        ['大部分送達，少數人沒收到', 'Sent＋未送達人數（待確認）', <DeliveredCell r={LIST_ROWS.find(r => r.id === 'm012')!} />],
        ['系統錯誤，沒有人收到', 'Failed，詳情有錯誤說明與重試', <span className="flex items-center gap-2"><StatusTag s="error" /><span className="text-body tabular-nums">0 / 45</span></span>],
        ['已送出後才收到 Email 退信', '未送達人數增加，狀態不變', <span className="text-body">93 → 92 / 96 <span className="text-fg-secondary">· 更新於 10:07</span></span>],
        ['同一人在兩個收件群組', '只算一人，只收一次', <span className="text-body text-fg-secondary">總人數為去重後的人數</span>],
        ['外部電話或外部 Email', '只能走 SMS 或 Email', <ChIcons list={['sms', 'email']} />],
        ['排程訊息需 ICSD 核准但還沒核准', '待確認', <span className="flex items-center gap-2"><StatusTag s="scheduled" /><Tag size="sm" color="amber" unbounded>待核准</Tag></span>],
        ['建立者調部門或離職', '待確認：訊息是否仍對原部門可見', <span className="text-body text-fg-secondary">—</span>],
        ['沒送達的人很多', '名單對話框內的表格捲動顯示全部，可搜尋與依原因篩選', <span className="text-body">{fmtN(128)} 人全部列出</span>],
      ]} />
    </Section>
  )
}
