// Batch import tags: the design (option E of the tag study since 2026-11-23, fix first by default; each entry identified
// as it comes in and a pick known at once, 2026-11-23; third version the same day: a pasted batch is identified and its
// red ones gathered at once, typed ones stay put (gray, or red), anything red turns Proceed off, Proceed checks the gray ones; labels by data type; a live demo at the top) and why each part is the way it is, with screenshots of the study (tools/tagwhy-shots.mjs). Answers "why not
// show the person for a phone number" (2026-11-19). 2026-11-20: the text cut to what's needed, a little larger
// (tagwhy.css). Nothing here changes the prototype.
import * as React from 'react'
import { Figure, Notes, Section, Shot, SpecTable, type Note } from '../parts'
import { Demo } from '../importtags/ImportTags'

// one design decision: the screenshot, then what it does and why; what was set aside follows with its own screenshot(s)
// (2026-11-20: every set-aside way has a picture to compare)
function Why({ shot, title, sub, how, why, not, notShots, max }: { shot: string; title: string; sub?: string; how: React.ReactNode; why: React.ReactNode; not?: React.ReactNode; notShots?: [string, string][]; max?: number }) {
  const notes: Note[] = [{ title: '做法', body: how }, { title: '依據', body: why }]
  if (not && !notShots) notes.push({ title: '沒有這樣做', body: not })
  return (
    <>
      <Figure label={title} sub={sub} shot={shot} max={max} notes={notes} wideNotes />
      {notShots ? <Alt text={not} shots={notShots} /> : null}
    </>
  )
}

// what was set aside: the reason, then the screenshot(s) of how it looks
function Alt({ text, shots }: { text: React.ReactNode; shots: [string, string][] }) {
  return (
    <figure className="spec-frame tw-alt">
      <figcaption><b>沒有這樣做</b><span>{text}</span></figcaption>
      {shots.map(([n, c]) => (
        <div key={n} className="flex flex-col gap-1">
          {c ? <span className="tw-alt-cap">{c}</span> : null}
          <div className="spec-canvas"><Shot name={n} alt={c || '沒有這樣做'} pins={false} /></div>
        </div>
      ))}
    </figure>
  )
}

// screenshots one above the other, each with a caption
function Shots({ items }: { items: [string, string, string][] }) {
  return (
    <div className="flex flex-col gap-[var(--layout-space-loose)]">
      {items.map(([n, t, d]) => (
        <figure key={n} className="spec-frame"><figcaption><b>{t}</b><span>{d}</span></figcaption><div className="spec-canvas"><Shot name={n} alt={t} pins={false} /></div></figure>
      ))}
    </div>
  )
}

export default function TagWhy() {
  return (
    <div className="tw">
      <div className="spec-top">
        <div className="spec-wrap flex flex-col gap-1 pt-4 pb-3">
          <span className="spec-eyebrow">MNP · Batch import · 標籤</span>
          <h1 className="spec-h1">批次匯入標籤的設計依據</h1>
          <span className="tw-sub">2026/11/23 · 截圖用原型的範例資料</span>
        </div>
      </div>
      <main className="spec-wrap spec-main">
        <Section eyebrow="Try" title="先試試" lead="現在的設計，可以直接操作。範例裡 cm.chen 格式錯；a19999、gywuu 格式對，但查無此人。">
          <Demo mode="E" show="type" />
        </Section>

        <Section eyebrow="Summary" title="貼上就辨識，打字不動順序" lead="貼上的一批一進來就送後端辨識，查完紅的集中到最後；手動打的留在原位，按 Proceed 才嚴格驗證。只要有紅色，Proceed 就停用。">
          <SpecTable head={['時機', '做什麼', '說明文字']} nowrap={[0]} rows={[
            ['貼上一批', '格式錯的馬上變紅；其他的變淡、一批批換成結果；查完，紅的（含之前的）集中到最後', 'Checking 6 of 24… → 22 valid, 3 invalid. Fix or remove invalid to proceed. Remove invalid'],
            ['打字時選了推薦', '已經確定，原位變成人名', '23 valid'],
            ['打字沒選推薦', '原位保持輸入的值（灰色）；格式錯，或 NT 帳號、工號、Org ID 不在推薦清單裡，原位變紅', '23 valid, 1 not checked yet'],
            ['有紅色時', 'Proceed 停用（一定要先改完）', 'Fix or remove invalid to proceed. Remove invalid'],
            ['按 Proceed', '灰色的送後端嚴格驗證；全部有效就加入、關閉；驗出紅的就集中到最後', 'Checking 0 of 1…'],
          ]} />
        </Section>

        <Section eyebrow="Paste" title="貼上：一進來就辨識，紅的集中到最後">
          <Shots items={[
            ['e-paste', '辨識中', 'cm.chen 格式錯，馬上變紅；其他的先變淡、不能點，一批一批換成結果；有紅色，Proceed 停用'],
            ['e-checked', '辨識完', '有效的換成姓名，紅的集中到最後、緊接輸入框；欄位紅框'],
          ]} />
          <Notes cols items={[
            { title: '依據', body: '貼上的通常是一大串，錯的散在各處很難找；查完一次集中，名單再長也一眼找到。移動只發生在貼上那一刻，使用者還沒開始看個別的標籤。' },
            { title: '為什麼一進來就辨識', body: '幾千筆的等待從貼上就開始，和使用者看名單的時間重疊。' },
          ]} />
          <Alt text="紅色排最前面：要捲回最上面才看得到，順序也對不回原始清單。" shots={[['alt-redfirst', '紅色排最前面（原型目前的做法）']]} />
        </Section>

        <Section eyebrow="Type" title="手動輸入：不動順序">
          <Why shot="e-typed" title="打 thliu、kyliin，都沒選推薦" sub="thliu 是灰色（還沒驗證）；kyliin 不在推薦清單裡，馬上變紅；都留在原位" max={1184}
            how="選了推薦就是人名；沒選就保持輸入的值。格式錯，或 NT 帳號、工號、Org ID 在推薦清單裡沒有完全相同的，馬上變紅。其他的（例如外部電話、外部 Email）是灰色，按 Proceed 才嚴格驗證。"
            why="打字時標籤就在游標旁邊，原位變紅最好改；位置一動，剛打的就找不到了。推薦清單已經是後端查的結果，NT 帳號、工號、Org ID 沒有完全相同的，就是不存在。推薦清單沒有回應（例如 API 出錯）時不判紅，保持灰色，按 Proceed 再驗。" />
        </Section>

        <Section eyebrow="Proceed" title="按 Proceed：嚴格驗證灰色的">
          <Shots items={[
            ['e-proceed', '紅的都處理完，按 Proceed', '灰色的 thliu 送後端，原位驗證；Proceed 轉圈等。全部有效就加入、關閉；驗出紅的就集中到最後'],
          ]} />
          <Notes cols items={[
            { title: '依據', body: '只要有紅色就不能往下，使用者一定先處理；驗證灰色的時候，紅的已經都處理掉了，所以驗出新的紅色通常只有幾筆。' },
            { title: '最後一個值沒打逗號', body: '按 Proceed 或離開輸入框時，剩下的文字也一起加入，照手動輸入的規則處理。' },
          ]} />
        </Section>

        <Section eyebrow="Fix first" title="有無效的：一定要先處理">
          <Why shot="e-removed" title="按 Remove invalid" sub="無效的一次移除，Proceed 可以按"
            how="只要有紅色，說明文字就寫 Fix or remove invalid to proceed.，後面緊接 Remove invalid；改好、刪掉，或按 Remove invalid 之後，Proceed 才能按。"
            why="這是發通知的系統，沒加到誰要讓使用者自己確認過。Remove invalid 一下就清掉，等於明確表示「我知道這幾筆不會加入」，不用另跳確認視窗；加入的名單就是畫面上看到的。"
            not="可略過（Proceed 直接加入有效的）：說明文字容易漏看，使用者可能不知道有人沒加到。跳確認視窗：疊在對話框上，要先關掉才能改，團隊先前也否決過。"
            notShots={[['alt-skip', '可略過：Proceed 可以按，會略過無效的'], ['alt-modal', '跳確認視窗（11/17 的 verify-on-Add）']]} />
          <SpecTable head={['', '一定要先改完（建議）', '可略過無效的']} nowrap={[0]} rows={[
            ['有無效值時', 'Proceed 停用，要先改或按 Remove invalid', 'Proceed 可以按，直接加入有效的'],
            ['好處', '使用者一定知道哪些沒加到；加入的就是看到的', '少一次點擊，想快點加完的人比較方便'],
            ['壞處', '多按一次 Remove invalid', '說明文字容易漏看，可能不知道有人沒加到'],
          ]} />
          <div className="spec-callout">建議一定要先改完：這是發通知的系統，少通知到人的代價比多按一下高。</div>
        </Section>

        <Section eyebrow="Edit" title="修改：點標籤變回文字">
          <Shots items={[
            ['nt-edit', '現在', '標籤變回文字，游標在字裡，位置不變'],
            ['now-edit', '之前', '換成一個有外框的輸入框，像欄位裡又有一個欄位'],
          ]} />
          <Notes cols items={[
            { title: '依據', body: '改錯字就是改字，和 Gmail、Outlook 的收件人欄一樣。' },
            { title: '結束', body: 'Enter 或點別處儲存，Esc 取消，清空就是刪除。' },
          ]} />
        </Section>

        <Section eyebrow="Suggest" title="打字時：選單列出比對到的人">
          <Shots items={[
            ['nt-type-sug', '在名單最後打字時', '打 chen，列出符合的人'],
            ['nt-type-pick', '選了之後', '馬上變成 Jimmy Chen 的標籤'],
            ['nt-edit-sug', '修改標籤時', '打 ytch，出現 Tina Chang'],
            ['e-fixed', '選了 Tina Chang', '在原位變成她；其他紅的不動'],
          ]} />
          <Notes cols items={[
            { title: '依據', body: '選單是後端查出來的，選了就是確定的人，直接顯示結果。' },
            { title: '不選也可以', body: '直接按逗號，保持輸入的值（灰色），按 Proceed 再驗證。外部 Email、外部號碼不會對到人，不出現選單。' },
          ]} />
        </Section>

        <Section eyebrow="After" title="再貼一批">
          <Shots items={[
            ['e-more', '再按一次貼上', '一進來就辨識；新的紅色（kylln、a20001）集中到最後，Proceed 停用'],
          ]} />
          <Alt text="修好就重新排序（原型目前的做法）：修好的那一筆馬上跳走，找不到它。" shots={[['alt-jump', 'a19999 原本排第一個；改好後跳到第 9 個']]} />
        </Section>

        <Section eyebrow="Keyboard" title="鍵盤：和收件人欄一樣">
          <Why shot="key-focus" title="從輸入框按 ← 移到標籤上" sub="有焦點框；紅色標籤同時顯示原因"
            how="整個欄位只佔一個 Tab 位置，用左右鍵在標籤之間移動（見下表）。"
            why="使用者習慣 Gmail、Outlook 的操作；名單有幾百筆時，按 Tab 不必經過每個標籤。"
            not="空的輸入框按 Backspace 直接刪掉最後一個標籤：容易誤刪。"
            notShots={[['alt-bs-before', '游標在名單最後，輸入框是空的'], ['alt-bs-after', '按一次 Backspace：Yvonne Chou 直接被刪掉']]} />
          <SpecTable head={['在哪裡', '按鍵', '結果']} nowrap={[0, 1]} rows={[
            ['輸入框', '←（游標在最前面）', '移到最後一個標籤'],
            ['輸入框（空的）', 'Backspace', '移到最後一個標籤；再按一次才刪'],
            ['標籤上', '← / →', '前一個／後一個；最後一個按 → 回到輸入框'],
            ['標籤上', 'Home / End', '第一個標籤／回到輸入框'],
            ['標籤上', 'Enter', '修改'],
            ['標籤上', 'Backspace / Delete', '刪除，焦點移到旁邊那一個'],
            ['標籤上', '打字、Esc', '回到輸入框'],
            ['任何地方', 'Tab', '離開欄位'],
          ]} />
        </Section>

        <Section eyebrow="Labels" title="驗證後標籤顯示什麼" lead="看使用者手上的清單是什麼：看不出是誰的代碼顯示姓名，看得懂的值照原樣顯示。">
          <SpecTable head={['資料類型', '標籤', '滑過', '依據']} nowrap={[0]} rows={[
            ['NT accounts、Employee IDs', '大頭照與姓名', '輸入的值 · 組織', '代碼看不出是誰；打錯一個字可能是另一個人，看姓名才發現'],
            ['Emails、Phone numbers、MVPN', '輸入的值', '—', '使用者拿自己的清單來對；值本身看得懂'],
            ['Org IDs', '組織代碼', '名稱 · 人數', '代碼難懂，看名稱才確定沒選錯'],
            ['無效的', '紅色，輸入的值', '原因', '要知道怎麼改'],
          ]} />
          <Shots items={[
            ['phone-paste', 'Phone numbers', '顯示輸入的號碼，統一格式；沒有滑過提示'],
            ['org', 'Org IDs', '顯示代碼，滑過看名稱和人數'],
          ]} />
        </Section>

        <Section eyebrow="Why not" title="為什麼電話不顯示成人">
          <Shots items={[['phone-names', '如果都換成姓名', '對到的變「姓名 · 號碼」，沒對到的只能是號碼：一半人、一半號碼，標籤也變長']]} />
          <ol className="spec-notes cols">
            {[
              ['清單一定混到不是人的號碼', '外部、值班機都只能顯示號碼，一份清單會有兩種長相。'],
              ['使用者拿號碼清單來對', '畫面變成姓名，就對不回自己的清單。'],
              ['一人多支、一支多人', '兩支號碼都顯示同一個名字，看起來像重複；值班機顯示誰都不對。'],
              ['標籤變兩倍長', '同時要姓名和號碼，一個畫面只看得到一半。'],
            ].map(([t, b], i) => <li key={i} style={{ gridTemplateColumns: 'auto minmax(0, 1fr)' }}><span className="spec-pin">{i + 1}</span><div><b>{t}</b><p>{b}</p></div></li>)}
          </ol>
          <SpecTable head={['', 'NT 帳號、Employee ID', 'Email、電話、MVPN']} nowrap={[0]} rows={[
            ['看值知道是誰嗎', '不知道', '通常知道，或根本不是人'],
            ['打錯一個字', '可能變成另一個人', '通常對不到人，變紅色'],
            ['一定對到一個人嗎', '是', '不一定'],
          ]} />
          <div className="spec-callout">是誰，打字時的選單和按 Proceed 之後的收件人表格都看得到。</div>
        </Section>

        <Section eyebrow="Numbers" title="電話與 MVPN：以號碼為單位">
          <SpecTable head={['情況', '結果']} nowrap={[0]} rows={[
            ['號碼屬於一個人', '加入這個人，SMS 寄到這支'],
            ['一人兩支', '兩個標籤，兩支都寄'],
            ['一支多人共用（值班機）', '加入這支號碼，只寄一封；要寄給其中一人，在選單選他'],
            ['不屬於員工', '外部號碼，照樣寄'],
          ]} />
          <Notes items={[{ title: '依據', body: '使用者給的是號碼，就是要寄到這一支，不是舊系統隨機挑的那支。' }]} />
        </Section>

        <Section eyebrow="Region" title="電話：先選國碼">
          <Why shot="region" title="選 Phone numbers 時多一個 Region" max={760}
            how="預設 +886 (TW)；以 + 開頭的號碼用自己的國碼。"
            why="Excel 裡的號碼通常沒有國碼，要先知道地區才能判斷號碼。" />
        </Section>

        <Section eyebrow="Guard" title="換資料類型前先確認">
          <Why shot="confirm" title="名單有東西時換類型" max={496}
            how="確認後才清空並換類型；名單是空的就直接換。"
            why="換類型一定要清空，幾千筆不該因為一次誤點就沒了。" />
        </Section>

        <Section eyebrow="Copy" title="文字">
          <SpecTable head={['項目', '內容', '依據']} nowrap={[0]} rows={[
            ['辨識中、驗證中', 'Checking {x} of {y}…', '前面一個 DS 轉圈（CircularProgress）；打字時查幾筆不顯示'],
            ['有灰色的', '{n} valid, {k} not checked yet', '只有灰色時：{k} entries'],
            ['有紅色的', '{n} valid, {m} invalid. Fix or remove invalid to proceed. Remove invalid', '紅字（Remove invalid 是藍色連結），欄位紅框，Proceed 停用'],
            ['按鈕', 'Proceed', '從頭到尾同一個名字；按了是驗證灰色的、或回到收件人欄位，不是寄出；驗證時轉圈等待'],
          ]} />
        </Section>

        <Section eyebrow="Open" title="待工程確認">
          <SpecTable head={['問題', '原因']} nowrap={[0]} rows={[
            ['辨識能不能在貼上時就開始、一次查一批（和選單同一支 API）', '一進來就辨識的前提；幾千筆要多久、能不能分批回傳'],
            ['推薦清單能不能回傳「有沒有完全相同的」', 'NT 帳號、工號、Org ID 打完沒選推薦時，馬上判斷要不要變紅；沒有回應時保持灰色'],
            ['每種資料類型的格式規則', '前端格式檢查要和後端一致'],
            ['SMS 能否指定寄到哪一支', '舊系統隨機挑一支公司手機'],
            ['選單查詢速度', '公司超過 10 萬人'],
          ]} />
        </Section>
      </main>
    </div>
  )
}
