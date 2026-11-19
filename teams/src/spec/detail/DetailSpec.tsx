// UI flow and design spec of a record's Message details (the Detail modal): what opens it, what each status lets you
// edit, Resend (Now or Schedule, from the details themselves), Sent details and Resend to not sent, and the dialogs on
// top. Split out of the Send messages spec on 2026-11-19; its screenshots are that spec's (tools/split-shots.mjs).
import * as React from 'react'
import { Tabs, TabsList, TabsTrigger } from '@qijenchen/design-system'
import { StatusTag } from '../../components/ui'
import { C, Copy, Figure, Notes, Section, Shot, SpecTable } from '../parts'

const PROTO = 'https://claude.ai/artifact/Kq6FnvbagCvdtmoPXiRD91'
const LIST = 'https://claude.ai/artifact/7mVq135xnDXPMmZJ6rj4mc'
const TABS = [['flow', 'UI Flow'], ['detail', '訊息詳情'], ['edit', '編輯'], ['resend', '重新傳送'], ['delivery', '發送明細'], ['dialogs', '對話框']] as const
type TabKey = typeof TABS[number][0]
const isTab = (h: string): h is TabKey => TABS.some(t => t[0] === h)

export default function DetailSpec() {
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
            <span className="spec-eyebrow">MNP · 訊息紀錄 · 訊息詳情</span>
            <h1 className="spec-h1">Message details 與重新傳送：UI Flow 與設計規格</h1>
            <span className="text-caption text-fg-secondary">2026/11/19 · 從 <a className="text-primary hover:underline" href={LIST} target="_blank" rel="noreferrer">Send messages 設計規格</a>拆出（列表、列選單仍在那份）；畫面取自 <a className="text-primary hover:underline" href={PROTO} target="_blank" rel="noreferrer">prototype</a>（需密碼）。</span>
          </div>
          <Tabs value={tab} onValueChange={v => go(v as TabKey)}>
            <TabsList overflow="scroll">{TABS.map(([k, t]) => <TabsTrigger key={k} value={k}>{t}</TabsTrigger>)}</TabsList>
          </Tabs>
        </div>
      </div>
      <main className="spec-wrap spec-main">
        {tab === 'flow' ? <Flow go={go} /> : null}
        {tab === 'detail' ? <Detail /> : null}
        {tab === 'edit' ? <Edit /> : null}
        {tab === 'resend' ? <Resend /> : null}
        {tab === 'delivery' ? <Delivery /> : null}
        {tab === 'dialogs' ? <Dialogs /> : null}
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
const FIELDS = 'Message ID、Channel、Status（下方是 n not sent 連結）、Approval record（需要核准時）、Sender、Audience（人數）、Template、Created、Send time、Creator：列表上有的資訊都在這裡；緊急送出的原因不顯示（那是給 ICSD 審核看的）'

function Flow({ go }: { go: (k: TabKey) => void }) {
  const L = ({ k, children }: { k: TabKey; children: React.ReactNode }) => <button type="button" className="flow-spec-link" onClick={() => go(k)}>{children}</button>
  return (
    <>
      <Section eyebrow="Flow" title="訊息詳情的操作流程" lead="訊息詳情是一筆通道紀錄的大 modal：看內容、收件人與基本資訊，依狀態直接編輯，也在這裡重新傳送、查發送明細。所有操作只作用在這一個通道，同一個訊息 ID 的其他通道不受影響。">
        <div className="flow-map" role="list">
          <Stop sub="點標題、列選單 Resend、{n} not sent">從列表開啟</Stop><span className="flow-arrow" aria-hidden>→</span>
          <Stop sub="內容、收件人、基本資訊">訊息詳情</Stop><span className="flow-arrow" aria-hidden>→</span>
          <Stop sub="依狀態">編輯、儲存或重新傳送</Stop><span className="flow-arrow" aria-hidden>→</span>
          <Stop sub="已開始送出的紀錄">發送明細與補寄</Stop>
        </div>
        <div className="flow-legend">
          <span><i className="flow-key" style={{ background: 'var(--flow-done)' }} />畫面</span>
          <span><i className="flow-key" style={{ background: 'var(--spec-muted)' }} />選單、操作</span>
          <span><i className="flow-key" style={{ background: 'var(--flow-branch)' }} />對話框</span>
        </div>
      </Section>

      <Section eyebrow="1" title="開啟訊息詳情" lead={<>三個入口開的都是同一個 Message details，沒有另外的 Resend 畫面。版面見「<L k="detail">訊息詳情</L>」。</>}>
        <div className="flow-branches">
          <Card kind="page" title="點標題" when="列表上任何一筆的標題" shots={['detail-fb']} then="開這一筆的訊息詳情。" />
          <Card kind="menu" title="列選單 Resend" when="狀態 Scheduled expired、Error 的 ⋮" shots={['menu-expired', 'menu-error']} then="開同一個訊息詳情（2026-11-18 起不再切換到 Resend 模式），在裡面選時間後送出。" />
          <Card kind="dialog" title="{n} not sent" when="列表或訊息詳情 Status 下方的紅字" shots={['dlg-fail']} then="直接開發送明細，Status 已篩選成 Not sent。" />
        </div>
      </Section>

      <Section eyebrow="2" title="依狀態編輯" lead={<>沒有另外的編輯模式，欄位依狀態可編輯或 Read only。規則見「<L k="edit">編輯</L>」。</>}>
        <div className="flow-branches">
          <Card kind="page" title="不能編輯" when="Pending approval、In progress、Sent、Rejected、Canceled" shots={['detail-pending']} then="內容與收件人是 Read only（標題旁有 Read only 標籤），傳送時間不能改。" />
          <Card kind="page" title="編輯後儲存" when="Scheduled" then="內容、收件人、傳送時間直接改；一改動，底部換成 Discard changes / Save changes。儲存後仍是 Scheduled。" />
          <Card kind="page" title="編輯後重新傳送" when="Scheduled expired、Error" shots={['edit-content']} then="內容、收件人直接改；Send time 選 Now 或 Schedule；底部按鈕 Resend（Now）或 Schedule resend（Schedule）按下就送出，不另存。" />
          <Card kind="dialog" title="Discard changes?" when="改過內容沒儲存或送出就關閉" then="Keep editing 回到訊息詳情；Discard 捨棄並關閉。" />
        </div>
      </Section>

      <Section eyebrow="3" title="重新傳送" lead={<>Scheduled expired、Error 寄給這一筆的全部收件人；Sent details 的補寄只寄沒收到的人。規格見「<L k="resend">重新傳送</L>」。</>}>
        <div className="flow-branches">
          <Card kind="page" title="選 Now" when="Send time 選 Now，按 Resend" then="立即送出，這一筆變成 In progress；toast Sending on <通道>。" />
          <Card kind="page" title="選 Schedule" when="Send time 選 Schedule（預設，帶原本的時間）" shots={['resend-full']} then="時間在現在到 3 個月內 → 按 Schedule resend 後這一筆變成 Scheduled；toast Resend scheduled for <時間>。" />
          <Card kind="page" title="時間已經過了" when="選 Schedule、沒改時間就按 Schedule resend" shots={['resend-later']} then="不送出；欄位紅框，提醒選新的時間或改選 Now。" />
          <Card kind="page" title="只寄沒收到的人" when="Sent details 的 Resend to not sent (n)" shots={['resend']} then="訊息詳情的 Resend 模式（標題 Resend），收件人只有沒收到的人；送出後是一則新訊息（新的訊息 ID），原本那一筆不變。" />
        </div>
      </Section>

      <Section eyebrow="4" title="發送明細" lead={<>已開始送出（In progress、Sent、Error）的紀錄才有。規格見「<L k="delivery">發送明細</L>」。</>}>
        <div className="flow-branches">
          <Card kind="dialog" title="Sent details" when="訊息詳情 Audience 右上角的 Sent details" shots={['dlg-delivery']} then="每一則實際送出的訊息一列，以人為單位；可以搜尋、篩選、分頁。" />
          <Card kind="dialog" title="篩選後" when="Status 或 Channel 只選一項" shots={['dlg-delivery-failed']} then="按鈕直接寫那一項；有人沒收到時，底部 Resend to not sent (n)。" />
        </div>
      </Section>

      <Section eyebrow="5" title="其他操作" lead={<>對話框規格見「<L k="dialogs">對話框</L>」。</>}>
        <div className="flow-branches">
          <Card kind="dialog" title="Cancel sending?" when="底部左側的 Cancel sending（Scheduled、Scheduled expired、Error、Pending approval；有改動時停用）" shots={['dlg-cancel']} then="這個通道不再送出，狀態變成 Canceled；紀錄留在列表。" />
          <Card kind="action" title="Duplicate" when="底部的 Duplicate（沒有改動時）" then="進入發送流程，只帶入這個通道（通道、內容與它的收件人）。" />
          <Card kind="dialog" title="成員" when="Audience 表格中組織或群組的 n people" shots={['dlg-members']} then="列出目前的成員，可以搜尋。" />
          <Card kind="action" title="Approval Center" when="基本資訊的 View in Approval Center" then="開啟內部的 Approval Center（prototype 只顯示提示）。" />
        </div>
      </Section>
    </>
  )
}

function Detail() {
  return (
    <>
      <Section eyebrow="Modal" title="訊息詳情" lead="設計系統 Dialog（寬 1120，填滿可用高度）。點列表上的標題開啟。標題 Message details，前面是訊息 ID 標籤；左邊是內容與收件人，右邊淺灰底是基本資訊；底部是操作。">
        <Figure label="Device Notifications (SMS)" sub="Error" shot="detail-fb" max={760} notes={[
          { n: 1, title: '標題', body: <>訊息 ID 標籤加 <C>Message details</C>（通用標題，不用訊息標題）；右上角關閉。</> },
          { n: 2, title: 'Content', body: '區塊標題 Content、Audience 是 14px medium（比對話框標題 16px medium 輕一級）。這個通道的欄位：Device Notifications 是 Sender（只能輸入英文）、Title（30）、Content（750）；Desktop OS 是 Sender、Title、Content；Email 是 Subject 與內文。不能編輯時標題旁有 Read only 標籤。' },
          { n: 3, title: 'SMS fallback', body: '有 SMS 備援時的第二組欄位（SMS content，半形最多 534 字、有任一全形字元最多 267 字）。小標題旁不顯示送達人數。' },
          { n: 4, title: 'Audience', body: '和發送流程相同的表格；SMS 多兩欄 Company phone、Personal phone。個人不加 Person 標籤（大頭照已經看得出是人；組織、群組、外部聯絡人是圖示，才需要標籤）。' },
          { n: 5, title: '基本資訊', body: FIELDS + '。' },
          { n: 6, title: '底部', body: '左：Cancel sending；右：Duplicate（2026-11-18 從 Duplicate to new message 縮短）、Resend（Scheduled expired、Error）。' },
          { n: 7, title: 'Sent details', body: '已開始送出（In progress、Sent、Error）才有的藍字連結，開發送明細。原本的 n not sent 與 View delivery details 合併成這一個（2026-11-16）；未送出人數仍在右側 Status 下方，點了開同一個對話框、只看 Not sent。' },
        ]} />
      </Section>
      <Section eyebrow="Variants" title="各種紀錄的訊息詳情">
        <div className="spec-gallery">
          <figure><figcaption><b>緊急送出</b><span>和一般訊息相同，不顯示緊急原因（原因只給 ICSD 審核看）。</span></figcaption><div className="spec-canvas"><Shot name="detail-urgent" alt="緊急送出" max={560} /></div></figure>
          <figure><figcaption><b>Email</b><span>Subject 與有格式的內文。</span></figcaption><div className="spec-canvas"><Shot name="detail-email" alt="Email" max={560} /></div></figure>
          <figure><figcaption><b>Device Notifications</b><span>Sender 與 Content。</span></figcaption><div className="spec-canvas"><Shot name="detail-push" alt="Device Notifications" max={560} /></div></figure>
          <figure><figcaption><b>不需要 SMS</b><span>推播全部送到，SMS fallback 寫 Not needed。</span></figcaption><div className="spec-canvas"><Shot name="detail-sms-notneeded" alt="不需要 SMS" max={560} /></div></figure>
          <figure><figcaption><b>等待核准</b><span>Status 是 Pending approval；下方欄位 Approval record。</span></figcaption><div className="spec-canvas"><Shot name="detail-pending" alt="等待核准" max={560} /></div></figure>
          <figure><figcaption><b>多種收件人</b><span>組織、群組、個人與外部聯絡人。</span></figcaption><div className="spec-canvas"><Shot name="detail-mixed" alt="多種收件人" max={560} /></div></figure>
        </div>
      </Section>
      <Section eyebrow="Modal" title="版面" lead="設計系統 Dialog。由上到下：標題列、兩欄內容（各自捲動）、底部操作列。">
        <SpecTable head={['項目', '規格']} nowrap={[0]} rows={[
          ['寬度', '最大 1120；高度填滿可用高度（height fill）'],
          ['標題列', '訊息 ID 標籤（Tag sm neutral）加 Message details；右上角關閉，Esc 也可關閉'],
          ['左欄', 'Content、Audience 兩個區塊；內距 loose，區塊之間 1.5 × loose；自己捲動'],
          ['右欄', '寬 340，左側細分隔線，淺灰底（neutral-1，黑色 2%）；內距 loose；自己捲動'],
          ['底部', '上方細分隔線；左 Cancel sending（secondary danger），右 Duplicate（secondary，2026-11-18 從 Duplicate to new message 縮短；列選單仍是 Duplicate to new message）、Resend（primary，Scheduled expired、Error）；Scheduled expired、Error 有改動時 Duplicate 換成 Discard changes（tertiary），Resend 不變；Scheduled 有改動時右側換成 Discard changes（tertiary）、Save changes（primary）；Sent details 的 Resend 模式是 Cancel 與 Resend／Schedule resend'],
        ]} />
      </Section>
      <Section eyebrow="Right" title="基本資訊" lead="設計系統 DescriptionList（vertical）：名稱在上（次要文字色）、值在下。列表上有的資訊都在這裡。">
        <SpecTable head={['欄位', '值', '出現條件']} nowrap={[0]} rows={[
          ['Message ID', '訊息 ID（例：10154），同一次發送的各通道相同', '每一筆'],
          ['Channel', '通道圖示與名稱', '每一筆'],
          ['Status', '狀態標籤；下方紅字 n not sent 連結（有未送出時）', '每一筆'],
          ['Approval record', '連結按鈕 View in Approval Center（sm，外連圖示）', 'Device Notifications (SMS)，或需要核准的訊息'],
          ['Sender', '寄件人；Email 沒有寄件人時顯示 —', '每一筆'],
          ['Audience', '這個通道的人數；編輯收件人時即時更新', '每一筆'],
          ['Template', '模板名稱，沒有時 —', '每一筆'],
          ['Created', '建立時間', '每一筆'],
          ['Send time', '傳送時間；可以改時是日期時間欄位', '每一筆'],
          ['Created by', '設計系統 PersonDisplay', '每一筆'],
        ]} />
      </Section>
      <Section eyebrow="Left" title="Content 與 Audience">
        <SpecTable head={['通道', 'Content 的欄位']} nowrap={[0]} rows={[
          ['Device Notifications', 'Sender（只能輸入英文）、Title（30）、Content（750）'],
          ['Device Notifications (SMS)', '小標題 Device Notifications：Sender、Title、Content；小標題 SMS fallback：SMS content（534／267）。小標題旁不顯示送達人數'],
          ['Desktop OS', 'Sender（選填）、Title、Content'],
          ['Email', 'Subject、內文（可以編輯時是格式編輯器；Read only 時是 readonly 底色的內文框，寬度撐滿）'],
        ]} />
        <SpecTable head={['Audience 表格', '規格']} nowrap={[0]} rows={[
          ['欄位', 'Audience 一欄；Device Notifications (SMS) 多 Company phone、Personal phone 兩欄（表頭可全選；外部聯絡人兩欄都是 —，沒有登記私人手機的人 Personal phone 是 —）'],
          ['列', '個人：PersonDisplay；組織、群組：圖示、名稱、類型標籤、藍色 n people（開成員）；外部：圖示、號碼或 Email、Phone / Email 標籤'],
          ['可以編輯時', '上方搜尋列與 Batch import；每列右側 ✕ 移除；表格超過 6 列時固定高 320、內部捲動'],
          ['Read only 時', '只有表格；手機欄的勾選框是 disabled'],
        ]} />
      </Section>
    </>
  )
}

function Edit() {
  return (
    <>
      <Section eyebrow="Edit" title="編輯" lead="沒有另外的編輯模式：欄位一直都在，依狀態可編輯或 Read only。">
        <Figure label="可以編輯" sub="Scheduled expired，改了 SMS content" shot="edit-content" max={760} notes={[
          { n: 1, title: '可編輯的欄位', body: '必填星號、字數計數，限制和發送流程相同。' },
          { n: 2, title: '加入收件人', body: '搜尋列（Person、Org、Group、Phone、Email）與 Batch import；每列右側 ✕ 移除。外部電話只能加在 Device Notifications (SMS)，外部 Email 只能加在 Email（其他通道輸入外部 Email 時搜尋框直接提示不能加入，公司信箱仍會加入員工）。' },
          { n: 3, title: '手機欄', body: '預設勾 Company phone；每列至少要勾一支，否則不能儲存。' },
          { n: 4, title: 'Send time', body: 'Scheduled：日期時間欄位，改了之後仍是 Scheduled。Scheduled expired、Error：Now / Schedule 兩個選項，預設 Schedule 帶原本的傳送時間。' },
          { n: 5, title: '底部', body: 'Scheduled expired、Error：主要按鈕一直存在，選 Now 時是 Resend、選 Schedule 時是 Schedule resend，按下就用畫面上的內容、收件人和時間送出，不另開對話框；有改動時 Duplicate 換成 Discard changes，Cancel sending 停用。Scheduled：有改動時底部換成 Discard changes / Save changes。' },
        ]} />
        <SpecTable head={['狀態', 'Content', 'Audience', 'Send time']} nowrap={[0]} rows={[
          [<StatusTag s="scheduled" />, '可編輯', '可編輯', '可編輯'],
          [<StatusTag s="expired" />, '可編輯', '可編輯', '可編輯'],
          [<StatusTag s="error" />, '可編輯', '可編輯', '可編輯'],
          [<StatusTag s="pending" />, 'Read only', 'Read only', 'Read only'],
          [<StatusTag s="progress" />, 'Read only', 'Read only', 'Read only'],
          [<StatusTag s="sent" />, 'Read only', 'Read only', 'Read only'],
          [<StatusTag s="rejected" />, 'Read only', 'Read only', 'Read only'],
          [<StatusTag s="canceled" />, 'Read only', 'Read only', 'Read only'],
        ]} />
        <Notes items={[
          { title: 'Read only 欄位', body: '設計系統欄位的 readonly 狀態：淺灰底、無外框，文字維持正常顏色，可以選取複製。focus 時不顯示藍框，避免看起來像可編輯（2026-11-11 與設計師討論，待 DS 負責人確認）。' },
          { title: '只改這個通道', body: '內容、收件人、手機與傳送時間都只改這一筆；同一個訊息 ID 的其他通道不變。' },
          { title: '沒儲存就關閉', body: <>先問 <Copy en="Discard changes?" zh="要捨棄變更嗎？" />：Keep editing / Discard。</> },
          { title: '儲存後（Scheduled）', body: <>toast <Copy en="Changes saved" zh="已儲存變更" />；有改傳送時間時是 <Copy en="Saved. Sends <時間>" zh="已儲存，將於 <時間> 傳送" />。</> },
          { title: 'Resend 後（Scheduled expired、Error）', body: <>沒有另外的儲存：改過的內容與 Resend 一起送出。toast：Now 是 <Copy en="Sending on <通道>" zh="正在以 <通道> 傳送" />，Schedule 是 <Copy en="Resend scheduled for <時間>" zh="已排程重新傳送：<時間>" />。</> },
        ]} />
      </Section>
    </>
  )
}

function Resend() {
  return (
    <>
      <Section eyebrow="Resend" title="重新傳送" lead="取代原本的 Send now 與 Reschedule（2026-11-16）：在訊息詳情裡完成，不進入發送流程。2026-11-18 起，Scheduled expired、Error 的訊息詳情本身就可以編輯，Send time 選 Now 或 Schedule，按底部按鈕直接送出，不再切換到另一個 Resend 畫面。核准仍然有效；只作用在這個通道。">
        <Figure label="從選單 Resend（全部收件人）" sub="Scheduled expired：和點標題開啟的訊息詳情相同" shot="resend-full" max={760} notes={[
          { n: 1, title: 'Now', body: <>2026-11-18 加上：選 Now 時日期欄位收起，按鈕是 <C>Resend</C>，立即送出，這一筆變成 In progress，toast <Copy en="Sending on <通道>" zh="正在以 <通道> 傳送" />。</> },
          { n: 2, title: 'Schedule（預設）', body: '日期時間欄位，預設是原本的傳送時間（通常已經過了）；日曆上今天以前的日期是灰色、不能點。' },
          { n: 3, title: 'Schedule resend', body: <>按下時檢查所有欄位與傳送時間；時間已過就留在畫面上，提醒改時間或改選 Now。改成現在到 3 個月內的時間後再按，就以這個時間送出，這一筆變成 Scheduled，toast <Copy en="Resend scheduled for <時間>" zh="已排程重新傳送：<時間>" />。</> },
        ]} />
        <Figure label="從 Sent details 的 Resend to not sent (n)" sub="只寄沒收到的人" shot="resend" max={760} notes={[
          { n: 1, title: '標題', body: '訊息 ID 標籤加 Resend。' },
          { n: 2, title: '說明', body: <><Copy en="Only the people who didn’t receive it. It goes out as a new message with its own ID." zh="只寄給沒收到的人，會以一則新訊息（新的訊息 ID）送出。" /></> },
          { n: 3, title: 'Send time', body: 'Now 或 Schedule。' },
          { n: 4, title: 'Resend', body: '送出後列表上多一筆新訊息；原本那一筆不變。' },
        ]} />
        <div className="spec-gallery"><figure><figcaption><b>傳送時間已過</b><span>選 Schedule、沒改時間就按 Schedule resend：錯誤在欄位下方，欄位紅框，不送出。</span></figcaption><div className="spec-canvas"><Shot name="resend-later" alt="傳送時間已過" max={420} /></div></figure></div>
        <SpecTable head={['情況', '錯誤文案']} nowrap={[0]} rows={[
          ['沒有選日期時間', <Copy en="Pick a date and time." zh="請選擇日期和時間。" />],
          ['Scheduled expired、Error：時間已經過了', <Copy en="This time has passed. Pick a new time or choose Now." zh="這個時間已經過了，請選擇新的時間，或改選立即。" />],
          ['超過 3 個月；Resend 模式選 Schedule 時是過去的時間', <Copy en="Please select a date between now and next 3 months." zh="請選擇現在到未來 3 個月內的日期。" />],
        ]} />
      </Section>
    </>
  )
}

function Delivery() {
  return (
    <>
      <Section eyebrow="Delivery" title="發送明細" lead="訊息詳情 Audience 標題右側的 Sent details（已開始送出的紀錄才有：In progress、Sent、Error）開一個專門查案用的大對話框：每一則實際送出的訊息一列，以人為單位（組織、群組都展開）。">
        <Figure label="Sent details" sub="Device Notifications (SMS)，UX Team「Fire drill: Building A, 11/14」" shot="dlg-delivery" max={980} notes={[
          { n: 1, title: '搜尋', body: <>一個搜尋框，不用先選欄位，提示 <Copy en="Search name, employee ID, NT account, phone or job ID" zh="搜尋姓名、工號、NT 帳號、電話或 Job ID" />。姓名、電話、Email 部分比對（電話不顯示但可以搜）；工號、NT 帳號、Job ID 完全比對（由伺服器依格式判斷，名單有數萬人時才查得快）。可以一次貼多個，用逗號或空格分隔。</> },
          { n: 2, title: '篩選', body: 'Status（附數量），Device Notifications (SMS) 多一個 Channel（PNS / SMS）。都是多選，沿用列表的 FilterMenu：沒選時按鈕寫篩選名稱（Status）；只選一項時按鈕直接寫那一項（例：Not sent）；選兩項以上時是篩選名稱加數量（Status 2）。沒有 Reason 篩選：原因只在未送出時才有，已經寫在 Not sent 標籤下方。' },
          { n: 3, title: 'Status', body: '狀態與原因合併成一欄：Sent／Not sent 標籤。Not sent 下方小字寫原因（App unregistered、No desktop agent、Number not in service、Service unavailable…）。Sent 代表我們送出成功；如果接收端回報沒送達，Sent 下方也寫出原因（例：Recipient has blocked SMS messages、Message is barred by customer），這些仍算送出、不列入 Resend。兩種小字（Not sent 的原因、Sent 的接收端原因）都是紅字，因為都是異常狀況。還在傳送中的紀錄只列已經送出的，沒有 Queued（2026-11-16）。全站統一用 Not sent，不用 Failed。' },
          { n: 4, title: 'Send time', body: '實際送出時間到秒；大量發送時分批送（每分鐘一批），後面的人會晚一兩分鐘。還在排隊時 —。' },
          { n: 5, title: '分頁', body: '「第一筆–最後一筆 of 總數」、頁碼、每頁 50 / 100 / 200 筆。搜尋或篩選後回到第 1 頁。' },
          { n: 6, title: 'Channel', body: <>怎麼送：<C>PNS</C>、<C>SMS (fallback)</C>（推播沒送到後改寄的 SMS）、<C>SMS</C>（外部號碼）、<C>Desktop OS</C>、<C>Email</C>。不寫是哪支手機，也不顯示號碼（隱私考量）。</> },
          { n: 7, title: 'Resend to not sent (n)', body: '有人沒收到時，底部 Close 右邊是 Resend to not sent (n)（primary），n 是完全沒收到的人數（推播沒送到但 SMS 送到的算收到；一個人可能有兩列，所以不是列數）。按下後開一則新訊息，同一個通道與內容，收件人只有這些人。都收到了只有 Close（primary）。不再有 Alert 與 Show them（2026-11-16）。' },
          { n: 8, title: '手機標籤', body: '收件人姓名旁的標籤寫這一則送到哪支手機：Company phone（藍色）或 Personal phone（紫色）。PNS 一律是公務手機；SMS 兩種都可能。Desktop OS、Email 的列沒有標籤。' },
        ]} />
        <SpecTable head={['欄位', '內容']} nowrap={[0]} rows={[
          ['Job ID', '每一則送出的訊息的編號（訊息 ID 加序號），依送出順序'],
          ['Recipient', '人員顯示加手機標籤（Company phone 藍、Personal phone 紫）；外部聯絡人顯示電話或 Email'],
          ['Employee ID', '工號，查案最常用；外部聯絡人 —'],
          ['Channel', 'PNS、SMS (fallback)、SMS（外部號碼）、Desktop OS、Email。推播沒送到後改寄的 SMS 是同一人的另一列'],
          ['Status', '標籤加原因（見上）'],
          ['Send time', '實際送出時間'],
        ]} />
        <Notes items={[
          { title: '標題列', body: <>訊息 ID 標籤加 <Copy en="Sent details · <通道>" zh="發送明細・<通道>" />（和訊息詳情一樣把訊息 ID 放在標題前）；沒有副標或統計行，數量看 Status 篩選上的數字。</> },
          { title: '大小', body: '設計系統 Dialog，最大寬 1280、填滿可用高度；表格固定高度、內部捲動，分頁列在表格下方。疊在訊息詳情之上，關閉後回到訊息詳情。' },
          { title: '大量資料', body: '搜尋、篩選、分頁、篩選選單上的數量都由伺服器計算；prototype 用收件人展開後的範例資料示意。' },
        ]} />
        <div className="spec-gallery"><figure><figcaption><b>只看 SMS (fallback)</b><span>Channel 篩選只選一項時，按鈕直接寫那一項；同一頁看得到公務、私人手機的標籤、Sent 下方的接收端原因與 Not sent 的原因。</span></figcaption><div className="spec-canvas"><Shot name="dlg-delivery-failed" alt="只看 SMS (fallback)" max={980} /></div></figure></div>
      </Section>
      <Section eyebrow="Not sent" title="未送出名單" lead="2026-11-16 起不再有獨立的 Not sent to 對話框：列表與訊息詳情的 {n} not sent 都開 Sent details，Status 已篩選成 Not sent。查誰沒收到與 Resend 只在這一個地方。">
        <Figure label="從列表的 {n} not sent 開啟" sub="Device Notifications (SMS)" shot="dlg-fail" max={980} notes={[
          { n: 1, title: '標題', body: <>和從訊息詳情開的相同：訊息 ID 標籤加 <Copy en="Sent details · <通道>" zh="發送明細・<通道>" />。</> },
          { n: 2, title: '已篩選', body: '開啟時 Status 只選 Not sent，按鈕直接寫 Not sent；清掉篩選就看到全部送出的訊息。' },
          { n: 3, title: '重寄', body: <><C>Resend to not sent (n)</C>：打開訊息詳情的 Resend 模式，收件人只有完全沒收到的人，同一個通道與內容（可改）；送出後是一則新訊息。</> },
        ]} />
      </Section>
    </>
  )
}

function Dialogs() {
  return (
    <>
      <Section eyebrow="Overview" title="對話框一覽" lead="都使用設計系統 Dialog：標題、內容、右下角按鈕（Cancel 在左、主要動作在右），不放副標。點遮罩、Esc 或右上角關閉都等於取消。">
        <SpecTable head={['對話框', '開啟方式', '寬度', '主要動作']} nowrap={[0]} rows={[
          ['未送出名單（Sent details，只看 Not sent）', '狀態下方 {n} not sent', '1280', 'Resend to not sent (n)'],
          ['發送明細（Sent details）', '訊息詳情 Audience 右上角的 Sent details', '1280', 'Resend to not sent (n)；都收到時只有 Close'],
          ['取消傳送', '列選單或訊息詳情底部的 Cancel sending', '480', 'Cancel sending（紅色）'],
          ['要捨棄變更嗎？', '改過內容沒儲存就關閉訊息詳情', '480', 'Discard（紅色）'],
          ['重新傳送給沒收到的人（訊息詳情的 Resend 模式）', 'Sent details 的 Resend to not sent (n)', '1120', 'Resend／Schedule resend'],
          ['成員', '訊息詳情 Audience 表格中組織或群組的人數連結', '640', '無（只有關閉）'],
        ]} />
      </Section>
      <Section eyebrow="Confirm" title="取消傳送" lead="寬 480：標題、一句說明、兩個按鈕。說明寫出是哪一個通道；只作用在這個通道。">
        <div className="spec-gallery">
          <figure><figcaption><b>取消傳送</b><span>這個通道不再送出，紀錄留在列表，狀態 Canceled。</span></figcaption><div className="spec-canvas"><Shot name="dlg-cancel" alt="取消傳送" max={520} /></div></figure>
        </div>
        <SpecTable head={['對話框', '標題', '說明', '關閉', '確認']} nowrap={[0]} rows={[
          ['取消傳送', <Copy en="Cancel sending?" zh="要取消傳送嗎？" />, <Copy en="It won’t be sent on <通道>. The record stays in the list." zh="不會用 <通道> 送出，紀錄仍會留在列表。" />, <Copy en="Keep" zh="保留" />, <Copy en="Cancel sending" zh="取消傳送" />],
        ]} />
        <Notes items={[{ title: '取消傳送的關閉按鈕', body: '用 Keep 而不是 Cancel，避免和確認按鈕 Cancel sending 混淆。' }]} />
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

