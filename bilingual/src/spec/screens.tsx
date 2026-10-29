// Spec tabs that show screens: list, details, not-sent list, and the clickable flow
import * as React from 'react'
import {
  Button, Dialog, DialogContent, DialogDescription, DialogTitle, SegmentedControl, SegmentedControlItem,
  Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, toast,
} from '@qijenchen/design-system'
import { ArrowLeft } from 'lucide-react'
import type { Row } from '../lib/data'
import { L } from '../lib/i18n'
import { Frame, Notes, Section, SpecTable, type Note } from './parts'
import { ComposePrefill, DetailActions, DetailPanel, DetailView, ListScreen, NotSentView, RowMenuStatic } from './mocks'
import { LIST_ROWS, MISS_FEW, MISS_MANY, OTHERS, SCENARIOS, type Scenario } from './specData'

// ---------- list ----------
const LIST_NOTES: Note[] = [
  { n: 1, title: '新訊息', body: '頁面主要操作，放在頁首右側。' },
  { n: 2, title: '搜尋', body: '比對標題、內容、寄件人、範本名稱；輸入即篩選。' },
  { n: 3, title: '篩選', body: '狀態、通道各自可複選。套用時按鈕變藍並顯示數量，不另外列出條件。' },
  { n: 4, title: '寄件人', body: '固定在最左，左右捲動時不動。' },
  { n: 5, title: '訊息', body: '標題與內文合併為一欄（寬 400px，隨視窗加寬）：上行是標題，連結樣式，點了從右側打開詳情；下行是內文第一行，次要色。兩行過長都截斷並加「…」。' },
  { n: 6, title: '通道', body: '每個勾選的通道一個只有圖示的標籤，SMS 備援為黃色；滑鼠移上顯示通道名稱。' },
  { n: 7, title: '狀態', body: <>四種狀態標籤，規則見「狀態呈現」分頁。</> },
  { n: 8, title: '已送達', body: '「已送達 / 總人數」，以人計。傳送中加進度條。' },
  { n: 9, title: 'n 人未送達', body: '送完且有人沒收到時出現，黃色連結，點了打開未成功名單。' },
  { n: 10, title: '列選單', body: '查看、複製成新訊息、下載未送達名單；自己的排程訊息另有編輯與取消。' },
  { n: 11, title: '筆數與更新時間', body: '分頁列固定在底部；「更新於」標示傳送中的數字是哪個時間點的結果。' },
]

export function ListTab() {
  const half: Note[] = LIST_NOTES
  return (
    <>
      <Section eyebrow="Screen 1" title="訊息列表" lead="表格填滿視窗高度，資料多時只有表格內捲動，表頭與分頁列固定。每頁 10 筆，預設依建立時間新到舊。">
        <Frame label="A. 預設" sub="六列各代表一種要處理的情況：傳送中、已排程、部分未送達、已送出、別人的訊息、傳送失敗" width={1180}>
          <ListScreen rows={LIST_ROWS} pins />
        </Frame>
        <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
          <Notes items={half.slice(0, 6)} />
          <Notes items={half.slice(6)} />
        </div>
      </Section>
      <Section eyebrow="States" title="列表的其他狀態" lead="每個狀態都要有畫面，避免開發時各自發揮。">
        <div className="flex flex-col gap-10">
          <Frame label="B. 篩選中" sub="狀態篩選了 2 項：按鈕變藍並顯示數字" width={1180}><ListScreen rows={LIST_ROWS} mode="filtered" /></Frame>
          <Frame label="C. 篩選無結果" sub="表格內顯示空狀態與「清除篩選」" width={1180}><ListScreen rows={LIST_ROWS} mode="noResult" /></Frame>
          <Frame label="D. 還沒有任何訊息" sub="第一次使用：不顯示工具列與表格，引導建立第一則" width={1180}><ListScreen rows={[]} mode="firstUse" /></Frame>
          <Frame label="E. 載入中" sub="表格位置顯示骨架，不顯示空狀態" width={1180}><ListScreen rows={[]} mode="loading" /></Frame>
          <Frame label="F. 載入失敗" sub="說明原因與重試；工具列保留" width={1180}><ListScreen rows={[]} mode="error" /></Frame>
        </div>
      </Section>
      <Section eyebrow="Permissions" title="列選單：自己的與別人的" lead="可以看到同部門或同發送單位的訊息，但只有建立者能編輯或取消排程、重試。">
        <SpecTable head={['', '自己建立的', '別人建立的（同部門）']} rows={[
          ['已排程', <RowMenuStatic own status="scheduled" />, <RowMenuStatic own={false} status="scheduled" />],
          ['已送出', <RowMenuStatic own status="sent" />, <RowMenuStatic own={false} status="sent" />],
          ['傳送失敗', <RowMenuStatic own status="error" />, <RowMenuStatic own={false} status="error" />],
        ]} />
        <p className="spec-lead">範例中「{LIST_ROWS.filter(r => OTHERS.has(r.id)).map(r => r.sender).join('」「')}」兩列是別人建立的，建立者欄顯示不同的人。</p>
      </Section>
    </>
  )
}

// ---------- details ----------
const DETAIL_NOTES: Note[] = [
  { n: 1, title: '標頭', body: '狀態標籤與標題。從列表點標題打開，關閉後回到原本的列表位置。' },
  { n: 2, title: '送達結果', body: '大數字「已送達 / 總人數」＋進度條；有人沒收到時，右側黃色「n 人未送達」打開名單。已排程改為說明何時傳送。' },
  { n: 3, title: '各通道結果', body: '每個通道一列：應送、已送達、未送達。勾了多個通道時，各通道人數加總會大於總人數。' },
  { n: 4, title: 'SMS 備援', body: '縮排在 Device Notifications 下方，應送人數只算推播沒送達的人。經 SMS 收到的人算已送達，表格下方一行說明。' },
  { n: 5, title: '未送達原因', body: '依原因分組計數，讓寄件人判斷要不要補發、要不要找 IT。' },
  { n: 6, title: '收件人結果', body: '逐人的送達方式：Device Notifications、「經 SMS 送達」（黃）、「未送達」（紅）＋原因。完整清單另開。' },
  { n: 7, title: '時間軸', body: '建立、核准（需要時）、開始傳送、完成或失敗的時間。' },
  { n: 8, title: '操作', body: '下載未送達名單、複製成新訊息；自己的排程訊息加取消與編輯；失敗時重試放在錯誤提示上。' },
]
const DIFF: Record<Scenario['key'], string> = {
  scheduled: '還沒有結果：送達結果改成一句說明，沒有通道結果、原因與收件人。自己的排程訊息可編輯、取消。',
  progress: '數字會更新，顯示「更新於」。通道列下方標出還在傳送的人數；未送達只計已確定失敗的人，不出現黃色連結。',
  sentAll: '全數送達：進度條為綠色，沒有原因與名單。這則是別人建立的，所以沒有編輯類操作。',
  sentSome: 'PRD 例外的主要畫面：3 人推播與 SMS 都失敗。SMS 備援列與收件人結果都標出「經 SMS 送達」。',
  failed: '沒有人收到：最上方錯誤提示說明原因並提供重試；通道列全部未送達。',
}

export function DetailTab() {
  const [k, setK] = React.useState<Scenario['key']>('sentSome')
  const s = SCENARIOS.find(x => x.key === k)!
  return (
    <Section eyebrow="Screen 2" title="單筆詳情" lead="從右側滑出的面板（寬 560px），由上到下回答：送到了嗎、哪個通道出問題、為什麼。切換狀態看各版差異。">
      <div className="max-w-full overflow-x-auto">
        <SegmentedControl value={k} onValueChange={v => v && setK(v as Scenario['key'])} aria-label="詳情狀態">
          {SCENARIOS.map(x => <SegmentedControlItem key={x.key} value={x.key}>{x.label[1]}</SegmentedControlItem>)}
        </SegmentedControl>
      </div>
      <p className="spec-lead"><b className="text-foreground">這個狀態：</b>{DIFF[k]}</p>
      <Frame label={'詳情 · ' + s.label[1]} sub={s.title} width={560} notes={DETAIL_NOTES}>
        <DetailPanel s={s} pins />
      </Frame>
    </Section>
  )
}

// ---------- not-sent list ----------
const FAILED_NOTES: Note[] = [
  { n: 1, title: '標題', body: '「x / 總人數 人未送達」，下方是訊息標題。' },
  { n: 2, title: '搜尋與原因篩選', body: '搜尋姓名、工號、NT 帳號；原因不只一種時，用按鈕依原因篩選並顯示人數。' },
  { n: 3, title: '名單', body: '收件人（固定在左）、組織、沒送到的通道、原因（第二行是 SMS 備援結果）。' },
  { n: 4, title: '超過 100 人', body: '只顯示前 100 人並說明，完整名單請下載。上限待確認。' },
  { n: 5, title: '下載與發新訊息', body: '「下載名單」下載 Excel；「用這份名單發新訊息」帶入收件人與原內容，進入發送流程第 1 步。' },
]
export function FailedTab() {
  const [v, setV] = React.useState<'few' | 'many'>('few')
  return (
    <>
      <Section eyebrow="Screen 3" title="未成功名單" lead="入口有三個，都開同一個對話框：列表的黃色「n 人未送達」、詳情的送達結果、列選單的「下載未送達名單」。名單的目的是補發，所以直接提供發新訊息。">
        <SegmentedControl value={v} onValueChange={x => x && setV(x as 'few' | 'many')} aria-label="名單人數">
          <SegmentedControlItem value="few">少量（3 人）</SegmentedControlItem>
          <SegmentedControlItem value="many">大量（128 人）</SegmentedControlItem>
        </SegmentedControl>
        <Frame label={v === 'few' ? '對話框 · 少量' : '對話框 · 大量'} sub="寬 760px，高度隨內容" width={760} notes={FAILED_NOTES}>
          {v === 'few'
            ? <NotSentView list={MISS_FEW} total={96} title="Typhoon alert: work from home on 10/17" pins />
            : <NotSentView list={MISS_MANY} total={412} title="Chiller maintenance tonight 18:00–22:00" pins many />}
        </Frame>
      </Section>
      <Section eyebrow="Download" title="下載檔案" lead="下載內容與畫面一致，私人手機一律遮蔽。">
        <SpecTable head={['項目', '規格']} rows={[
          ['格式', 'Excel（.xlsx）；是否另提供 CSV 待確認'],
          ['檔名', <code>MNP_未送達_&lt;訊息標題&gt;_&lt;傳送日期&gt;.xlsx</code>],
          ['欄位', '姓名、NT 帳號、工號、組織、沒送到的通道、原因、SMS 備援結果'],
          ['個資', '私人手機遮蔽為 09••-•••-123，與畫面一致'],
          ['權限', '別人建立的訊息能否下載待確認'],
        ]} />
        <SpecTable head={['姓名', 'NT 帳號', '工號', '組織', '沒送到的通道', '原因', 'SMS 備援結果']} rows={MISS_FEW.map(x => [
          x.p.zh + ' ' + x.p.en, x.p.nt, x.p.emp, x.p.org, x.chans.map(c => c === 'sms' ? 'SMS' : 'Device Notifications').join('、'), x.why[1], x.sms[1],
        ])} />
      </Section>
    </>
  )
}

// ---------- clickable flow ----------
const FLOW_ROWS: Row[] = LIST_ROWS.filter(r => ['m012', 'm016', 'm010'].indexOf(r.id) >= 0)
const SCN_FOR: Record<string, Scenario['key']> = { m012: 'sentSome', m016: 'progress', m010: 'sentAll' }
const STEPS = [
  '在列表找到「Typhoon alert」那列，點黃色的「3 人未送達」。',
  '對話框列出沒收到的 3 人與原因，可以搜尋、下載。',
  '點「用這份名單發新訊息」。',
  '進入發送流程第 1 步，收件人已帶入。',
]
export function FlowTab() {
  const [step, setStep] = React.useState(0)
  const [det, setDet] = React.useState<Scenario | null>(null)
  const [ns, setNs] = React.useState(false)
  const openNs = () => { setNs(true); setStep(1) }
  const resend = () => {
    setNs(false); setDet(null); setStep(3)
    toast({ variant: 'success', title: L('Added 3 receivers', '已帶入 3 位收件人') })
  }
  const reset = () => { setStep(0); setNs(false); setDet(null) }
  return (
    <Section eyebrow="Flow" title="互動流程：補發給沒收到的人" lead="PRD 的第三個 user story。這一段可以實際點：也可以點標題打開詳情，從詳情進入名單。">
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <ol className="spec-notes">
          {STEPS.map((t, i) => (
            <li key={i}>
              <span className="spec-pin" style={i <= step ? undefined : { background: 'var(--spec-line)', color: 'var(--spec-muted)' }} aria-label={'步驟 ' + (i + 1)}>{i + 1}</span>
              <div><b style={i === step ? undefined : { fontWeight: 400 }}>{t}</b></div>
            </li>
          ))}
          <li><span /><div><Button variant="tertiary" size="sm" onClick={reset}>重新開始</Button></div></li>
        </ol>
        <div className="spec-canvas">
          <div className="spec-screen" style={{ width: 920 }}>
            {step === 3 ? (
              <div className="flex flex-col">
                <div className="flex h-12 items-center gap-2 border-b border-divider px-4">
                  <Button variant="text" size="sm" iconOnly startIcon={ArrowLeft} aria-label={L('Back to messages', '回到訊息列表')} onClick={reset} />
                  <span className="text-body-lg">{L('Messages', '訊息')} <span className="text-fg-muted">›</span> {L('New message', '新訊息')}</span>
                </div>
                <ComposePrefill list={MISS_FEW} title="Typhoon alert: work from home on 10/17" />
              </div>
            ) : (
              <ListScreen rows={FLOW_ROWS} onNotSent={r => { if (r.id === 'm012') openNs() }} onTitle={r => setDet(SCENARIOS.find(x => x.key === SCN_FOR[r.id]) || null)} />
            )}
          </div>
        </div>
      </div>
      <Sheet open={!!det} onOpenChange={o => { if (!o) setDet(null) }}>
        {det ? (
          <SheetContent side="right" className="w-full sm:max-w-[560px]">
            <SheetHeader><SheetTitle className="sr-only">{det.title}</SheetTitle><SheetDescription className="sr-only">{L('Message details', '訊息詳情')}</SheetDescription></SheetHeader>
            <SheetBody><div className="pb-5"><DetailView s={det} onNotSent={openNs} /></div></SheetBody>
            <SheetFooter><DetailActions s={det} onClose={() => setDet(null)} /></SheetFooter>
          </SheetContent>
        ) : null}
      </Sheet>
      <Dialog open={ns} onOpenChange={o => { setNs(o); if (!o && step === 1) setStep(0) }}>
        {ns ? (
          <DialogContent maxWidth={760} height="hug">
            <DialogTitle className="sr-only">{L('3 of 96 not sent', '3 / 96 人未送達')}</DialogTitle>
            <DialogDescription className="sr-only">Typhoon alert: work from home on 10/17</DialogDescription>
            <NotSentView list={MISS_FEW} total={96} title="Typhoon alert: work from home on 10/17" onResend={() => { setStep(2); resend() }} />
          </DialogContent>
        ) : null}
      </Dialog>
    </Section>
  )
}
