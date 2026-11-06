// UI flow and design spec of the one-record-per-channel version of the messages list and details
// (teams build with `--mode split`). One page, a tab per part, routed on the URL hash. Screens are screenshots of
// that prototype (tools/split-shots.mjs) with measured pins.
import * as React from 'react'
import { Tabs, TabsList, TabsTrigger } from '@qijenchen/design-system'
import { StatusTag } from '../../components/ui'
import { C, Copy, Figure, Notes, Section, Shot, SpecTable } from '../parts'

const PROTO = 'https://claude.ai/artifact/Kq6FnvbagCvdtmoPXiRD91'
const TABS = [['flow', 'UI Flow'], ['send', '發送流程'], ['overview', '總覽'], ['list', '列表'], ['rules', '狀態與合併規則'], ['status', '各狀態的列與面板'], ['detail', '訊息內容面板'], ['blocks', '面板區塊規格'], ['actions', '列選單'], ['modals', '對話框規格'], ['data', '範例資料']] as const
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
            <span className="text-caption text-fg-secondary">2026/11/06 · 團隊版 · 畫面取自 <a className="text-primary hover:underline" href={PROTO} target="_blank" rel="noreferrer">單一通道紀錄版 prototype</a>（需密碼）。發送流程沒有變，請看「發送訊息規格」。</span>
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
function Card({ kind, title, when, shots, then, to }: { kind: Kind; title: string; when: React.ReactNode; shots?: string[]; then?: React.ReactNode; to?: [string, TabKey?] }) {
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

function Flow({ go }: { go: (k: TabKey) => void }) {
  return (
    <>
      <Section eyebrow="Flow" title="從列表出發的操作流程" lead="一則訊息選了幾個通道，列表就有幾筆紀錄（Device Notifications 加 SMS 備援算一筆）。所有操作都從列表這一頁開始，沒有獨立的詳情頁：「查看訊息內容」開在右側面板，整則訊息的操作（編輯、刪除…）都在列的選單裡。">
        <div className="flow-map" role="list">
          <Stop sub="進入發送空間的「Send messages」">訊息列表</Stop><span className="flow-arrow" aria-hidden>→</span>
          <Stop sub="搜尋、狀態、通道">找到那一筆</Stop><span className="flow-arrow" aria-hidden>→</span>
          <Stop sub="點標題，或選單「View message」">訊息內容面板</Stop><span className="flow-arrow" aria-hidden>→</span>
          <Stop sub="Approval center、收件人成員">繼續查看</Stop>
        </div>
        <div className="flow-legend">
          <span><i className="flow-key" style={{ background: 'var(--flow-done)' }} />畫面</span>
          <span><i className="flow-key" style={{ background: 'var(--spec-muted)' }} />選單、操作</span>
          <span><i className="flow-key" style={{ background: 'var(--flow-branch)' }} />對話框</span>
        </div>
      </Section>

      <Section eyebrow="1" title="訊息列表" lead={<>主畫面。每一列是一個通道的紀錄，同一則訊息的紀錄排在一起、共用欄位只在第一列出現。詳細欄位見「<button type="button" className="flow-spec-link" onClick={() => go('list')}>列表</button>」。</>}>
        <Figure label="訊息列表（個人發送空間）" sub="1680 × 940" shot="list" max={1180} wideNotes notes={[
          { n: 1, title: '通道', body: '四種：Device Notifications、Device Notifications (SMS)、Desktop OS、Email。' },
          { n: 2, title: '標題 / 內容', body: '該通道自己的標題與內文；點標題開「訊息內容」面板。' },
          { n: 3, title: '狀態', body: '每一筆各自的狀態；未送出人數在狀態下方。' },
          { n: 4, title: '收件人數', body: '只放這個通道要寄給多少人，齊右。' },
          { n: 5, title: '{n} 人未送出', body: '點了開名單對話框。' },
          { n: 6, title: '列選單', body: '查看、編輯、刪除等，依狀態不同。' },
          { n: 7, title: '狀態篩選', body: '多選。' },
          { n: 8, title: '通道篩選', body: '多選，四種通道。' },
        ]} />
        <div className="flow-branches">
          <h3>從列表可以</h3>
          <Card kind="menu" title="篩選" when="點「Status」或「Channel」" shots={['status-menu', 'channel-menu']} then="列表只留下符合的紀錄；篩選按鈕變藍並顯示選了幾個，選單最下面的「Clear」可以清除" />
          <Card kind="page" title="搜尋沒有結果" when="輸入找不到的關鍵字" shots={['empty']} then="空狀態，按鈕「Clear filters」" />
          <Card kind="menu" title="列選單：已送出" when="點列尾的 ⋮" shots={['menu-sent']} then="View message、Duplicate to new message" />
          <Card kind="menu" title="列選單：已排程" when="狀態 Scheduled" shots={['menu-scheduled']} then="加上 Edit message、Delete" />
          <Card kind="menu" title="列選單：排程已過期" when="狀態 Scheduled expired" shots={['menu-expired']} then="加上 Send now、Reschedule、Delete" />
          <Card kind="menu" title="列選單：已駁回" when="狀態 Rejected" shots={['menu-rejected']} then="加上 Edit and resubmit、Delete" />
          <Card kind="menu" title="列選單：傳送錯誤" when="狀態 Error" shots={['menu-error']} then="加上 Retry" />
        </div>
      </Section>

      <Section eyebrow="2" title="訊息內容面板" lead="開在列表右側，不離開列表。沒有操作按鈕；審核進度在 Approval center。">
        <div className="flow-branches">
          <Card kind="page" title="Device Notifications (SMS)" when="點這種紀錄的標題" shots={['detail-fb']} then="面板最上方是狀態標籤（以 Device Notifications 為主）；內容預設收合，兩項：Device Notifications、SMS 備援，各有「n / m sent」；有「到 Approval center 查看」連結；緊急送出的另有「緊急原因」" />
          <Card kind="page" title="單一通道的紀錄" when="Email、Desktop OS、沒勾 SMS 的 Device Notifications" shots={['detail-email', 'detail-push']} then="只有那一個通道的內容與收件人" />
          <Card kind="page" title="等待核准的訊息" when="狀態 Pending approval" shots={['detail-pending']} then="多一個 Approval center 連結；原因與進度都在那邊" />
          <Card kind="action" title="Approval center" when="點面板上的連結" then="開啟內部的 Approval center（prototype 只顯示提示，不會真的跳轉）" />
        </div>
      </Section>

      <Section eyebrow="3" title="失敗名單、重寄與整則訊息的操作">
        <div className="flow-branches">
          <Card kind="dialog" title="Failed audience members" when="點狀態下的「{n} not sent」" shots={['dlg-fail']} then="表格：收件人、組織、原因（有 SMS 備援的多一行 SMS 失敗原因）；按鈕「Resend to n on 通道」" />
          <Card kind="page" title="重寄：發送流程" when="在失敗名單按「Resend to…」" shots={['resend']} then="進入發送流程步驟 1，收件人換成失敗的人，通道照這一筆；之後同發送流程" />
          <Card kind="dialog" title="Delete this message?" when="選單 Delete" shots={['dlg-delete']} then="列出整則訊息的所有通道，確認後整則（所有通道的紀錄）一起移除" />
          <Card kind="dialog" title="Send it now?" when="選單 Send now（排程已過期）" shots={['dlg-sendnow']} then="立即送出整則訊息；狀態變成 In progress" />
          <Card kind="dialog" title="Reschedule" when="選單 Reschedule（排程已過期）" shots={['dlg-reschedule']} then="選新時間，不需要重新核准；整則訊息一起改" />
          <Card kind="action" title="Edit message / Edit and resubmit / Duplicate" when="選單對應項目" then="進入發送流程（編輯、重新送審、複製）；套用到整則訊息" />
        </div>
      </Section>
    </>
  )
}

// ---------- the send flow (what changed; the three steps are otherwise as before) ----------
const REQ = <Copy en="This field is required." zh="此欄位為必填。" />
function SendTab() {
  return (
    <>
      <Section eyebrow="Send" title="發送流程" lead="寄件人還是一次選好幾個通道，流程仍是三步；以下是目前版本的內容與文案。第 1 步（收件人與通道）與之前相同。">
        <SpecTable head={['步驟', '名稱']} nowrap={[0]} rows={[
          ['1', <Copy en="Audiences & channels" zh="收件人與通道" />],
          ['2', <Copy en="Message" zh="訊息內容" />],
          ['3', <Copy en="Schedule & preview" zh="排程與預覽" />],
        ]} />
      </Section>
      <Section eyebrow="Step 2" title="Message details" lead={<>標題「Message details」，下方說明 <Copy en="Compose the message title and body to be sent to your audience." zh="撰寫要傳送給收件人的訊息標題和內容。" /></>}>
        <SpecTable head={['區塊', '欄位', '必填', '上限', '說明與錯誤']} nowrap={[0, 1, 2, 3]} rows={[
          ['Device Notifications', 'Sender', '是', '26', <><Copy en="Recipients will see this name as the notification source. Only applies to Device Notifications App (PNS)." zh="收件人會看到這個名稱作為通知來源。只適用於 Device Notifications App（PNS）。" />{REQ}<Copy en="Please use half-width English letters, numbers, and spaces only." zh="請只使用半形英文字母、數字和空格。" /></>],
          ['', 'Content', '是', '534', <>沒有 Title 欄位；列表上的標題是內容的第一行。提示「Lock screens show about 4 lines.」{REQ}</>],
          ['SMS', 'SMS text', '是', '534', <>區塊標題下方說明 <Copy en="Sent as a backup via SMS only if the push notification fails to send." zh="只有推播傳送失敗時，才會用 SMS 補送。" />，沒有標籤。{REQ}</>],
          ['Desktop OS', 'Sender', '否', '26', <>錯誤和 Device Notifications 的 Sender 一樣。</>],
          ['', 'Title', '是', '20', REQ],
          ['', 'Content', '是', '70', <><Copy en="Supports Chinese, English, and numbers only." zh="僅支援中文、英文、數字。" />{REQ}</>],
          ['Email', 'Subject', '是', '70', REQ],
          ['', 'Content', '是', '無字數上限', <><Copy en="Supports text, tables, and images." zh="支援文字、表格、圖片。" />只有整體超過 100 KB 才報錯：<Copy en="Message content exceeds the 100 KB limit. Please reduce content size or remove/compress embedded images." zh="訊息內容超過 100 KB 上限。請減少內容，或移除、壓縮內嵌圖片。" /></>],
        ]} />
        <Notes items={[{ title: '通道之間的分隔線', body: '每個通道區塊（Device Notifications、SMS、Desktop OS、Email）上方有一條細分隔線（設計系統的分隔線顏色），讓不同通道的欄位看得出分段；第一個通道上方的線把它和模板選擇隔開。' }, { title: '所有必填欄位', body: <>沒填一律顯示 <Copy en="This field is required." zh="此欄位為必填。" />，包含緊急原因和排程時間。</> }]} />
      </Section>
      <Section eyebrow="Step 3" title="Schedule & preview" lead={<>頁面最上方一行說明：<Copy en="Choose when to send and review all settings before submission." zh="選擇傳送時間，並在送出前確認所有設定。" /></>}>
        <SpecTable head={['項目', '規格']} nowrap={[0]} rows={[
          ['Schedule', <>區塊標題「Schedule」，兩個選項：<Copy en="Send now" zh="立即傳送" />（沒有說明文字）、<Copy en="Scheduled send" zh="排程傳送" />，說明 <Copy en="Up to 3 months ahead" zh="3 個月內任一時間" />。選排程才出現日期時間欄位。</>],
          ['排程錯誤', <>選到過去，或超過現在起 3 個月：<Copy en="Please select a date between now and next 3 months." zh="請選擇現在到未來 3 個月內的日期。" />（重新排程對話框也一樣）。不再有「至少 10 分鐘後」的規則。</>],
          ['Review：收件人', '沒有獨立的收件人列表。每個通道的收件人數放在 Preview 裡：切換通道，標題下方一行 Audience: n people，是這個通道的人數（Device Notifications 與 SMS 各自一個分頁；SMS 的人數是推播之外會補寄簡訊的人）。沒有總收件人數。'],
          ['Review：其他', '只有「n people won’t get this」警告（有人所有通道都送不到時才出現）。沒有 SMS 核准那一列，也不再有「Needs approval from…」的橘色說明框。'],
          ['預覽', '不顯示「now」時間；Device Notifications 沒有標題，只有寄件人與內容。'],
        ]} />
      </Section>
      <Section eyebrow="After" title="送出之後" lead="三種情況都直接回到訊息列表，用一行 toast 說結果，不再進「Sent for approval」結果頁。">
        <SpecTable head={['情況', 'Toast', '列表上']} nowrap={[0, 1]} rows={[
          ['立即傳送，不需核准', <Copy en="Sending to n audiences" zh="傳送給 n 位收件人" />, <StatusTag s="progress" />],
          ['排程傳送，不需核准', <Copy en="Scheduled for <時間>" zh="已排程：<時間>" />, <StatusTag s="scheduled" />],
          ['需要核准（SMS 審核人員或主管）', <Copy en="Sent for approval" zh="已送出審核" />, <StatusTag s="pending" />],
        ]} />
        <Notes items={[{ title: 'Toast 的樣子', body: '只有一行短文字，前面沒有狀態圖示（成功、錯誤、警告都不放）；顏色仍由類型決定。右側有關閉鈕，約 4 秒自動消失。' }]} />
      </Section>
    </>
  )
}

// ---------- overview ----------
function Overview() {
  return (
    <>
      <Section eyebrow="Concept" title="一個通道一筆紀錄" lead="寄件人發送訊息的流程沒有變，還是一次選好幾個通道；只有「訊息紀錄」改成每個通道各一筆。好處：每一筆有自己的狀態與真實的收件人數，不需要把幾個通道的數字湊在一起，後端也不用把各通道的收件人取交集。">
        <SpecTable head={['發送時的選擇', '列表上的紀錄', '通道欄顯示']} nowrap={[0]} rows={[
          ['Device Notifications（沒勾 SMS 備援）', '1 筆', <Copy en="Device Notifications" zh="一個手機圖示" />],
          ['Device Notifications ＋ SMS 備援', '1 筆（SMS 不獨立）', <Copy en="Device Notifications (SMS)" zh="手機＋簡訊兩個圖示" />],
          ['Desktop OS', '1 筆', <Copy en="Desktop OS" zh="螢幕圖示" />],
          ['Email', '1 筆', <Copy en="Email" zh="信封圖示" />],
          ['同時選好幾個（例：Device Notifications ＋ SMS 備援 ＋ Email）', '每個通道各一筆（此例 2 筆）', '同一則訊息的紀錄排在一起，順序固定：Device Notifications → Desktop OS → Email'],
        ]} />
      </Section>
      <Section eyebrow="Shared" title="整則訊息共用 vs 各通道自己" lead="同一則訊息的紀錄共用一部分資訊（第一列才顯示，其餘留白），其餘各自獨立。">
        <SpecTable head={['整則訊息共用', '各通道自己的']} rows={[[
          '模板、建立時間、傳送時間、建立者；排程、核准、編輯、刪除、重新排程、立即傳送',
          '通道、寄件人名稱（Device Notifications、Desktop OS 才有）、標題／內容、狀態、收件人數、失敗人數與名單',
        ]]} />
        <Notes items={[
          { title: '整則訊息的操作', body: '編輯、刪除、重新排程、立即傳送、複製是整則訊息的操作，不論從哪一筆選，都會套用到所有通道；選單與確認對話框都會說明。' },
          { title: 'SMS 不獨立', body: 'SMS 備援只是 Device Notifications 的備援，不是一個通道的紀錄。列表上不會有單獨的 SMS 列。' },
        ]} />
      </Section>
    </>
  )
}

// ---------- list ----------
function ListTab() {
  return (
    <>
      <Section eyebrow="Page" title="列表" lead="一列一個通道的紀錄。頁首、搜尋與篩選、表格、分頁，與原本的訊息列表相同；差別在於資料單位是「紀錄」而不是「訊息」。">
        <Figure label="個人發送空間" sub="1680 × 940" shot="list" max={1180} wideNotes notes={[
          { n: 1, title: '通道', body: <>只顯示圖示，滑過會顯示通道名稱；Device Notifications (SMS) 顯示兩個圖示（手機、簡訊），都是一般的灰色。篩選 <C>Channel</C>。</> },
          { n: 2, title: '標題 / 內容', body: <>標題（藍字，點了開面板）加一行內文，截斷。Email 顯示主旨與內文；Desktop OS 顯示桌面通知自己的文字；Device Notifications (SMS) 顯示 Device Notifications 的文字（SMS 文字在面板裡）。列表上不顯示緊急標籤（緊急與否在面板看）。標題與內文被截斷時不顯示滑過提示（長內文、圖片、表格放不進提示框）。</> },
          { n: 3, title: '狀態', body: '每一筆各自的狀態，見「狀態與合併規則」。' },
          { n: 4, title: '收件人數', body: <>數字齊右（表頭也齊右）。只放這個通道要寄給多少人，不放已送達。<C>Device Notifications (SMS)</C> 的數字是 Device Notifications 的收件人數。可排序。</> },
          { n: 5, title: '{n} not sent', body: <>紅色文字連結（前面沒有圖示），放在狀態標籤下方，點了開失敗名單。有 SMS 備援的，只算 SMS 也沒送到的人。</> },
          { n: 6, title: '列選單', body: '見「列選單」與「對話框規格」。' },
          { n: 7, title: '狀態篩選', body: '多選，只列出目前這個空間有的狀態，每個旁邊有數量。' },
          { n: 8, title: '通道篩選', body: <>多選，四種通道：<C>Device Notifications</C>、<C>Device Notifications (SMS)</C>、<C>Desktop OS</C>、<C>Email</C>，旁邊有紀錄數。</> },
        ]} />
      </Section>
      <Section eyebrow="Columns" title="欄位" lead="設計系統沒有欄寬 token，欄寬由我們定：一律是 4 的倍數，依內容夠用就好（人數、日期、通道圖示都不放寬）。「標題 / 內容」的寬度是最小寬度，會吸收多出來的空間。">
        <SpecTable head={['欄位', '寬度', '內容', '排序']} nowrap={[0]} rows={[
          [<Copy en="Sender" zh="寄件人" />, '140', '只有 Device Notifications 與 Desktop OS 有寄件人名稱；沒有的（Email）顯示「—」，每一列都顯示。不凍結。', '可'],
          [<Copy en="Channel" zh="通道" />, '96', '只顯示圖示，名稱在滑過的提示與螢幕閱讀器標籤裡；Device Notifications (SMS) 是手機加簡訊兩個圖示', '—'],
          [<Copy en="Title / Content" zh="標題 / 內容" />, '最小 320，其餘空間由這欄吸收', '該通道的標題與內文', '—'],
          [<Copy en="Status" zh="狀態" />, '168', '狀態標籤，失敗人數在下方', '—'],
          [<Copy en="Audience" zh="收件人數" />, '88', '只有人數，齊右', '可'],
          [<Copy en="Template" zh="模板" />, '140', '模板名稱，沒用模板是「—」；同一則訊息只在第一列顯示', '可'],
          [<Copy en="Created" zh="建立時間" />, '116', '日期與時間兩行；只在第一列顯示', '可'],
          [<Copy en="Send time" zh="傳送時間" />, '116', '排程的訊息是排程時間；立即傳送的是建立時間，不會有「—」；只在第一列顯示', '可'],
          [<Copy en="Created by" zh="建立者" />, '200', '只有團隊空間有；個人空間只有自己，不顯示。只在第一列顯示', '可'],
        ]} />
      </Section>
      <Section eyebrow="Group" title="同一則訊息的紀錄看起來是一組" lead="採用「合併共用欄位」：共用欄位只在第一列出現，其餘列留白。分隔線分兩種：訊息和訊息之間是一般的線；同一則訊息的各通道之間是更淡的線（一般線的 40% 濃度），所以通道列看得出分段，但仍然是同一組。">
        <Figure label="一則訊息的兩筆紀錄" sub="Device Notifications (SMS) ＋ Email" shot="group" max={1180} wideNotes notes={[
          { n: 1, title: '寄件人', body: 'Device Notifications 有寄件人，Email 那一列沒有這個欄位，顯示「—」。' },
          { n: 2, title: '通道', body: '第一筆：手機＋簡訊兩個圖示，代表勾了 SMS 備援。' },
          { n: 3, title: '狀態與失敗', body: '每一筆各自顯示，不合併。' },
          { n: 4, title: '收件人數', body: '各通道自己的人數：Device Notifications 57、Email 59。' },
          { n: 5, title: '共用欄位留白', body: '第二列的模板、時間、建立者留白，表示和第一列相同。' },
        ]} />
        <Notes cols items={[
          { title: '分隔線的層級', body: '一般線＝換一則訊息；淡線＝同一則訊息裡換一個通道。沒有第三種線，也不改欄位內容。' },
          { title: '留白只有「同上」一種意思', body: '「—」是沒有值（例如沒用模板），而且只會出現在每則訊息的第一列。' },
          { title: '分頁以訊息為單位', body: '每頁最多 20 則訊息，一則訊息的紀錄一定在同一頁；頁尾只有分頁控制（頁碼與每頁筆數），不顯示「1–20 of 22 messages」之類的筆數文字。' },
          { title: '排序', body: '排序以整則訊息為單位，組內順序固定。' },
        ]} />
      </Section>
      <Section eyebrow="Filter" title="篩選、搜尋與空狀態">
        <div className="spec-gallery">
          <figure><figcaption><b>狀態</b><span>多選；只列這個空間有的狀態。</span></figcaption><div className="spec-canvas"><Shot name="status-menu" alt="狀態篩選" /></div></figure>
          <figure><figcaption><b>通道</b><span>多選；SMS 備援包含在 Device Notifications (SMS)。</span></figcaption><div className="spec-canvas"><Shot name="channel-menu" alt="通道篩選" /></div></figure>
          <figure><figcaption><b>篩選後</b><span>篩選按鈕變藍、角標顯示數量；不另外顯示「顯示 n 筆」那一行。</span></figcaption><div className="spec-canvas"><Shot name="filtered" alt="篩選後" /></div></figure>
          <figure><figcaption><b>沒有符合的</b><span>空狀態與「Clear filters」。</span></figcaption><div className="spec-canvas"><Shot name="empty" alt="空狀態" /></div></figure>
        </div>
        <Notes items={[{ title: '搜尋範圍', body: '標題、內容、寄件人、模板、建立者；搜的是各通道自己的文字（例如 Email 的主旨）。' }]} />
      </Section>
    </>
  )
}

// ---------- rules ----------
function Rules() {
  return (
    <>
      <Section eyebrow="Status" title="每一筆的狀態" lead="七種狀態與原本相同；Status 篩選選單與下面的排列都依訊息的生命週期：待核准、已排程、傳送中、已送出、傳送錯誤、已駁回、排程已過期。核准與排程是整則訊息共用的，所以未送出前所有通道的狀態一樣；送出之後，每個通道各自進行，狀態可以不同。">
        <SpecTable head={['情況', '這一筆顯示', '例子']} nowrap={[0]} rows={[
          ['還沒送出（待核准、排程已過期、已駁回、已排程）', '整則訊息的狀態，所有通道一樣', '—'],
          ['送出中，這個通道已經送完', <StatusTag s="sent" />, 'Device Notifications 先送完，Email 還在送'],
          ['送出中，這個通道還沒送完', <StatusTag s="progress" />, 'Email 15 / 21'],
          ['有 SMS 備援，其中一個還在送', <StatusTag s="progress" />, 'Device Notifications 已送完，SMS 還在傳送'],
          ['有 SMS 備援，推播全部送到', <StatusTag s="sent" />, 'SMS 沒有要寄的人，列表是「已送出」、沒有失敗人數；面板的 SMS 區塊寫「Not needed」'],
          ['有 SMS 備援，SMS 傳送錯誤', <StatusTag s="error" />, 'ESH 的 Chemical delivery：推播送出、SMS 閘道失敗'],
          ['這個通道傳送錯誤', <StatusTag s="error" />, '整個通道沒有送出（例：Email 被郵件伺服器退件）'],
          ['全部送完', <StatusTag s="sent" />, '可能附「{n} not sent」'],
        ]} />
      </Section>
      <Section eyebrow="Numbers" title="收件人數與失敗人數">
        <SpecTable head={['項目', '規則']} nowrap={[0]} rows={[
          ['收件人數', '這個通道要寄給的人數。Device Notifications (SMS) 用 Device Notifications 的人數。'],
          ['失敗人數', '送完（已送出或傳送錯誤）才顯示。沒有 SMS 備援：收件人數減已送達。有 SMS 備援：只算推播與 SMS 都沒送到的人（SMS 會補寄給推播沒送到的人）。'],
          ['失敗名單', '點「{n} not sent」開對話框；有 SMS 備援的，原因欄第二行是 SMS 失敗的原因。'],
          ['不顯示送達人數', '列表與面板只有收件人數與失敗人數；有 SMS 備援的面板收合列上會寫「n / m sent」。'],
        ]} />
      </Section>
      <Section eyebrow="Marks" title="空格的意思">
        <SpecTable head={['標示', '意思']} nowrap={[0]} rows={[
          ['留白', '同上：和這則訊息第一列的內容相同（模板、建立時間、傳送時間、建立者）。'],
          ['—', '沒有值：沒用模板，或這個通道本來就沒有這個欄位（Email 沒有寄件人）。共用欄位（模板等）只出現在第一列；寄件人每一列都顯示。'],
          ['傳送時間', '排程的是排程時間；立即傳送的是建立時間，不會是「—」。'],
        ]} />
      </Section>
    </>
  )
}

// ---------- detail ----------
function Detail() {
  return (
    <>
      <Section eyebrow="Panel" title="訊息內容面板" lead="標題「Message content / 訊息內容」。只放列表上看不到的：這個通道實際寄出的內容、收件人，以及審核進度的連結。寄件人、模板、時間、建立者、人數都在列上，面板不重複；也沒有操作按鈕，操作在列選單。">
        <Figure label="Device Notifications (SMS)" sub="有 SMS 備援，兩個區塊" shot="detail-fb" max={440} notes={[
          { n: 1, title: '標題', body: <><C>Message content</C>；右上角關閉。</> },
          { n: 2, title: 'Approval center 連結', body: '審核的進度、核准人都在內部的 Approval center，面板只放連結。緊急送出的，連結上方多一行「緊急原因」。見下方條件。' },
          { n: 3, title: 'Device Notifications 區塊', body: '收合列：名稱、「n / m sent」（不放狀態標籤）；展開才是它寄出的內容（標題、內文；寄件人在列表上，面板不重複）。' },
          { n: 4, title: 'SMS 備援區塊', body: '同樣有標題與送達人數（不放狀態標籤），下面是簡訊內文。推播全部送到、不需要 SMS 時，不顯示狀態與人數，寫「Not needed / 不需要」。' },
          { n: 5, title: '收件人', body: '組織、群組、個人、外部聯絡人；組織與群組的人數可以點開看成員。' },
        ]} />
      </Section>
      <Section eyebrow="Variants" title="各種紀錄的面板">
        <div className="spec-gallery">
          <figure><figcaption><b>Email</b><span>主旨、有格式的內文與附件；收件人含外部 Email。</span></figcaption><div className="spec-canvas"><Shot name="detail-email" alt="Email" max={420} /></div></figure>
          <figure><figcaption><b>沒勾 SMS 備援的 Device Notifications</b><span>只有一項內容（預設收合，圖為展開），沒有人數；狀態在面板最上方。</span></figcaption><div className="spec-canvas"><Shot name="detail-push" alt="Device Notifications" max={420} /></div></figure>
          <figure><figcaption><b>有 SMS 備援，但不需要</b><span>推播全部送到，SMS 區塊寫「Not needed」，不顯示人數；列表上這一筆是「已送出」。</span></figcaption><div className="spec-canvas"><Shot name="detail-sms-notneeded" alt="不需要 SMS" max={420} /></div></figure>
          <figure><figcaption><b>等待核准</b><span>最上方狀態標籤 Pending approval，加 Approval center 連結。</span></figcaption><div className="spec-canvas"><Shot name="detail-pending" alt="等待核准" max={420} /></div></figure>
          <figure><figcaption><b>多種收件人</b><span>組織、群組、個人與外部聯絡人同時出現；外部 Email 只出現在 Email 那一筆，外部電話只出現在 Device Notifications (SMS)。</span></figcaption><div className="spec-canvas"><Shot name="detail-mixed" alt="多種收件人" max={420} /></div></figure>
        </div>
      </Section>
      <Section eyebrow="Rules" title="面板規則">
        <SpecTable head={['項目', '規則']} nowrap={[0]} rows={[
          ['Approval center 連結', <>出現在：Device Notifications (SMS)（SMS 要核准），或這則訊息有人核准過、正在等核准（外部收件人要主管核准）。文字 <Copy en="See review progress in the Approval center" zh="到 Approval center 查看審核進度" />。</>],
          ['審核提示卡片', '不顯示（待核准、已駁回、排程過期、緊急略過核准的提示都拿掉）。原因與時間在 Approval center。'],
          ['收合列', '使用者寫的內容預設收合，有需要再展開（可以同時展開幾項）。換一筆紀錄時回到收合。Device Notifications (SMS) 有兩項；其他通道一項。'],
          ['狀態標籤', '只在面板最上方放一個，和列表上這一筆的狀態一致；有 SMS 備援時以 Device Notifications 的狀態為主。收合列裡不放狀態標籤，也沒有各通道的標籤。'],
          ['緊急原因', '只有緊急送出的訊息才有，放在 Approval center 連結上方。'],
          ['收件人', '只列這個通道實際寄得到的人：外部 Email 只出現在 Email，外部電話只出現在 Device Notifications (SMS)。'],
          ['拿掉的東西', '寄件人、模板、核准、建立者、建立時間、傳送時間、送達／失敗人數區、同時發送的其他通道、申請編號、底部的編輯／刪除按鈕。'],
        ]} />
      </Section>
    </>
  )
}

// ---------- actions ----------
function Actions() {
  return (
    <>
      <Section eyebrow="Menu" title="列選單" lead="每一筆的 ⋮ 選單。所有項目都以整則訊息為單位；訊息有兩個以上的紀錄時，會改到整則的項目後面會加「（all channels）」。">
        <SpecTable head={['狀態', '選單項目']} nowrap={[0]} rows={[
          [<StatusTag s="sent" />, <><Copy en="View message" zh="查看訊息內容" />、Duplicate to new message</>],
          [<StatusTag s="progress" />, 'View message、Duplicate to new message'],
          [<StatusTag s="pending" />, 'View message、Duplicate to new message'],
          [<StatusTag s="scheduled" />, 'View message、Edit message、Duplicate、Delete（紅字，上方有分隔線）'],
          [<StatusTag s="expired" />, 'View message、Send now、Reschedule、Duplicate、Delete'],
          [<StatusTag s="rejected" />, 'View message、Edit and resubmit、Duplicate、Delete'],
          [<StatusTag s="error" />, 'View message、Retry、Duplicate'],
        ]} />
        <div className="spec-gallery">
          <figure><figcaption><b>已送出</b></figcaption><div className="spec-canvas"><Shot name="menu-sent" alt="已送出的選單" /></div></figure>
          <figure><figcaption><b>已排程</b></figcaption><div className="spec-canvas"><Shot name="menu-scheduled" alt="已排程的選單" /></div></figure>
          <figure><figcaption><b>排程已過期</b></figcaption><div className="spec-canvas"><Shot name="menu-expired" alt="排程已過期的選單" /></div></figure>
          <figure><figcaption><b>已駁回</b></figcaption><div className="spec-canvas"><Shot name="menu-rejected" alt="已駁回的選單" /></div></figure>
          <figure><figcaption><b>傳送錯誤</b></figcaption><div className="spec-canvas"><Shot name="menu-error" alt="傳送錯誤的選單" /></div></figure>
        </div>
        <Notes items={[{ title: '名稱', body: <>原本的「View details / 查看詳情」改成 <Copy en="View message" zh="查看訊息內容" />，因為面板只放內容與收件人。</> }]} />
      </Section>
    </>
  )
}


// ---------- every status: its list rows and its panel ----------
function StatusSpec({ id, s, tagDesc, rows, shots, panel, pn }: { id: string; s: Parameters<typeof StatusTag>[0]['s']; tagDesc: string; rows: [React.ReactNode, React.ReactNode][]; shots: string[]; panel: string; pn: string }) {
  return (
    <Section eyebrow="Status" title={id}>
      <header className="flex flex-wrap items-center gap-3"><StatusTag s={s} /><span className="spec-lead">{tagDesc}</span></header>
      <div className="spec-gallery wide">
        {shots.map(n => <figure key={n}><figcaption><b>列表上</b></figcaption><div className="spec-canvas"><Shot name={n} alt={id + ' 的列'} /></div></figure>)}
      </div>
      <div className="spec-row side">
        <div className="spec-canvas"><Shot name={panel} max={380} alt={id + ' 的面板'} /></div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <SpecTable head={['項目', '規格']} nowrap={[0]} rows={rows} />
          <p className="spec-lead">{pn}</p>
        </div>
      </div>
    </Section>
  )
}

function StatusTab() {
  const menuAll = '選單項目見「列選單」'
  return (
    <>
      <Section eyebrow="Status" title="七種狀態" lead="每種狀態一節：狀態標籤（顏色與圖示都是設計系統 Tag）、列表上的那一列、每個欄位在這個狀態怎麼顯示，以及打開面板看到什麼。圖都是真實 prototype 的截圖。標籤：Tag 尺寸 sm，圖示加文字。">
        <SpecTable head={['狀態', '標籤', '顏色', '圖示']} nowrap={[0, 1]} rows={[
          [<StatusTag s="pending" />, <Copy en="Pending approval" zh="待核准" />, 'amber', 'Hourglass'],
          [<StatusTag s="scheduled" />, <Copy en="Scheduled" zh="已排程" />, 'neutral', 'Calendar'],
          [<StatusTag s="progress" />, <Copy en="In progress" zh="傳送中" />, 'blue', 'Send'],
          [<StatusTag s="sent" />, <Copy en="Sent" zh="已送出" />, 'green', 'CheckCircle2'],
          [<StatusTag s="error" />, <Copy en="Error" zh="傳送錯誤" />, 'red', 'AlertTriangle'],
          [<StatusTag s="rejected" />, <Copy en="Rejected" zh="已駁回" />, 'red', 'CircleX'],
          [<StatusTag s="expired" />, <Copy en="Scheduled expired" zh="排程已過期" />, 'deep-orange', 'CalendarX2'],
        ]} />
      </Section>
      <StatusSpec id="待核准" s="pending" tagDesc="送出後等核准（SMS 審核人員、主管，或兩者）。所有通道一起等。" shots={['st-pending']} panel="detail-pending" rows={[
        ['收件人數', '照常顯示每個通道的人數'],
        ['失敗人數', '不顯示'],
        ['傳送時間', '有排程是排程時間；立即傳送是建立時間（核准後才會真的送出）'],
        ['列選單', 'View message、Duplicate to new message'],
        ['面板', 'Approval center 連結；內容與收件人。有 SMS 備援的，SMS 區塊只有標題，沒有人數；面板最上方是狀態標籤'],
      ]} pn="核准的原因、進度與核准人都在 Approval center，面板不再顯示提示卡片。" />
      <StatusSpec id="已排程" s="scheduled" tagDesc="核准完成（或不需要核准），等排程時間到。" shots={['st-scheduled']} panel="detail-scheduled" rows={[
        ['收件人數', '照常顯示'],
        ['失敗人數', '不顯示'],
        ['傳送時間', '排程時間'],
        ['列選單', 'View message、Edit message、Duplicate、Delete（all channels）'],
        ['面板', '內容與收件人；沒有 Approval center 連結（不需要核准的訊息）'],
      ]} pn="Device Notifications 與 Email 是同一則訊息的兩筆紀錄，狀態一樣，編輯時一起改。" />
      <StatusSpec id="傳送中" s="progress" tagDesc="已經開始送；各通道各自進行，標籤是這一筆整體的狀態。" shots={['st-progress']} panel="detail-progress" rows={[
        ['收件人數', '各通道人數'],
        ['失敗人數', '送完才顯示'],
        ['傳送時間', '建立時間或排程時間'],
        ['列選單', 'View message、Duplicate to new message'],
        ['面板', 'Email 這種單一通道只有一個內容區塊；有 SMS 備援的，兩個區塊各寫自己的人數；狀態在面板最上方'],
      ]} pn="有 SMS 備援時，Device Notifications 先送完、SMS 還在送，這一筆整體仍顯示 In progress。" />
      <StatusSpec id="已送出" s="sent" tagDesc="這一筆已送完。可能有人沒收到，在狀態下方顯示失敗人數。" shots={['st-sent']} panel="detail-sent-fb" rows={[
        ['收件人數', '各通道人數'],
        ['失敗人數', <>狀態下方紅色連結「n not sent」；沒有人失敗就不顯示。有 SMS 備援的，只算推播與 SMS 都沒送到的</>],
        ['傳送時間', '建立時間或排程時間'],
        ['列選單', 'View message、Duplicate to new message'],
        ['面板', '有 SMS 備援的，兩個收合列各寫「n / m sent」'],
      ]} pn="點「n not sent」開名單（見「對話框規格」）。" />
      <StatusSpec id="傳送錯誤" s="error" tagDesc="整個通道沒有送出（例如平台中斷、郵件伺服器退件）。" shots={['st-error', 'st-mixed']} panel="detail-error" rows={[
        ['收件人數', '各通道人數'],
        ['失敗人數', '全部都失敗，顯示「n not sent」；有 SMS 備援而其中一個傳送錯誤時，整體標籤是 Error'],
        ['傳送時間', '建立時間'],
        ['列選單', 'View message、Retry（all channels）、Duplicate'],
        ['面板', '內容與收件人'],
      ]} pn="下方第二組是同一則訊息裡一個通道送出、另一個通道錯誤：每一筆各自顯示自己的狀態。" />
      <StatusSpec id="已駁回" s="rejected" tagDesc="核准人駁回，訊息不會送出。" shots={['st-rejected']} panel="detail-rejected" rows={[
        ['收件人數', '照常顯示'],
        ['失敗人數', '不顯示'],
        ['傳送時間', '建立時間'],
        ['列選單', 'View message、Edit and resubmit、Duplicate、Delete（all channels）'],
        ['面板', 'Approval center 連結（駁回原因在那邊）；內容與收件人'],
      ]} pn="駁回原因不在面板顯示，由 Approval center 提供。" />
      <StatusSpec id="排程已過期" s="expired" tagDesc="核准時已經超過排程的時間，所以沒有送出。可以立即傳送、重新排程或刪除。" shots={['st-expired']} panel="detail-expired" rows={[
        ['收件人數', '照常顯示'],
        ['失敗人數', '不顯示'],
        ['傳送時間', '原訂的排程時間'],
        ['列選單', 'View message、Send now（all channels）、Reschedule（all channels）、Duplicate、Delete（all channels）'],
        ['面板', 'Approval center 連結；內容與收件人'],
      ]} pn="立即傳送與重新排程都套用到整則訊息，確認對話框會寫出受影響的通道。" />
    </>
  )
}

// ---------- panel blocks ----------
function Blocks() {
  return (
    <>
      <Section eyebrow="Panel" title="面板的版面" lead="面板開在列表右側（設計系統 Aside），標題「Message content / 訊息內容」，右上角關閉，內容可捲動。區塊由上到下，區塊之間的距離是一般間距的兩倍，區塊內的標題與內容貼近。">
        <div className="spec-gallery"><figure><figcaption><b>展開內容</b><span>預設收合；展開後看到各通道寄出的內容。</span></figcaption><div className="spec-canvas"><Shot name="detail-fb-open" alt="展開內容" max={440} /></div></figure></div>
        <div className="spec-gallery"><figure><figcaption><b>緊急送出</b><span>連結上方多一行「緊急原因」。</span></figcaption><div className="spec-canvas"><Shot name="detail-urgent" alt="緊急送出" max={440} /></div></figure></div>
        <Figure label="Device Notifications (SMS)" sub="所有區塊都出現的樣子" shot="detail-fb" max={440} notes={[
          { n: 1, title: '標題列', body: <>標題 <C>Message content</C>；右上角關閉鈕（Esc 也能關）。</> },
          { n: 2, title: '頂部：通道與審核', body: '狀態標籤加通道圖示與名稱；有核准的訊息，下面是 Approval center 連結，緊急送出的連結上方多一行「緊急原因」。' },
          { n: 3, title: '內容區塊', body: '區塊標題「Content」，下面是收合列（預設收合）。有 SMS 備援時兩列，否則一列。' },
          { n: 4, title: 'SMS 備援子區塊', body: '收合列：名稱、「n / m sent」；展開是簡訊內文。' },
          { n: 5, title: '收件人區塊', body: '區塊標題「Audiences」，一張列表卡。' },
        ]} />
      </Section>
      <Section eyebrow="Block 1" title="頂部：通道與審核">
        <SpecTable head={['項目', '規格']} nowrap={[0]} rows={[
          ['通道', '圖示加名稱（中等粗細），前面是這一筆的狀態標籤（有 SMS 備援時以 Device Notifications 為主）。Device Notifications (SMS) 用手機圖示加名稱。'],
          ['緊急原因', '緊急送出（略過 SMS 核准）的訊息才有，這則訊息的每一筆紀錄（含 Email）都顯示：標籤小字「Urgent reason / 緊急原因」，下面是原因全文，放在 Approval center 連結正上方。一般訊息只有連結。'],
          ['Approval center 連結', <>連結按鈕（sm），前面外連圖示，文字 <Copy en="View in Approval center" zh="到 Approval center 查看" />。出現條件：Device Notifications (SMS)，或這則訊息有核准紀錄。點了前往內部的 Approval center（prototype 只跳提示）。</>],
          ['不放的東西', '標題（內文已有）、審核提示卡片、寄件人、模板、時間、建立者。'],
        ]} />
      </Section>
      <Section eyebrow="Block 2" title="內容：各通道的格式" lead="展開後的內容框是白底、細框線、圓角、內距 12，文字保留換行。">
        <div className="spec-gallery">
          <figure><figcaption><b>Email</b><span>「Subject:」一行（標籤中等粗細），下面是有格式的內文框（粗體、清單、連結），附件用檔案項目列出名稱與大小。</span></figcaption><div className="spec-canvas"><Shot name="detail-email" alt="Email 內容" max={420} /></div></figure>
          <figure><figcaption><b>Device Notifications、Desktop OS</b><span>內容框：第一行標題（中等粗細），其後內文，不放寄件人（列表已有）。Desktop OS 若有自己的文字就用自己的。</span></figcaption><div className="spec-canvas"><Shot name="detail-push" alt="推播內容" max={420} /></div></figure>
        </div>
        <SpecTable head={['格式', '內容']} nowrap={[0]} rows={[
          ['Device Notifications', '標題、內文'],
          ['SMS 備援', '簡訊內文（沒有標題）'],
          ['Desktop OS', '標題、內文（可以和 Device Notifications 不同）'],
          ['Email', '主旨、內文（有格式）、附件；模式為「同上」時用標題與內文'],
        ]} />
      </Section>
      <Section eyebrow="Block 3" title="內容收合列（Device Notifications 與 SMS 備援）" lead="內容用設計系統的 Accordion，外框細線圓角。Device Notifications (SMS) 兩列，其他一列；沒勾 SMS 備援的紀錄一列，只有名稱，沒有狀態。">
        <SpecTable head={['項目', '規格']} nowrap={[0]} rows={[
          ['子標題列', '一行：子標題（中等粗細）、送達人數，可換行；不放狀態標籤。'],
          ['送達人數', <>只有送完（已送出或傳送錯誤）才顯示 <Copy en="133 / 142 sent" zh="133 / 142 已送出" />。</>],
          ['SMS 不需要', <>推播全部送到時，SMS 沒有要寄的人：這一列不顯示人數，只寫 <Copy en="Not needed" zh="不需要" />。</>],
          ['緊急原因', <>只有緊急送出（略過 SMS 核准）的 Device Notifications (SMS) 才有：標籤小字 <Copy en="Urgent reason" zh="緊急原因" />，下面是寄件人當初填的原因全文，放在 Approval center 連結正上方，兩者是同一塊「審核」資訊。沒有緊急送出的，只有連結。</>],
        ]} />
      </Section>
      <Section eyebrow="Block 4" title="收件人" lead="這個通道實際寄得到的收件人，一人（組）一列，排序固定：組織、群組、個人、外部聯絡人。">
        <Figure label="混合的收件人" sub="組織、群組、個人、外部" shot="detail-mixed" max={420} notes={[
          { n: 1, title: '列的結構', body: '前面圖示或頭像、名稱（中等粗細）、下方一行說明（次要小字）；組織與群組在右側有人數連結，點了開成員對話框。' },
        ]} />
        <SpecTable head={['類型', '圖示', '名稱', '說明', '右側']} nowrap={[0]} rows={[
          ['組織', '大樓', '組織代碼', 'Org · 組織名稱', <>人數連結 <C>21 people</C></>],
          ['群組', '通訊錄', '群組名稱', 'Audience group', '人數連結'],
          ['個人', '頭像', '中文名 英文名', '工號 · 組織', '—'],
          ['外部 Email', '地球', '電子郵件', 'External email · Email only', '—'],
          ['外部電話', '電話', '電話號碼', 'External phone · SMS only', '—'],
        ]} />
        <Notes items={[{ title: '依通道過濾', body: '外部 Email 只出現在 Email 那一筆；外部電話只出現在 Device Notifications (SMS)。' }]} />
      </Section>
    </>
  )
}

// ---------- every modal ----------
function Modals() {
  return (
    <>
      <Section eyebrow="Overview" title="對話框一覽" lead="全部使用設計系統的 Dialog：標題、可選的說明、內容、右下角按鈕（取消在左、主要動作在右）。點遮罩、按 Esc 或右上角關閉鈕都等於取消。">
        <SpecTable head={['對話框', '從哪裡開', '寬度', '主要動作']} nowrap={[0]} rows={[
          ['失敗的收件人', '狀態下方「n not sent」', '760', 'Resend to n on 通道（有失敗的訊息）；Retry（傳送錯誤）'],
          ['刪除', '列選單 Delete', '480', 'Delete（紅色）'],
          ['立即傳送', '列選單 Send now', '480', 'Send now'],
          ['重新排程', '列選單 Reschedule', '480', 'Reschedule'],
          ['成員', '面板中群組或組織的人數連結', '640', '（無，只有關閉）'],
        ]} />
      </Section>
      <Section eyebrow="Failed" title="失敗的收件人">
        <Figure label="有 SMS 備援" sub="Device Notifications (SMS)" shot="dlg-fail" max={760} notes={[
          { n: 1, title: '標題與說明', body: <><Copy en="Failed audience members" zh="傳送失敗的收件人" />；說明：通道名稱 · 失敗人數 / 收件人數。</> },
          { n: 2, title: '表格', body: '高 380，欄：Audience（頭像、姓名、工號 · NT）、Org、Reason（兩行：推播失敗原因、SMS 失敗原因）；寬 Audience 240、Org 112、Reason 300。外部聯絡人用地球圖示。' },
          { n: 3, title: '重寄', body: <><C>Resend to n on 通道</C>，進發送流程，收件人換成這些人，通道照這一筆。</> },
        ]} />
        <div className="spec-gallery">
          <figure><figcaption><b>沒有 SMS 備援（Email）</b><span>Reason 只有一行。</span></figcaption><div className="spec-canvas"><Shot name="dlg-fail-email" alt="Email 失敗名單" /></div></figure>
          <figure><figcaption><b>傳送錯誤的訊息</b><span>上方多一張錯誤提示卡（原因與建議），按鈕改成 Retry，重新送出整則訊息。</span></figcaption><div className="spec-canvas"><Shot name="dlg-fail-error" alt="傳送錯誤" /></div></figure>
        </div>
      </Section>
      <Section eyebrow="Confirm" title="刪除與立即傳送" lead="確認對話框：寬 480，標題、一段說明、兩個按鈕。說明寫明會影響哪些通道。">
        <div className="spec-gallery">
          <figure><figcaption><b>刪除</b><span>按鈕 Keep（取消）與 Delete（紅色主要）。訊息有兩個以上通道時，列出每個通道，並說明這些紀錄會一起移除。無法復原。</span></figcaption><div className="spec-canvas"><Shot name="dlg-delete" alt="刪除" max={520} /></div></figure>
          <figure><figcaption><b>立即傳送</b><span>只有排程已過期的訊息。按鈕 Not now 與 Send now。說明：馬上送出、不等原訂時間，已經核准；多通道時列出通道。</span></figcaption><div className="spec-canvas"><Shot name="dlg-sendnow" alt="立即傳送" max={520} /></div></figure>
        </div>
        <SpecTable head={['對話框', '標題', '取消', '確認']} nowrap={[0]} rows={[
          ['刪除', <Copy en="Delete this message?" zh="要刪除這則訊息嗎？" />, <Copy en="Keep" zh="保留" />, <Copy en="Delete" zh="刪除" />],
          ['立即傳送', <Copy en="Send it now?" zh="要立即傳送嗎？" />, <Copy en="Not now" zh="先不要" />, <Copy en="Send now" zh="立即傳送" />],
        ]} />
      </Section>
      <Section eyebrow="Reschedule" title="重新排程">
        <div className="spec-gallery">
          <figure><figcaption><b>預設</b><span>日期時間欄位必填，預設是隔天 09:00，下面是提示：「Sends … / Taipei time (GMT+8), up to 3 months ahead」。</span></figcaption><div className="spec-canvas"><Shot name="dlg-reschedule" alt="重新排程" max={520} /></div></figure>
          <figure><figcaption><b>驗證錯誤</b><span>按下 Reschedule 才檢查；錯誤顯示在欄位下方，欄位變紅框。</span></figcaption><div className="spec-canvas"><Shot name="dlg-reschedule-error" alt="重新排程錯誤" max={520} /></div></figure>
        </div>
        <SpecTable head={['情況', '錯誤文案']} nowrap={[0]} rows={[
          ['沒有選日期時間', <Copy en="Pick a date and time." zh="請選擇日期和時間。" />],
          ['早於現在，或超過現在起 3 個月', <Copy en="Please select a date between now and next 3 months." zh="請選擇現在到未來 3 個月內的日期。" />],
        ]} />
        <Notes items={[{ title: '不用重新核准', body: '核准仍然有效，只改時間；整則訊息的所有通道一起改。完成後提示一行「Rescheduled for …」。' }]} />
      </Section>
      <Section eyebrow="Members" title="成員">
        <Figure label="組織成員" sub="寬 640" shot="dlg-members" max={640} notes={[
          { n: 1, title: '標題與說明', body: '標題是組織或群組名稱；說明：類型 · 人數。' },
          { n: 2, title: '搜尋', body: '小尺寸搜尋框，寬 72；組織搜姓名、NT 帳號、工號；群組另外搜 Email 與電話。找不到時顯示空狀態「No matching members」。' },
          { n: 3, title: '表格', body: '組織：Name 240、Employee ID 120、NT account 120。群組：Name 240、Added by 200（加入方式與類型）。' },
        ]} />
        <div className="spec-gallery"><figure><figcaption><b>群組成員</b><span>多一欄「Added by」，說明這個人是用 NT 帳號、Email、手機號碼或工號加進群組的。</span></figcaption><div className="spec-canvas"><Shot name="dlg-members-group" alt="群組成員" max={640} /></div></figure></div>
      </Section>
    </>
  )
}

// ---------- sample data ----------
function Data() {
  return (
    <Section eyebrow="Data" title="prototype 裡的範例資料" lead="個人與四個團隊空間（Platform Ops、Fab 18 Communications、ESH Emergency、UX Team）都有七種狀態的訊息，方便逐一檢查。這些範例只在單一通道紀錄版裡。">
      <SpecTable head={['要看什麼', '去哪裡']} nowrap={[0]} rows={[
        ['通道狀態不同', '個人「Fire alarm test…」（Device Notifications 已送出，SMS 與 Email 還在傳送）；ESH「Chemical delivery at Dock 2」（推播送出、SMS 傳送錯誤）；個人「Team lunch on Fri 11/7」（Device Notifications 已送出、Email 傳送錯誤）'],
        ['混合收件人', '個人「Design review with Northwind Studio」；Platform Ops「tWorkspace 5.2 is live」；Fab 18「Water shutdown」；ESH「Chemical delivery」；UX Team「Usability study invitation」（組織、群組、個人、外部聯絡人）'],
        ['有 SMS 備援與失敗人數', '個人「Design review…」：Device Notifications 失敗 4 人，SMS 補寄後仍有 1 人失敗'],
        ['待核准、已駁回、排程過期', '個人「Project Atlas demo」、「Reminder: badge photo update」、「UX sync moves to Tue 11/4」；每個團隊空間也各有一則'],
        ['緊急送出（七種狀態）', '個人空間「Parking lot A closed…」（待核准）、「Badge reader outage…」（排程已過期）、「Fire drill moved…」（已駁回）、「Network maintenance tonight…」（已排程）、「Water leak on 5F…」（傳送中）、「Elevator 3 out of service…」（已送出）、「Power dip in Building C…」（傳送錯誤）；點開面板都看得到寄件人當初填的緊急原因。'],
        ['傳送錯誤', '個人「On-call swap」；Fab 18「Shift handover…」；UX Team「Reminder: send design review topics」'],
      ]} />
    </Section>
  )
}
