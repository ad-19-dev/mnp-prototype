// UI flow for sending a message: every screen from "+ New message" to the outcome, with the actions that lead
// from one to the next. Screens are the prototype's own screenshots (shared with the send-flow spec); click one
// to see it full size.
import * as React from 'react'
import { StatusTag } from '../../components/ui'
import { Shot } from '../parts'

const PROTO = 'https://claude.ai/artifact/3wDkTsa8LZcfDikRr1RhWv'
const SPEC = 'https://claude.ai/artifact/5Cp4EoipMcFczPk314XxRK'

type Kind = 'dialog' | 'action' | 'error' | 'done'
const KIND: Record<Kind, string> = { dialog: '對話框', action: '其他操作', error: '驗證錯誤', done: '結果' }

function Branch({ kind, title, when, then, shots = [], alt }: { kind: Kind; title: string; when: React.ReactNode; then?: React.ReactNode; shots?: string[]; alt?: string }) {
  return (
    <article className={'flow-branch' + (shots.length > 1 ? ' is-wide' : '')}>
      <header><span className={'flow-kind is-' + kind}>{KIND[kind]}</span><b>{title}</b></header>
      <span className="flow-when">{when}</span>
      {shots.length ? (
        <div className={shots.length > 1 ? 'flow-pair' : undefined}>
          {shots.map(n => <div key={n} className="spec-canvas"><Shot name={n} alt={alt || title} pins={false} /></div>)}
        </div>
      ) : null}
      {then ? <span className="flow-then">{then}</span> : null}
    </article>
  )
}

function Stage({ id, step, title, desc, main, mainAlt, children }: { id: string; step: string; title: string; desc: React.ReactNode; main: string; mainAlt: string; children?: React.ReactNode }) {
  return (
    <section className="flow-stage" id={id} aria-labelledby={id + '-h'}>
      <div className="flow-main">
        <span className="flow-step">{step}</span>
        <h2 id={id + '-h'}>{title}</h2>
        <p>{desc}</p>
        <div className="spec-canvas"><Shot name={main} alt={mainAlt} pins={false} /></div>
      </div>
      {children ? <div className="flow-branches"><h3>從這一步可以</h3>{children}</div> : null}
    </section>
  )
}

const Next = ({ action, note }: { action: string; note?: string }) => (
  <div className="flow-next" role="note"><div><b>{action}</b>{note ? <span>{note}</span> : null}</div></div>
)

export default function FlowApp() {
  return (
    <>
      <div className="spec-top">
        <div className="spec-wrap flex flex-col gap-3 py-4">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="spec-eyebrow">MNP · New message</span>
            <h1 className="spec-h1">發送訊息 UI Flow</h1>
            <span className="text-caption text-fg-secondary">
              2026/11/05 · 團隊版 · 每個畫面都可以點開放大 · 細節規則見 <a className="text-primary hover:underline" href={SPEC} target="_blank" rel="noreferrer">發送訊息設計規格</a> · 實際操作見 <a className="text-primary hover:underline" href={PROTO} target="_blank" rel="noreferrer">MNP Teams prototype</a>（需密碼）
            </span>
          </div>
          <div className="flow-legend" aria-label="圖例">
            <span><i className="flow-key" style={{ background: 'var(--flow-main)' }} />主流程</span>
            <span><i className="flow-key" style={{ background: 'var(--flow-branch)' }} />對話框</span>
            <span><i className="flow-key" style={{ background: 'var(--spec-muted)' }} />其他操作</span>
            <span><i className="flow-key" style={{ background: 'var(--flow-error)' }} />驗證錯誤（停在原步驟）</span>
            <span><i className="flow-key" style={{ background: 'var(--flow-done)' }} />結果</span>
          </div>
        </div>
      </div>

      <main className="spec-wrap spec-main">
        <section className="spec-section" aria-label="流程總覽">
          <nav className="flow-map" aria-label="流程總覽">
            <a className="flow-stop" href="#entry"><b>訊息列表</b><span>+ New message</span></a>
            <span className="flow-arrow" aria-hidden>→</span>
            <a className="flow-stop" href="#step1"><b>1 · Audiences &amp; channels</b><span>收件人、通道、核准</span></a>
            <span className="flow-arrow" aria-hidden>→</span>
            <a className="flow-stop" href="#step2"><b>2 · Message</b><span>新訊息或模板、各通道內容</span></a>
            <span className="flow-arrow" aria-hidden>→</span>
            <a className="flow-stop" href="#step3"><b>3 · Review &amp; send</b><span>傳送時間、預覽、寄測試</span></a>
            <span className="flow-arrow" aria-hidden>→</span>
            <div className="flow-ends">
              <a className="flow-stop is-done" href="#done"><b>需要核准</b><span>結果頁 → 待核准</span></a>
              <a className="flow-stop is-done" href="#done"><b>立即傳送</b><span>回列表 → 傳送中</span></a>
              <a className="flow-stop is-done" href="#done"><b>排程傳送</b><span>回列表 → 已排程</span></a>
            </div>
          </nav>
        </section>

        <Stage id="entry" step="入口" title="訊息列表" mainAlt="訊息列表"
          desc="在任一發送空間的 Send messages 分頁，按頁首右上角的「+ New message」開始。訊息會建在目前所在的空間。" main="list-entry">
          <Branch kind="action" title="編輯" when={<>列選單「Edit」（<StatusTag s="scheduled" />）或「Edit and resubmit」（<StatusTag s="rejected" />）</>} then="同一個流程，帶入原本的內容；建立後覆蓋原訊息" />
          <Branch kind="action" title="複製" when="列選單「Duplicate to new message」" then="帶入收件人、通道和內容（不含傳送時間），建立後是新訊息" />
          <Branch kind="action" title="重寄" when="失敗名單的「Resend to N」" then="收件人換成失敗的人，其餘同複製" />
        </Stage>
        <Next action="按「+ New message」" />

        <Stage id="step1" step="步驟 1 / 3" title="Audiences & channels" mainAlt="步驟 1：收件人與通道"
          desc="加入收件人（人員、組織、群組、電話、Email、MVPN，最多 500 人），勾選通道。開了 SMS 備援要 SMS 核准；有外部收件人要主管核准，頁首會出現對應標籤。下方一行告訴你幾個人收得到。" main="s1-filled">
          <Branch kind="action" title="選收件人類型" when="輸入框左邊的下拉選單" shots={['s1-types']} then="輸入框提示字跟著換" />
          <Branch kind="action" title="搜尋並加入" when="輸入名字、NT 帳號或工號" shots={['s1-search']} then="按 Enter 加入第一筆，或點選單裡的人" />
          <Branch kind="action" title="加入群組" when="類型選 Group，還沒輸入時" shots={['s1-group']} then="列出這個空間的群組；加入後選單不關，可以連續加" />
          <Branch kind="dialog" title="批次匯入" when="按「Batch import」：先選資料類型，貼上或上傳名單" shots={['dlg-import', 'dlg-import2']} then="確認比對結果後按「Add N audiences」；找不到的留在名單框修正" />
          <Branch kind="dialog" title="查看群組成員" when="點收件人表格裡群組或組織的人數" shots={['dlg-members']} then="可搜尋的成員名單" />
          <Branch kind="dialog" title="選擇 SMS 號碼" when="開了 SMS 備援，有人有公司和個人兩支手機；按「Choose」，或沒選就按 Next 時自動打開" shots={['dlg-numbers']} then="每人選一支收 SMS" />
          <Branch kind="dialog" title="有人收不到" when="觸及人數顯示「N don’t」，按「See who」" shots={['s1-unreach', 'dlg-unreach']} then="看收不到的人和原因；可以一鍵加 Email 或 SMS 備援" />
          <Branch kind="action" title="緊急發送" when="開了 SMS 備援後，勾「It’s urgent: send without waiting for SMS approval」" shots={['s1-urgent']} then="必填原因；有外部收件人時仍要主管核准" />
          <Branch kind="dialog" title="存成群組" when="底部「Save as group」" shots={['dlg-savegroup']} then="把目前的員工收件人存成這個空間的群組" />
          <Branch kind="error" title="還沒填完就按 Next" when="沒有收件人、沒選通道、外部收件人缺通道、超過 500 人、緊急沒填原因" shots={['s1-errors']} then="停在這一步，標出錯誤並捲到第一個" />
        </Stage>
        <Next action="按「Next」" note="全部通過才前進；有人沒選 SMS 號碼時先打開選號碼" />

        <Stage id="step2" step="步驟 2 / 3" title="Message" mainAlt="步驟 2：訊息內容"
          desc="先選「New」或「Use template」，再依步驟 1 勾的通道填內容，順序固定：Device Notifications → SMS → Desktop OS → Email。每個欄位右上角有字數。" main="s2-empty">
          <Branch kind="action" title="使用模板" when="選「Use template」，再從右邊的選單挑一個" shots={['s2-tpl', 's2-filled']} then="填入各區塊的文字；已經寫了內容時先確認要不要取代" />
          <Branch kind="dialog" title="存成模板" when="底部「Save as template」（內容要先填完）" shots={['dlg-savetpl']} then="只填模板名稱，同空間不能重複" />
          <Branch kind="error" title="還沒填完就按 Next" when="寄件人、標題、內文、SMS 內容、Email 主旨或內文沒填，或超過字數" shots={['s2-errors']} then="停在這一步，標出每個缺的欄位" />
        </Stage>
        <Next action="按「Next」" note="回上一步按「Back」，內容都會保留" />

        <Stage id="step3" step="步驟 3 / 3" title="Review & send" mainAlt="步驟 3：確認送出"
          desc="選「Send now」或「Scheduled send」，確認收件人和核准，切換預覽看每個通道收到的樣子。主要按鈕一律是「Create message」。" main="s3-now">
          <Branch kind="action" title="排程傳送" when="選「Scheduled send」" shots={['s3-sched']} then="選 10 分鐘後到 30 天內的時間（台北時間），預設明天 09:00" />
          <Branch kind="action" title="切換預覽" when="預覽區右上角的分段控制" shots={['prev-desktop', 'prev-sms', 'prev-email']} then="Desktop OS、SMS、Email 各自的內容" />
          <Branch kind="action" title="寄測試給自己" when="底部「Send me a test」" then="寄到你的手機、電腦或信箱（不含 SMS），toast「Test sent」" />
          <Branch kind="dialog" title="緊急發送的確認" when="步驟 1 勾了緊急，按「Create message」時" shots={['dlg-urgent']} then="確認原因與紀錄後「Skip approval and send」" />
        </Stage>
        <Next action="按「Create message」" note="三個步驟再檢查一次，有錯就跳回那一步" />

        <section className="spec-section" id="done" aria-labelledby="done-h">
          <header>
            <span className="flow-step">結果</span>
            <h2 className="spec-h2" id="done-h">建立之後</h2>
            <p className="spec-lead">依「要不要核准」和「什麼時候送」走到三種結果之一。之後的狀態變化見訊息紀錄規格。</p>
          </header>
          <div className="flow-outcomes">
            <Branch kind="done" title="需要核准" when="有外部收件人（主管），或開了 SMS 備援且沒勾緊急（SMS 審核人員）" shots={['result']} then={<>「Sent for approval」結果頁；列表狀態 <StatusTag s="pending" /></>} />
            <Branch kind="done" title="不需核准・立即傳送" when="Send now" shots={['after-send']} then={<>回到列表，toast「Sending to N audiences」；狀態 <StatusTag s="progress" /> → <StatusTag s="sent" /></>} />
            <Branch kind="done" title="不需核准・排程傳送" when="Scheduled send" shots={['after-sched']} then={<>回到列表，toast「Scheduled for &lt;時間&gt;」；狀態 <StatusTag s="scheduled" /></>} />
          </div>
        </section>

        <section className="spec-section" aria-labelledby="any-h">
          <header><h2 className="spec-h2" id="any-h">任何一步都可以離開</h2></header>
          <div className="flow-anytime">
            <p className="spec-lead">按底部「Cancel」或點頁首麵包屑的空間名稱。填過任何東西時會先確認「Leave without sending?」，選「Discard」才離開；沒填過就直接回到列表。</p>
            <div className="spec-canvas"><Shot name="dlg-leave" alt="離開確認" pins={false} /></div>
          </div>
        </section>
      </main>
    </>
  )
}
