// UI flow and design spec of the one-record-per-channel version of the messages list and details
// (teams build with `--mode split`). One page, a tab per part, routed on the URL hash. Screens are screenshots of
// that prototype (tools/split-shots.mjs) with measured pins.
import * as React from 'react'
import { Tabs, TabsList, TabsTrigger } from '@qijenchen/design-system'
import { StatusTag } from '../../components/ui'
import { C, Copy, Figure, Notes, Section, Shot, SpecTable } from '../parts'

const PROTO = 'https://claude.ai/artifact/Kq6FnvbagCvdtmoPXiRD91'
const TABS = [['flow', 'UI Flow'], ['send', '發送流程'], ['overview', '總覽'], ['list', '列表'], ['rules', '狀態與合併規則'], ['status', '各狀態的列與面板'], ['detail', '訊息詳情面板'], ['blocks', '面板區塊規格'], ['actions', '列選單'], ['modals', '對話框規格'], ['data', '範例資料']] as const
type TabKey = typeof TABS[number][0]
const isTab = (h: string): h is TabKey => TABS.some(t => t[0] === h)

export default function SplitSpec() {
  const [tab, setTab] = React.useState<TabKey>(() => { const h = location.hash.slice(1); return isTab(h) ? h : 'flow' })
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
          <div className="flex min-w-0 flex-col gap-1">
            <span className="spec-eyebrow">MNP · 訊息紀錄 · 一個通道一筆</span>
            <h1 className="spec-h1">單一通道紀錄：UI Flow 與設計規格</h1>
            <span className="text-caption text-fg-secondary">2026/11/07 · 畫面取自 <a className="text-primary hover:underline" href={PROTO} target="_blank" rel="noreferrer">單一通道紀錄版 prototype</a>（需密碼）。</span>
          </div>
          <Tabs value={tab} onValueChange={v => go(v as TabKey)}>
            <TabsList overflow="scroll">{TABS.map(([k, t]) => <TabsTrigger key={k} value={k}>{t}</TabsTrigger>)}</TabsList>
          </Tabs>
        </div>
      </div>
      <main className="spec-wrap spec-main" key={tab}>
        {tab === 'flow' ? <Flow go={go} /> : null}
        {tab === 'send' ? <SendTab /> : null}
        {tab === 'overview' ? <Overview /> : null}
        {tab === 'list' ? <ListTab /> : null}
        {tab === 'rules' ? <Rules /> : null}
        {tab === 'status' ? <StatusTab /> : null}
        {tab === 'detail' ? <Detail /> : null}
        {tab === 'blocks' ? <Blocks /> : null}
        {tab === 'modals' ? <Modals /> : null}
        {tab === 'actions' ? <Actions /> : null}
        {tab === 'data' ? <Data /> : null}
      </main>
    </>
  )
}

// ---------- UI flow ----------
type Kind = 'page' | 'menu' | 'dialog' | 'action'
const KIND: Record<Kind, string> = { page: '畫面', menu: '選單', dialog: '對話框', action: '操作' }
const KCLS: Record<Kind, string> = { page: 'is-done', menu: 'is-action', dialog: 'is-dialog', action: 'is-action' }
function Card({ kind, title, when, shots, then }: { kind: Kind; title: string; when: React.ReactNode; shots?: string[]; then?: React.ReactNode }) {
  return (
    <article className="flow-branch">
      <header><span className={'flow-kind ' + KCLS[kind]}>{KIND[kind]}</span><b>{title}</b></header>
      <span className="flow-when">{when}</span>
      {shots && shots.length ? <div className={shots.length > 1 ? 'flow-pair' : undefined}>{shots.map(n => <div key={n} className="spec-canvas"><Shot name={n} alt={title} pins={false} /></div>)}</div> : null}
      {then ? <span className="flow-then">{then}</span> : null}
    </article>
  )
}
const Stop = ({ children, sub }: { children: React.ReactNode; sub: string }) => <span className="flow-stop"><b>{children}</b><span>{sub}</span></span>

// the panel's basic fields, said once and used in every place that lists them
const FIELDS = 'Channel、Status；緊急送出的加 Urgent reason；需要核准的加 Approval'

function Flow({ go }: { go: (k: TabKey) => void }) {
  return (
    <>
      <Section eyebrow="Flow" title="從列表出發的操作流程" lead="一則訊息選了幾個通道，列表就有幾筆紀錄（Device Notifications 加 SMS 備援算一筆）。所有操作都從列表開始：點標題、列尾的 ⓘ 或選單的 View details 開右側的詳情面板；其他操作在每一筆的 ⋮ 選單裡。">
        <div className="flow-map" role="list">
          <Stop sub="發送空間的 Send messages">訊息列表</Stop><span className="flow-arrow" aria-hidden>→</span>
          <Stop sub="搜尋、狀態、通道">找到那一筆</Stop><span className="flow-arrow" aria-hidden>→</span>
          <Stop sub="點標題、ⓘ 或 View details">訊息詳情面板</Stop><span className="flow-arrow" aria-hidden>→</span>
          <Stop sub="Approval Center、收件人成員">繼續查看</Stop>
        </div>
        <div className="flow-legend">
          <span><i className="flow-key" style={{ background: 'var(--flow-done)' }} />畫面</span>
          <span><i className="flow-key" style={{ background: 'var(--spec-muted)' }} />選單、操作</span>
          <span><i className="flow-key" style={{ background: 'var(--flow-branch)' }} />對話框</span>
        </div>
      </Section>

      <Section eyebrow="1" title="訊息列表" lead={<>每一列是一個通道的紀錄；同一則訊息的紀錄排在一起，共用欄位只在第一列顯示。欄位見「<button type="button" className="flow-spec-link" onClick={() => go('list')}>列表</button>」。</>}>
        <Figure label="訊息列表（個人發送空間）" sub="1680 × 940" shot="list" max={1180} wideNotes notes={[
          { n: 1, title: '通道', body: 'Device Notifications、Device Notifications (SMS)、Desktop OS、Email。' },
          { n: 2, title: '標題 / 內容', body: '這個通道的標題與內文；點標題開詳情面板。' },
          { n: 3, title: '狀態', body: '這一筆的狀態。' },
          { n: 4, title: '收件人數', body: '這個通道要寄給的人數。' },
          { n: 5, title: '{n} not sent', body: '未送出的人數；點了開名單。' },
          { n: 6, title: '列尾按鈕', body: 'ⓘ 開關詳情面板；⋮ 是列選單，項目依狀態不同。' },
          { n: 7, title: '狀態篩選', body: '多選。' },
          { n: 8, title: '通道篩選', body: '多選。' },
        ]} />
        <div className="flow-branches">
          <h3>從列表可以</h3>
          <Card kind="menu" title="篩選" when="點 Status 或 Channel" shots={['status-menu', 'channel-menu']} then="列表只留下符合的紀錄；按鈕變藍並顯示選了幾個。選單底部的 Clear 清除這個選單的選項。" />
          <Card kind="page" title="搜尋或篩選沒有結果" when="沒有符合的紀錄" shots={['empty']} then="表格框內顯示空狀態與 Clear filters。" />
          <Card kind="page" title="還沒有任何訊息" when="空間裡沒有訊息" shots={['empty-first']} then="頁面層級的空狀態：No messages yet 與 New message 按鈕。" />
          <Card kind="menu" title="列選單：已送出" when="狀態 Sent" shots={['menu-sent']} then="View details、Duplicate to new message" />
          <Card kind="menu" title="列選單：已排程" when="狀態 Scheduled" shots={['menu-scheduled']} then="View details、Duplicate to new message" />
          <Card kind="menu" title="列選單：排程已過期" when="狀態 Scheduled expired" shots={['menu-expired']} then="View details、Edit、Send now、Reschedule、Duplicate to new message、Delete" />
          <Card kind="menu" title="列選單：已駁回" when="狀態 Rejected" shots={['menu-rejected']} then="View details、Edit、Duplicate to new message、Delete" />
          <Card kind="menu" title="列選單：傳送錯誤" when="狀態 Error" shots={['menu-error']} then="View details、Send now、Reschedule、Duplicate to new message、Delete" />
        </div>
      </Section>

      <Section eyebrow="2" title="訊息詳情面板" lead="開在列表右側；開著時，那一筆列尾的 ⓘ 是 checked 樣式。面板沒有操作按鈕。">
        <div className="flow-branches">
          <Card kind="page" title="Device Notifications (SMS)" when="點這種紀錄的標題" shots={['detail-fb']} then={'欄位：' + FIELDS + '。內容兩項（Device Notifications、SMS fallback），預設收合。'} />
          <Card kind="page" title="單一通道的紀錄" when="Email、Desktop OS、Device Notifications" shots={['detail-email', 'detail-push']} then="內容一項；收件人只列這個通道寄得到的人。" />
          <Card kind="page" title="緊急送出的訊息" when="寄件人勾了「It’s urgent」" shots={['detail-urgent']} then="多一個 Urgent reason 欄位，顯示寄件人填的原因。" />
          <Card kind="action" title="Approval Center" when="點 View in Approval Center" then="開啟內部的 Approval Center（prototype 只顯示提示）。" />
        </div>
      </Section>

      <Section eyebrow="3" title="未送出名單與整則訊息的操作">
        <div className="flow-branches">
          <Card kind="dialog" title="Not sent to" when="點狀態下的 {n} not sent" shots={['dlg-fail']} then="未送出的收件人與原因；按鈕 Resend。" />
          <Card kind="page" title="重寄" when="名單裡按 Resend" shots={['resend']} then="進入發送流程第 1 步，收件人是這些人，通道是這一筆的通道。" />
          <Card kind="dialog" title="Delete this message?" when="選單 Delete" shots={['dlg-delete']} then="確認後整則訊息（所有通道的紀錄）一起刪除。" />
          <Card kind="dialog" title="Send it now?" when="選單 Send now" shots={['dlg-sendnow']} then="立即送出整則訊息，狀態變成 In progress。" />
          <Card kind="dialog" title="Reschedule" when="選單 Reschedule" shots={['dlg-reschedule']} then="選新的傳送時間，整則訊息一起改，不需要重新核准。" />
          <Card kind="action" title="Edit / Duplicate to new message" when="選單對應項目" then="進入發送流程。Edit 編輯這則訊息；Duplicate 以這則訊息的內容建立新訊息。" />
        </div>
      </Section>
    </>
  )
}

// ---------- send flow ----------
const REQ = <Copy en="This field is required." zh="此欄位為必填。" />
function SendTab() {
  return (
    <>
      <Section eyebrow="Send" title="發送流程" lead="三個步驟。">
        <SpecTable head={['步驟', '名稱']} nowrap={[0]} rows={[
          ['1', <Copy en="Audiences & channels" zh="收件人與通道" />],
          ['2', <Copy en="Message" zh="訊息內容" />],
          ['3', <Copy en="Schedule & preview" zh="排程與預覽" />],
        ]} />
      </Section>
      <Section eyebrow="Step 1" title="SMS 備援與緊急送出" lead="勾了 Device Notifications 後，下方出現 SMS 備援的勾選框。">
        <SpecTable head={['項目', '規格']} nowrap={[0]} rows={[
          ['SMS 備援', <>勾選框 <Copy en="Device Notifications (SMS)" zh="Device Notifications（SMS）" />，旁邊標籤 <Copy en="Needs SMS approval" zh="需 SMS 核准" />；說明 <Copy en="Send an SMS to anyone the push doesn’t reach." zh="推播沒送到的人，改發 SMS。" /></>],
          ['核准提示', <>勾了 SMS 後出現一個框，標題 <Copy en="The SMS needs approval before it’s sent" zh="SMS 核准後才會送出" />；勾了緊急後改為 <Copy en="SMS approval will be skipped" zh="將略過 SMS 核准" /></>],
          ['緊急送出', <>勾選框 <Copy en="It’s urgent: send without waiting for SMS approval" zh="這是緊急訊息，不等 SMS 核准直接傳送" />；說明 <Copy en="Only for urgent, important messages. This request will be kept on record." zh="僅限緊急且重要的訊息，此次申請將會留存紀錄。" /></>],
          ['原因（Reason）', <>勾了緊急才出現；必填，上限 200 字。{REQ}填的原因會顯示在詳情面板的 Urgent reason 欄位。</>],
          ['有外部收件人', <>緊急送出仍需主管核准，框內顯示 <Copy en="Your supervisor still has to approve it, because it goes outside the company." zh="因為有外部收件人，仍需要主管核准。" /></>],
        ]} />
      </Section>
      <Section eyebrow="Step 2" title="Message details" lead={<>標題 Message details，說明 <Copy en="Compose the message title and body to be sent to your audience." zh="撰寫要傳送給收件人的訊息標題和內容。" />。每個通道一個區塊，區塊之間有分隔線。</>}>
        <SpecTable head={['區塊', '欄位', '必填', '上限', '說明與錯誤']} nowrap={[0, 1, 2, 3]} rows={[
          ['Device Notifications', 'Sender', '是', '26', <><Copy en="Recipients will see this name as the notification source. Only applies to Device Notifications App (PNS)." zh="收件人會看到這個名稱作為通知來源。只適用於 Device Notifications App（PNS）。" />{REQ}<Copy en="Please use half-width English letters, numbers, and spaces only." zh="請只使用半形英文字母、數字和空格。" /></>],
          ['', 'Content', '是', '534', <>提示 <Copy en="Lock screens show about 4 lines." zh="鎖定畫面約顯示 4 行。" />。列表上的標題取內容的第一行。{REQ}</>],
          ['SMS', 'SMS text', '是', '534', <>區塊說明 <Copy en="Sent as a backup via SMS only if the push notification fails to send." zh="只有推播傳送失敗時，才會用 SMS 補送。" />{REQ}</>],
          ['Desktop OS', 'Sender', '否', '26', '錯誤訊息同 Device Notifications 的 Sender。'],
          ['', 'Title', '是', '20', REQ],
          ['', 'Content', '是', '70', <><Copy en="Supports Chinese, English, and numbers only." zh="僅支援中文、英文、數字。" />{REQ}</>],
          ['Email', 'Subject', '是', '70', REQ],
          ['', 'Content', '是', '—', <><Copy en="Supports text, tables, and images." zh="支援文字、表格、圖片。" />整體超過 100 KB 時：<Copy en="Message content exceeds the 100 KB limit. Please reduce content size or remove/compress embedded images." zh="訊息內容超過 100 KB 上限。請減少內容，或移除、壓縮內嵌圖片。" /></>],
        ]} />
        <Notes items={[{ title: '必填欄位', body: <>沒填時一律顯示 {REQ}</> }]} />
      </Section>
      <Section eyebrow="Step 3" title="Schedule & preview" lead={<>頁面說明 <Copy en="Choose when to send and review all settings before submission." zh="選擇傳送時間，並在送出前確認所有設定。" /></>}>
        <SpecTable head={['項目', '規格']} nowrap={[0]} rows={[
          ['Schedule', <>兩個選項：<Copy en="Send now" zh="立即傳送" />、<Copy en="Scheduled send" zh="排程傳送" />（說明 <Copy en="Up to 3 months ahead" zh="3 個月內任一時間" />）。選排程時出現日期時間欄位。</>],
          ['排程錯誤', <>選到過去或超過 3 個月：<Copy en="Please select a date between now and next 3 months." zh="請選擇現在到未來 3 個月內的日期。" /></>],
          ['Preview', '可切換通道；標題下方顯示這個通道的收件人數 Audience: n people。Device Notifications 的預覽只有寄件人與內容。'],
          ['警告', <>有人所有通道都送不到時，顯示 <Copy en="n people won’t get this" zh="n 人收不到" /></>],
        ]} />
      </Section>
      <Section eyebrow="After" title="送出之後" lead="回到訊息列表，以 toast 顯示結果。">
        <SpecTable head={['情況', 'Toast', '列表上的狀態']} nowrap={[0, 1]} rows={[
          ['立即傳送，不需核准', <Copy en="Sending to n audiences" zh="傳送給 n 位收件人" />, <StatusTag s="progress" />],
          ['排程傳送，不需核准', <Copy en="Scheduled for <時間>" zh="已排程：<時間>" />, <StatusTag s="scheduled" />],
          ['需要核准', <Copy en="Sent for approval" zh="已送出審核" />, <StatusTag s="pending" />],
        ]} />
        <Notes items={[{ title: 'Toast', body: '一行文字，前面不放圖示；右側有關閉鈕。' }]} />
      </Section>
    </>
  )
}

// ---------- overview ----------
function Overview() {
  return (
    <>
      <Section eyebrow="Concept" title="一個通道一筆紀錄" lead="發送時可以一次選好幾個通道；訊息紀錄則是每個通道各一筆，每一筆有自己的狀態與收件人數。">
        <SpecTable head={['發送時的選擇', '列表上的紀錄', '通道欄']} nowrap={[0]} rows={[
          ['Device Notifications', '1 筆', '手機圖示'],
          ['Device Notifications ＋ SMS 備援', '1 筆', '手機＋簡訊圖示'],
          ['Desktop OS', '1 筆', '螢幕圖示'],
          ['Email', '1 筆', '信封圖示'],
          ['好幾個通道（例：Device Notifications ＋ SMS 備援 ＋ Email）', '每個通道一筆（此例 2 筆）', '同一則訊息的紀錄排在一起，順序：Device Notifications → Desktop OS → Email'],
        ]} />
        <Notes items={[{ title: 'SMS 備援', body: 'SMS 是 Device Notifications 的備援，和它算同一筆，列表上沒有單獨的 SMS 列。' }]} />
      </Section>
      <Section eyebrow="Shared" title="整則訊息共用與各通道自己的資訊">
        <SpecTable head={['整則訊息共用', '各通道自己的']} rows={[[
          '模板、建立時間、傳送時間、建立者、核准、緊急原因；選單的 Edit、Send now、Reschedule、Delete、Duplicate to new message',
          '通道、寄件人、標題／內容、狀態、收件人數、未送出人數與名單',
        ]]} />
        <Notes items={[{ title: '整則訊息的操作', body: '從任何一筆執行，都套用到這則訊息的所有通道；確認對話框會列出受影響的通道。' }]} />
      </Section>
    </>
  )
}

// ---------- list ----------
function ListTab() {
  return (
    <>
      <Section eyebrow="Page" title="列表" lead="一列一個通道的紀錄。頁首、搜尋與篩選、表格、分頁。">
        <Figure label="個人發送空間" sub="1680 × 940" shot="list" max={1180} wideNotes notes={[
          { n: 1, title: '通道', body: <>只顯示圖示，滑過顯示通道名稱。Device Notifications (SMS) 是手機與簡訊兩個圖示。</> },
          { n: 2, title: '標題 / 內容', body: <>標題（藍字，點了開面板）加一行內文，過長截斷，不顯示滑過提示。Email 顯示主旨與內文；Device Notifications (SMS) 顯示 Device Notifications 的文字。</> },
          { n: 3, title: '狀態', body: '這一筆的狀態，見「狀態與合併規則」。' },
          { n: 4, title: '收件人數', body: <>這個通道要寄給的人數，數字與表頭都齊右。<C>Device Notifications (SMS)</C> 用 Device Notifications 的人數。</> },
          { n: 5, title: '{n} not sent', body: '紅色文字連結，在狀態標籤下方，點了開名單。有 SMS 備援的，只算推播與 SMS 都沒送到的人。' },
          { n: 6, title: '列尾按鈕', body: <>ⓘ（View details）開關詳情面板，開著時是 checked 樣式；⋮ 是列選單，見「列選單」。</> },
          { n: 7, title: '狀態篩選', body: '多選；只列出這個空間有的狀態與數量，依生命週期排序。' },
          { n: 8, title: '通道篩選', body: <>多選：<C>Device Notifications</C>、<C>Device Notifications (SMS)</C>、<C>Desktop OS</C>、<C>Email</C>，旁邊是數量。</> },
        ]} />
      </Section>
      <Section eyebrow="Columns" title="欄位" lead="寬度單位 px，都是 4 的倍數。Title / Content 是最小寬度，表格多出的寬度都給它。">
        <SpecTable head={['欄位', '寬度', '內容', '排序']} nowrap={[0]} rows={[
          [<Copy en="Sender" zh="寄件人" />, '140', 'Device Notifications 與 Desktop OS 的寄件人；Email 沒有寄件人，顯示「—」。每一列都顯示。', '可'],
          [<Copy en="Channel" zh="通道" />, '96', '通道圖示', '—'],
          [<Copy en="Title / Content" zh="標題 / 內容" />, '最小 320', '標題與一行內文', '—'],
          [<Copy en="Status" zh="狀態" />, '168', '狀態標籤；下方是 {n} not sent', '—'],
          [<Copy en="Audience" zh="收件人數" />, '88', '人數，齊右', '可'],
          [<Copy en="Template" zh="模板" />, '140', '模板名稱；沒用模板顯示「—」。只在第一列顯示。', '可'],
          [<Copy en="Created" zh="建立時間" />, '116', '日期、時間兩行。只在第一列顯示。', '可'],
          [<Copy en="Send time" zh="傳送時間" />, '116', '排程的訊息是排程時間，立即傳送的是建立時間。只在第一列顯示。', '可'],
          [<Copy en="Created by" zh="建立者" />, '200', '人員（頭像與姓名）。只在團隊空間顯示，只在第一列顯示。', '可'],
          ['（列尾）', '依內容', 'ⓘ 與 ⋮ 兩個圖示按鈕（xs）', '—'],
        ]} />
      </Section>
      <Section eyebrow="Group" title="同一則訊息的紀錄" lead="共用欄位只在第一列顯示，其他列留白；同一則訊息的列之間沒有分隔線。">
        <Figure label="一則訊息的兩筆紀錄" sub="Device Notifications (SMS) ＋ Email" shot="group" max={1180} wideNotes notes={[
          { n: 1, title: '寄件人', body: 'Email 沒有寄件人，顯示「—」。' },
          { n: 2, title: '通道', body: 'Device Notifications (SMS)：手機與簡訊兩個圖示。' },
          { n: 3, title: '狀態與未送出', body: '每一筆各自顯示。' },
          { n: 4, title: '收件人數', body: '每一筆是自己通道的人數。' },
          { n: 5, title: '共用欄位留白', body: '第二列的模板、時間、建立者留白。' },
        ]} />
        <Notes cols items={[
          { title: '留白與「—」', body: '留白：和這則訊息的第一列相同。「—」：沒有值，例如沒用模板、Email 沒有寄件人。' },
          { title: '分頁', body: '以訊息為單位，每頁最多 20 則；一則訊息的紀錄一定在同一頁。頁尾只有分頁控制。' },
          { title: '排序', body: '以整則訊息為單位；同一則訊息的紀錄順序固定。' },
        ]} />
      </Section>
      <Section eyebrow="Filter" title="篩選、搜尋與空狀態">
        <div className="spec-gallery">
          <figure><figcaption><b>狀態</b><span>多選；只列這個空間有的狀態。</span></figcaption><div className="spec-canvas"><Shot name="status-menu" alt="狀態篩選" /></div></figure>
          <figure><figcaption><b>通道</b><span>多選。</span></figcaption><div className="spec-canvas"><Shot name="channel-menu" alt="通道篩選" /></div></figure>
          <figure><figcaption><b>篩選後</b><span>篩選按鈕變藍，角標顯示選了幾個。</span></figcaption><div className="spec-canvas"><Shot name="filtered" alt="篩選後" /></div></figure>
          <figure><figcaption><b>沒有符合的結果</b><span>空狀態在表格框內，表頭保留；按鈕 Clear filters。</span></figcaption><div className="spec-canvas"><Shot name="empty" alt="沒有符合的結果" /></div></figure>
          <figure><figcaption><b>還沒有任何訊息</b><span>頁面層級的空狀態：沒有搜尋、篩選與表格；內容靠上，按鈕 New message。</span></figcaption><div className="spec-canvas"><Shot name="empty-first" alt="還沒有任何訊息" /></div></figure>
        </div>
        <Notes items={[
          { title: '搜尋範圍', body: '標題、內容、寄件人、模板、建立者（各通道自己的文字，例如 Email 的主旨）。' },
          { title: 'Clear', body: '篩選選單底部。有選項時是藍色可點，沒有選項時停用。' },
        ]} />
      </Section>
    </>
  )
}

// ---------- rules ----------
function Rules() {
  return (
    <>
      <Section eyebrow="Status" title="每一筆的狀態" lead="核准與排程是整則訊息共用的，所以送出前每個通道的狀態相同；送出後各通道各自進行，狀態可以不同。">
        <SpecTable head={['情況', '這一筆的狀態', '例子']} nowrap={[0]} rows={[
          ['還沒送出', '整則訊息的狀態：待核准、已排程、已駁回或排程已過期', '—'],
          ['這個通道送完了', <StatusTag s="sent" />, 'Device Notifications 送完，Email 還在送'],
          ['這個通道還在送', <StatusTag s="progress" />, 'Email 15 / 21'],
          ['有 SMS 備援，推播或 SMS 還在送', <StatusTag s="progress" />, 'Device Notifications 送完，SMS 還在送'],
          ['有 SMS 備援，推播全部送到', <StatusTag s="sent" />, '不需要 SMS；面板的 SMS fallback 寫 Not needed'],
          ['有 SMS 備援，SMS 傳送錯誤', <StatusTag s="error" />, '推播送出，SMS 閘道失敗'],
          ['這個通道傳送錯誤', <StatusTag s="error" />, 'Email 被郵件伺服器退件'],
        ]} />
      </Section>
      <Section eyebrow="Numbers" title="收件人數與未送出人數">
        <SpecTable head={['項目', '規則']} nowrap={[0]} rows={[
          ['收件人數', '這個通道要寄給的人數。Device Notifications (SMS) 用 Device Notifications 的人數。'],
          ['未送出人數', '送完（已送出或傳送錯誤）才顯示，0 人不顯示。有 SMS 備援的，只算推播與 SMS 都沒送到的人。'],
          ['未送出名單', '點 {n} not sent 開對話框。'],
          ['送達人數', '只在面板 SMS 備援的兩個收合列上顯示（n / m sent）。'],
        ]} />
      </Section>
    </>
  )
}

// ---------- detail ----------
function Detail() {
  return (
    <>
      <Section eyebrow="Panel" title="訊息詳情面板" lead="標題 Message detail。面板放列表上看不到的資訊：基本欄位、實際寄出的內容、收件人。沒有操作按鈕。">
        <Figure label="Device Notifications (SMS)" sub="有 SMS 備援" shot="detail-fb" max={440} notes={[
          { n: 1, title: '標題', body: <><C>Message detail</C>；右上角關閉。</> },
          { n: 2, title: '基本欄位', body: FIELDS + '。' },
          { n: 3, title: 'Device Notifications', body: '收合列：名稱與 n / m sent；展開是寄出的內容。' },
          { n: 4, title: 'SMS fallback', body: '收合列：名稱與 n / m sent；展開是簡訊內文。不需要 SMS 時寫 Not needed。' },
          { n: 5, title: 'Audiences', body: '收件人列表；組織與群組的人數可以點開看成員。' },
        ]} />
      </Section>
      <Section eyebrow="Variants" title="各種紀錄的面板">
        <div className="spec-gallery">
          <figure><figcaption><b>緊急送出</b><span>多一個 Urgent reason 欄位，是寄件人填的原因。</span></figcaption><div className="spec-canvas"><Shot name="detail-urgent" alt="緊急送出" max={420} /></div></figure>
          <figure><figcaption><b>Email</b><span>主旨、有格式的內文與附件。</span></figcaption><div className="spec-canvas"><Shot name="detail-email" alt="Email" max={420} /></div></figure>
          <figure><figcaption><b>Device Notifications</b><span>內容一項（圖為展開）。</span></figcaption><div className="spec-canvas"><Shot name="detail-push" alt="Device Notifications" max={420} /></div></figure>
          <figure><figcaption><b>不需要 SMS</b><span>推播全部送到，SMS fallback 寫 Not needed。</span></figcaption><div className="spec-canvas"><Shot name="detail-sms-notneeded" alt="不需要 SMS" max={420} /></div></figure>
          <figure><figcaption><b>等待核准</b><span>Status 是 Pending approval，有 Approval 欄位。</span></figcaption><div className="spec-canvas"><Shot name="detail-pending" alt="等待核准" max={420} /></div></figure>
          <figure><figcaption><b>多種收件人</b><span>組織、群組、個人與外部聯絡人。</span></figcaption><div className="spec-canvas"><Shot name="detail-mixed" alt="多種收件人" max={420} /></div></figure>
        </div>
      </Section>
      <Section eyebrow="Rules" title="面板規則">
        <SpecTable head={['項目', '規則']} nowrap={[0]} rows={[
          ['Channel', '每一筆都有。'],
          ['Status', '每一筆都有，和列表上這一筆相同；有 SMS 備援時以 Device Notifications 的狀態為主。'],
          ['Urgent reason', '緊急送出的訊息才有；同一則訊息的每一筆（含 Email）都顯示。'],
          ['Approval', <>這一筆是 Device Notifications (SMS)，或這則訊息需要核准（含緊急送出）時才有。值是連結 <Copy en="View in Approval Center" zh="到 Approval Center 查看" />；審核進度與駁回原因都在 Approval Center。</>],
          ['Content', '預設收合，可同時展開多項；換一筆紀錄時回到收合。Device Notifications (SMS) 兩項，其他一項。'],
          ['Audiences', '只列這個通道寄得到的人：外部 Email 只在 Email，外部電話只在 Device Notifications (SMS)。'],
          ['列表上的對應列', '面板開著時，那一筆列尾的 ⓘ 是 checked 樣式（淺藍底、藍色圖示）；列表本身不變色。'],
        ]} />
      </Section>
    </>
  )
}

// ---------- actions ----------
function Actions() {
  return (
    <Section eyebrow="Menu" title="列尾按鈕與列選單" lead="每一筆列尾有兩個圖示按鈕：ⓘ 與 ⋮。⋮ 選單的項目依狀態不同，都套用到整則訊息。">
      <SpecTable head={['按鈕', '規格']} nowrap={[0]} rows={[
        ['ⓘ View details', '設計系統 Button（text、xs、只有圖示 Info）。點了開這一筆的詳情面板，按鈕變成 checked（pressed，emphasis：淺藍底、藍色圖示）；再點一次，或關閉面板，回到一般樣式。同一時間只有一筆是 checked。'],
        ['⋮', '列選單（DropdownMenu）。選單包含所有操作，所以 View details 也在選單裡（設計系統表格的列操作規則）。'],
      ]} />
      <SpecTable head={['狀態', 'View details', 'Edit', 'Send now', 'Reschedule', 'Duplicate to new message', 'Delete']} nowrap={[0, 1, 2, 3, 4, 5, 6]} rows={[
        [<StatusTag s="pending" />, '✓', '', '', '', '✓', ''],
        [<StatusTag s="scheduled" />, '✓', '', '', '', '✓', ''],
        [<StatusTag s="progress" />, '✓', '', '', '', '✓', ''],
        [<StatusTag s="sent" />, '✓', '', '', '', '✓', ''],
        [<StatusTag s="error" />, '✓', '', '✓', '✓', '✓', '✓'],
        [<StatusTag s="rejected" />, '✓', '✓', '', '', '✓', '✓'],
        [<StatusTag s="expired" />, '✓', '✓', '✓', '✓', '✓', '✓'],
      ]} />
      <SpecTable head={['項目', '做什麼']} nowrap={[0]} rows={[
        [<Copy en="View details" zh="查看詳情" />, '開詳情面板（同點標題、同列尾的 ⓘ）。圖示是 i（Info）。'],
        [<Copy en="Edit" zh="編輯" />, '進入發送流程編輯這則訊息。已駁回的，改完重新送審。'],
        [<Copy en="Send now" zh="立即傳送" />, '開確認對話框，確認後立即傳送。'],
        [<Copy en="Reschedule" zh="重新排程" />, '開重新排程對話框，選新的傳送時間；不需要重新核准。'],
        [<Copy en="Duplicate to new message" zh="複製為新訊息" />, '進入發送流程，以這則訊息的內容建立新訊息。'],
        [<Copy en="Delete" zh="刪除" />, '開確認對話框，確認後刪除整則訊息。紅字，上方有分隔線。'],
      ]} />
      <div className="spec-gallery">
        <figure><figcaption><b>已送出</b></figcaption><div className="spec-canvas"><Shot name="menu-sent" alt="已送出的選單" /></div></figure>
        <figure><figcaption><b>已排程</b></figcaption><div className="spec-canvas"><Shot name="menu-scheduled" alt="已排程的選單" /></div></figure>
        <figure><figcaption><b>排程已過期</b></figcaption><div className="spec-canvas"><Shot name="menu-expired" alt="排程已過期的選單" /></div></figure>
        <figure><figcaption><b>已駁回</b></figcaption><div className="spec-canvas"><Shot name="menu-rejected" alt="已駁回的選單" /></div></figure>
        <figure><figcaption><b>傳送錯誤</b></figcaption><div className="spec-canvas"><Shot name="menu-error" alt="傳送錯誤的選單" /></div></figure>
      </div>
    </Section>
  )
}

// ---------- every status: its list rows and its panel ----------
function StatusSpec({ id, s, tagDesc, rows, shots, panel, urg }: { id: string; s: Parameters<typeof StatusTag>[0]['s']; tagDesc: string; rows: [React.ReactNode, React.ReactNode][]; shots: string[]; panel: string; urg: string }) {
  return (
    <Section eyebrow="Status" title={id}>
      <header className="flex flex-wrap items-center gap-3"><StatusTag s={s} /><span className="spec-lead">{tagDesc}</span></header>
      <div className="spec-gallery wide">
        {shots.map(n => <figure key={n}><figcaption><b>列表</b></figcaption><div className="spec-canvas"><Shot name={n} alt={id + ' 的列'} /></div></figure>)}
      </div>
      <SpecTable head={['項目', '規格']} nowrap={[0]} rows={rows} />
      <div className="spec-gallery">
        <figure><figcaption><b>面板</b></figcaption><div className="spec-canvas"><Shot name={panel} max={380} alt={id + ' 的面板'} /></div></figure>
        <figure><figcaption><b>面板（緊急送出）</b><span>多 Urgent reason 欄位。</span></figcaption><div className="spec-canvas"><Shot name={urg} max={380} alt={id + ' 的面板（緊急送出）'} /></div></figure>
      </div>
    </Section>
  )
}

function StatusTab() {
  const panel = (extra: string) => '欄位：' + FIELDS + '。' + extra
  return (
    <>
      <Section eyebrow="Status" title="七種狀態" lead="依訊息的生命週期排序，Status 篩選選單也是這個順序。每種狀態一節：列表上的列、各欄位怎麼顯示、面板（一般與緊急送出）。狀態標籤用設計系統 Tag（sm，圖示加文字）。">
        <SpecTable head={['狀態', '文字', '顏色', '圖示']} nowrap={[0, 1]} rows={[
          [<StatusTag s="pending" />, <Copy en="Pending approval" zh="待核准" />, 'amber', 'Hourglass'],
          [<StatusTag s="scheduled" />, <Copy en="Scheduled" zh="已排程" />, 'neutral', 'Calendar'],
          [<StatusTag s="progress" />, <Copy en="In progress" zh="傳送中" />, 'blue', 'Send'],
          [<StatusTag s="sent" />, <Copy en="Sent" zh="已送出" />, 'green', 'CheckCircle2'],
          [<StatusTag s="error" />, <Copy en="Error" zh="傳送錯誤" />, 'red', 'AlertTriangle'],
          [<StatusTag s="rejected" />, <Copy en="Rejected" zh="已駁回" />, 'red', 'CircleX'],
          [<StatusTag s="expired" />, <Copy en="Scheduled expired" zh="排程已過期" />, 'deep-orange', 'CalendarX2'],
        ]} />
      </Section>
      <StatusSpec id="待核准" s="pending" tagDesc="等待核准（SMS 審核人員、主管，或兩者）。所有通道一起等。" shots={['st-pending']} panel="detail-pending" urg="urg-pending" rows={[
        ['收件人數', '顯示'],
        ['未送出人數', '不顯示'],
        ['傳送時間', '排程時間；立即傳送的是建立時間'],
        ['列選單', 'View details、Duplicate to new message'],
        ['面板', panel('SMS fallback 不顯示人數。')],
      ]} />
      <StatusSpec id="已排程" s="scheduled" tagDesc="已核准或不需核准，等排程時間到。" shots={['st-scheduled']} panel="detail-scheduled" urg="urg-scheduled" rows={[
        ['收件人數', '顯示'],
        ['未送出人數', '不顯示'],
        ['傳送時間', '排程時間'],
        ['列選單', 'View details、Duplicate to new message'],
        ['面板', panel('')],
      ]} />
      <StatusSpec id="傳送中" s="progress" tagDesc="已開始傳送，各通道各自進行。" shots={['st-progress']} panel="detail-progress" urg="urg-progress" rows={[
        ['收件人數', '顯示'],
        ['未送出人數', '送完才顯示'],
        ['傳送時間', '排程時間或建立時間'],
        ['列選單', 'View details、Duplicate to new message'],
        ['面板', panel('有 SMS 備援時，Device Notifications 已送完、SMS 還在送，Status 仍是 In progress。')],
      ]} />
      <StatusSpec id="已送出" s="sent" tagDesc="這一筆已送完。" shots={['st-sent']} panel="detail-sent-fb" urg="urg-sent" rows={[
        ['收件人數', '顯示'],
        ['未送出人數', '有人未送出時，狀態下方顯示 {n} not sent'],
        ['傳送時間', '排程時間或建立時間'],
        ['列選單', 'View details、Duplicate to new message'],
        ['面板', panel('有 SMS 備援時，兩個收合列各顯示 n / m sent。')],
      ]} />
      <StatusSpec id="傳送錯誤" s="error" tagDesc="這個通道沒有送出（例如平台中斷、郵件伺服器退件）。" shots={['st-error', 'st-mixed']} panel="detail-error" urg="urg-error" rows={[
        ['收件人數', '顯示'],
        ['未送出人數', '顯示 {n} not sent（通常是全部的人）'],
        ['傳送時間', '建立時間'],
        ['列選單', 'View details、Send now、Reschedule、Duplicate to new message、Delete'],
        ['面板', panel('')],
        ['同一則訊息', '一個通道送出、另一個通道錯誤時，各自顯示自己的狀態（第二張圖）。'],
      ]} />
      <StatusSpec id="已駁回" s="rejected" tagDesc="核准人駁回，不會送出。" shots={['st-rejected']} panel="detail-rejected" urg="urg-rejected" rows={[
        ['收件人數', '顯示'],
        ['未送出人數', '不顯示'],
        ['傳送時間', '建立時間'],
        ['列選單', 'View details、Edit、Duplicate to new message、Delete'],
        ['面板', panel('駁回原因在 Approval Center。')],
      ]} />
      <StatusSpec id="排程已過期" s="expired" tagDesc="核准時已超過排程時間，沒有送出。" shots={['st-expired']} panel="detail-expired" urg="urg-expired" rows={[
        ['收件人數', '顯示'],
        ['未送出人數', '不顯示'],
        ['傳送時間', '原訂的排程時間'],
        ['列選單', 'View details、Edit、Send now、Reschedule、Duplicate to new message、Delete'],
        ['面板', panel('')],
      ]} />
    </>
  )
}

// ---------- panel blocks ----------
function Blocks() {
  return (
    <>
      <Section eyebrow="Panel" title="面板的版面" lead="設計系統 AppShellAside：靠右的常駐欄，視窗窄於 768 px 時改為 Sheet。由上到下：標題列、基本欄位、Content、Audiences。">
        <Figure label="Device Notifications (SMS)" sub="所有區塊" shot="detail-fb" max={440} notes={[
          { n: 1, title: '標題列', body: <>標題 <C>Message detail</C>，右上角關閉（Esc 也可關閉）。</> },
          { n: 2, title: '基本欄位', body: '垂直的 DescriptionList。' },
          { n: 3, title: 'Content', body: '區塊標題與收合列。' },
          { n: 4, title: 'SMS fallback', body: '有 SMS 備援時的第二個收合列。' },
          { n: 5, title: 'Audiences', body: '區塊標題與收件人列表。' },
        ]} />
        <SpecTable head={['項目', '規格']} nowrap={[0]} rows={[
          ['寬度', '400；xl 視窗 480'],
          ['內距', '左右 loose、上 tight、下 loose'],
          ['區塊間距', '區塊之間 loose；區塊標題與內容之間 tight'],
          ['捲動', '面板內部捲動，標題列固定'],
          ['關閉', '右上角關閉鈕或 Esc'],
        ]} />
      </Section>
      <Section eyebrow="Block 1" title="基本欄位" lead="設計系統 DescriptionList（vertical）：名稱在上（次要文字色）、值在下，欄位之間 tight。">
        <SpecTable head={['欄位', '值', '出現條件']} nowrap={[0]} rows={[
          ['Channel', '通道圖示與名稱', '每一筆'],
          ['Status', '狀態標籤', '每一筆'],
          ['Urgent reason', '寄件人填的原因全文，保留換行', '緊急送出的訊息'],
          ['Approval', <>連結按鈕（sm，外連圖示）<Copy en="View in Approval Center" zh="到 Approval Center 查看" /></>, 'Device Notifications (SMS)，或需要核准的訊息'],
        ]} />
        <div className="spec-gallery"><figure><figcaption><b>四個欄位都出現</b><span>緊急送出的 Device Notifications (SMS)。</span></figcaption><div className="spec-canvas"><Shot name="detail-urgent" alt="四個欄位" max={440} /></div></figure></div>
      </Section>
      <Section eyebrow="Block 2" title="Content" lead="設計系統 Accordion，外框細線圓角，預設收合。">
        <div className="spec-gallery">
          <figure><figcaption><b>展開</b><span>Device Notifications 與 SMS fallback。</span></figcaption><div className="spec-canvas"><Shot name="detail-fb-open" alt="展開內容" max={440} /></div></figure>
          <figure><figcaption><b>Email</b><span>內容框裡第一行是主旨（中等粗細，同 Device Notifications 的標題），其後是有格式的內文；附件在框下方。</span></figcaption><div className="spec-canvas"><Shot name="detail-email" alt="Email 內容" max={420} /></div></figure>
        </div>
        <SpecTable head={['收合列', '標題列', '展開後']} nowrap={[0]} rows={[
          ['Device Notifications', <>名稱；送完後顯示 <Copy en="n / m sent" zh="n / m 已送出" />（只在有 SMS 備援時）</>, '內容（第一行即標題）'],
          ['SMS fallback', <>名稱；送完後顯示 n / m sent；不需要 SMS 時顯示 <Copy en="Not needed" zh="不需要" /></>, '簡訊內文'],
          ['Desktop OS', '名稱', '標題（中等粗細）與內文'],
          ['Email', '名稱', '內容框：主旨（中等粗細）與有格式的內文；附件在框下方'],
        ]} />
        <Notes items={[{ title: '內容框', body: '白底、細框線、圓角、內距 12，保留換行。' }]} />
      </Section>
      <Section eyebrow="Block 3" title="Audiences" lead="這個通道寄得到的收件人，一列一個，順序：組織、群組、個人、外部聯絡人。">
        <Figure label="多種收件人" sub="組織、群組、個人、外部" shot="detail-mixed" max={420} notes={[
          { n: 1, title: '列', body: '左側圖示或頭像；名稱（中等粗細）與一行說明（次要小字）；組織與群組右側是人數連結，點了開成員對話框。' },
        ]} />
        <SpecTable head={['類型', '圖示', '名稱', '說明', '右側']} nowrap={[0]} rows={[
          ['組織', '大樓', '組織代碼', 'Org · 組織名稱', <>人數連結 <C>21 people</C></>],
          ['群組', '通訊錄', '群組名稱', 'Audience group', '人數連結'],
          ['個人', '頭像', '中文名 英文名', '工號 · 組織', '—'],
          ['外部 Email', '地球', '電子郵件', 'External email · Email only', '—'],
          ['外部電話', '電話', '電話號碼', 'External phone · SMS only', '—'],
        ]} />
      </Section>
    </>
  )
}

// ---------- every modal ----------
function Modals() {
  return (
    <>
      <Section eyebrow="Overview" title="對話框一覽" lead="都使用設計系統 Dialog：標題、內容、右下角按鈕（取消在左、主要動作在右），不放副標。點遮罩、Esc 或右上角關閉都等於取消。">
        <SpecTable head={['對話框', '開啟方式', '寬度', '主要動作']} nowrap={[0]} rows={[
          ['未送出名單', '狀態下方 {n} not sent', '760', 'Resend'],
          ['刪除', '選單 Delete', '480', 'Delete（紅色）'],
          ['立即傳送', '選單 Send now', '480', 'Send now'],
          ['重新排程', '選單 Reschedule', '480', 'Reschedule'],
          ['成員', '面板中組織或群組的人數連結', '640', '無（只有關閉）'],
        ]} />
      </Section>
      <Section eyebrow="Not sent" title="未送出名單">
        <Figure label="有 SMS 備援" sub="Device Notifications (SMS)" shot="dlg-fail" max={760} notes={[
          { n: 1, title: '標題', body: <><Copy en="Not sent to" zh="未送達的收件人" />，沒有副標。</> },
          { n: 2, title: '表格', body: '高 380。欄：Audience 240（頭像、姓名、工號 · NT）、Org 112、Reason 300（有 SMS 備援時兩行：推播原因、SMS 原因）。外部聯絡人用地球圖示。' },
          { n: 3, title: '重寄', body: <><C>Resend</C>：進入發送流程，收件人是這些人，通道是這一筆的通道。</> },
        ]} />
        <div className="spec-gallery">
          <figure><figcaption><b>Email</b><span>Reason 一行。</span></figcaption><div className="spec-canvas"><Shot name="dlg-fail-email" alt="Email 未送出名單" /></div></figure>
          <figure><figcaption><b>傳送錯誤</b><span>表格上方是錯誤提示（原因與建議）；按鈕同樣是 Resend。</span></figcaption><div className="spec-canvas"><Shot name="dlg-fail-error" alt="傳送錯誤" /></div></figure>
        </div>
      </Section>
      <Section eyebrow="Confirm" title="刪除與立即傳送" lead="寬 480：標題、一段說明、兩個按鈕。訊息有兩個以上通道時，說明會列出這些通道。">
        <div className="spec-gallery">
          <figure><figcaption><b>刪除</b><span>整則訊息與所有通道的紀錄一起刪除，無法復原。</span></figcaption><div className="spec-canvas"><Shot name="dlg-delete" alt="刪除" max={520} /></div></figure>
          <figure><figcaption><b>立即傳送</b><span>立即送出、已經核准；排程已過期的另寫出原訂時間。</span></figcaption><div className="spec-canvas"><Shot name="dlg-sendnow" alt="立即傳送" max={520} /></div></figure>
        </div>
        <SpecTable head={['對話框', '標題', '取消', '確認']} nowrap={[0]} rows={[
          ['刪除', <Copy en="Delete this message?" zh="要刪除這則訊息嗎？" />, <Copy en="Keep" zh="保留" />, <Copy en="Delete" zh="刪除" />],
          ['立即傳送', <Copy en="Send it now?" zh="要立即傳送嗎？" />, <Copy en="Not now" zh="先不要" />, <Copy en="Send now" zh="立即傳送" />],
        ]} />
      </Section>
      <Section eyebrow="Reschedule" title="重新排程" lead="核准仍然有效，只改時間；整則訊息一起改。完成後 toast：Rescheduled for <時間>。">
        <div className="spec-gallery">
          <figure><figcaption><b>預設</b><span>日期時間欄位必填，預設隔天 09:00；提示 Taipei time (GMT+8), up to 3 months ahead。</span></figcaption><div className="spec-canvas"><Shot name="dlg-reschedule" alt="重新排程" max={520} /></div></figure>
          <figure><figcaption><b>錯誤</b><span>按 Reschedule 時檢查；錯誤在欄位下方，欄位紅框。</span></figcaption><div className="spec-canvas"><Shot name="dlg-reschedule-error" alt="重新排程錯誤" max={520} /></div></figure>
        </div>
        <SpecTable head={['情況', '錯誤文案']} nowrap={[0]} rows={[
          ['沒有選日期時間', <Copy en="Pick a date and time." zh="請選擇日期和時間。" />],
          ['過去，或超過 3 個月', <Copy en="Please select a date between now and next 3 months." zh="請選擇現在到未來 3 個月內的日期。" />],
        ]} />
      </Section>
      <Section eyebrow="Members" title="成員">
        <Figure label="組織成員" sub="寬 640" shot="dlg-members" max={640} notes={[
          { n: 1, title: '標題', body: '組織或群組名稱，沒有副標。' },
          { n: 2, title: '搜尋', body: '小尺寸搜尋框。組織搜姓名、NT 帳號、工號；群組另外搜 Email 與電話。沒有結果時顯示 No matching members。' },
          { n: 3, title: '表格', body: '組織：Name 240、Employee ID 120、NT account 120。群組：Name 240、Added by 200。' },
        ]} />
        <div className="spec-gallery"><figure><figcaption><b>群組成員</b><span>Added by：這個人是用 NT 帳號、Email、手機號碼或工號加入群組的。</span></figcaption><div className="spec-canvas"><Shot name="dlg-members-group" alt="群組成員" max={640} /></div></figure></div>
      </Section>
    </>
  )
}

// ---------- sample data ----------
function Data() {
  return (
    <Section eyebrow="Data" title="prototype 的範例資料" lead="個人空間與四個團隊空間（Platform Ops、Fab 18 Communications、ESH Emergency、UX Team）都有七種狀態的訊息。">
      <SpecTable head={['要看什麼', '去哪裡']} nowrap={[0]} rows={[
        ['各通道狀態不同', '個人「Fire alarm test…」（Device Notifications 已送出，SMS 與 Email 傳送中）；ESH「Chemical delivery at Dock 2」（推播送出、SMS 傳送錯誤）；個人「Team lunch on Fri 11/7」（Device Notifications 已送出、Email 傳送錯誤）'],
        ['多種收件人', '個人「Design review with Northwind Studio」；Platform Ops「tWorkspace 5.2 is live」；Fab 18「Water shutdown」；ESH「Chemical delivery」；UX Team「Usability study invitation」'],
        ['SMS 備援與未送出人數', '個人「Design review…」：Device Notifications 4 人未送達，SMS 補寄後仍有 1 人未送出'],
        ['待核准、已駁回、排程已過期', '個人「Project Atlas demo」、「Reminder: badge photo update」、「UX sync moves to Tue 11/4」；每個團隊空間也各有一則'],
        ['緊急送出（七種狀態）', '個人空間「Parking lot A closed…」（待核准）、「Network maintenance tonight…」（已排程）、「Water leak on 5F…」（傳送中）、「Elevator 3 out of service…」（已送出）、「Power dip in Building C…」（傳送錯誤）、「Fire drill moved…」（已駁回）、「Badge reader outage…」（排程已過期）'],
        ['傳送錯誤', '個人「On-call swap」；Fab 18「Shift handover…」；UX Team「Reminder: send design review topics」'],
      ]} />
    </Section>
  )
}
