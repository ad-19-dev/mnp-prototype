// Batch import tags: the design (option E of the tag study since 2026-11-23, fix first by default; labels by data
// type; a live demo at the top) and why each part is the way it is, with screenshots of the study (tools/tagwhy-shots.mjs). Answers "why not
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

        <Section eyebrow="Summary" title="兩步驗證" lead="有些錯誤前端驗不到（格式對但查無此人、離職、號碼沒人用），所以輸入時只查格式，按 Proceed 才送後端；結果都留在同一個欄位。">
          <SpecTable head={['時機', '做什麼', '說明文字']} nowrap={[0]} rows={[
            ['輸入、貼上', '只查格式，錯的馬上變紅', '25 entries'],
            ['按 Proceed', '後端驗證；輸入框裡沒打逗號的文字也算一筆', 'Checking 6 of 24…'],
            ['驗證完，全部有效', '直接加入、關閉', '—'],
            ['驗證完，有無效的', '無效的移到最後；Proceed 停用', '22 valid, 3 invalid. Fix or remove invalid to proceed. Remove invalid'],
            ['驗證後再改或加人', '只標成還沒驗證，下次 Proceed 只驗這些', '22 valid, 2 invalid, 4 not checked yet'],
          ]} />
        </Section>

        <Section eyebrow="Paste" title="貼上：只查格式，照輸入順序">
          <Why shot="e-paste" title="貼上 26 筆 NT 帳號" sub="cm.chen 格式錯，當下變紅；其他是灰色、顯示輸入的值" max={1184}
            how="每一筆變成一個標籤，照貼上的順序；重複的只留一個。說明文字只寫筆數。"
            why="格式在瀏覽器裡就能判斷，馬上回饋；還沒查的不顯示對錯，避免看起來像已經驗過。照原順序，方便對回 Excel、Email 裡的原始清單。"
            not="紅色排最前面：名單長時還是要捲動，順序也對不回原始清單。"
            notShots={[['alt-redfirst', '紅色排最前面（原型目前的做法）']]} />
        </Section>

        <Section eyebrow="Proceed" title="按 Proceed：在原地驗證">
          <Shots items={[
            ['e-checking', '驗證中', '標籤變淡、不能點；Checking 6 of 24…；Proceed 停用'],
            ['e-checked', '驗證完', '無效的移到最後、緊接輸入框；有效的換成姓名；欄位紅框，Proceed 停用'],
          ]} />
          <Notes cols items={[
            { title: '依據', body: '使用者知道系統在做事，也知道還不能往下。無效的集中在最後，名單再長也一眼找到。只在驗證結束時移動，編輯時都不動。' },
            { title: '最後一個值沒打逗號', body: '按 Proceed 或離開輸入框時，剩下的文字也一起加入。' },
          ]} />
        </Section>

        <Section eyebrow="Fix first" title="有無效的：一定要先處理">
          <Why shot="e-removed" title="按 Remove invalid" sub="無效的一次移除，說明文字只剩 24 valid，Proceed 可以按"
            how="說明文字寫 Fix or remove invalid to proceed.，後面緊接 Remove invalid；改好、刪掉，或按 Remove invalid 之後，Proceed 才能按。"
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
            ['nt-edit-sug', '修改標籤時', '打 ytch，出現 Tina Chang'],
            ['nt-type-sug', '在名單最後打字時', '打 chen，列出符合的人'],
          ]} />
          <Notes cols items={[
            { title: '依據', body: '打字當下就確認是不是要的人。' },
            { title: '不選也可以', body: '直接按 Enter 或逗號，照打的字加入。外部 Email、外部號碼不會對到人，不出現選單。' },
          ]} />
        </Section>

        <Section eyebrow="After" title="驗證後：照樣自由編輯">
          <Shots items={[
            ['e-fixed', '把 a19999 改成 ytchang', '留在原位，變回灰色（還沒驗證）；說明文字多 1 not checked yet；Proceed 可以按'],
            ['e-more', '再貼一批', '接在最後，也是還沒驗證：22 valid, 2 invalid, 4 not checked yet'],
            ['e-rechecked', '再按 Proceed', '只驗那 4 筆；改好的變成 Tina Chang，新的無效值和其他無效的一起移到最後'],
          ]} />
          <Notes cols items={[
            { title: '依據', body: '驗證後欄位不鎖，加人、減人、改值都可以；只重驗改過的，所以很快。' },
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
            ['驗證前', '{n} entries', '還沒查，只說有幾筆'],
            ['驗證中', 'Checking {x} of {y}…', '前面一個 DS 轉圈（CircularProgress）'],
            ['有無效的', '{n} valid, {m} invalid. Fix or remove invalid to proceed. Remove invalid', '紅字（Remove invalid 是藍色連結），欄位紅框'],
            ['驗證後又改過', '{n} valid, {m} invalid, {k} not checked yet', '還要再按 Proceed'],
            ['按鈕', 'Proceed', '從頭到尾同一個名字；按了是驗證、或回到收件人欄位，不是寄出'],
          ]} />
        </Section>

        <Section eyebrow="Open" title="待工程確認">
          <SpecTable head={['問題', '原因']} nowrap={[0]} rows={[
            ['幾千筆的驗證要多久、能不能分批回傳', '決定要不要改成進度條、能不能先顯示看得到的'],
            ['每種資料類型的格式規則', '前端格式檢查要和後端一致'],
            ['SMS 能否指定寄到哪一支', '舊系統隨機挑一支公司手機'],
            ['選單查詢速度', '公司超過 10 萬人'],
          ]} />
        </Section>
      </main>
    </div>
  )
}
