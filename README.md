# MNP Prototype

用 [`@qijenchen/design-system`](https://github.com/ajenchen/design-system) 做的 MNP 可互動 prototype（單一通道紀錄版，團隊版）。

| 內容 | 檔案 | 線上網址（需輸入密碼） |
|---|---|---|
| Prototype（可操作） | `teams/index.html`、`teams/src/` | https://claude.ai/artifact/Kq6FnvbagCvdtmoPXiRD91 |
| 單一通道紀錄 UI Flow 與設計規格（列表、狀態規則、訊息詳情面板、操作與對話框） | `teams/split-spec.html`、`teams/src/spec/split/`、`tools/split-shots.mjs` | https://claude.ai/artifact/7mVq135xnDXPMmZJ6rj4mc |
| New message UI Flow 與設計規格 | `teams/newmsg-spec.html`、`teams/src/spec/newmsg/`、`tools/newmsg-shots.mjs` | https://claude.ai/artifact/7ecvVKR6PMEQ85j34Uyn72 |
| 電話號碼去重複 | `teams/phone-dedupe.html`、`teams/src/spec/phone/` | https://claude.ai/artifact/WqrJimaxppL7URT7ugpCqw |
| DS 元件對照表（開發用） | `teams/dsmap.html`、`teams/src/spec/dsmap/` | https://claude.ai/artifact/9WA7buwYsx25gqTU8nhFWX |

密碼不放在這個儲存庫裡，請另外保管。

## 分享給別人

把網址和密碼分開傳給對方（例如網址用 email、密碼用通訊軟體）。
對方不需要 GitHub 帳號，也看不到這個儲存庫。

## 在電腦上執行

需要 Node 22 以上。

```
cd teams
npm install --legacy-peer-deps
npm run dev        # 開發模式，瀏覽器打開終端機顯示的網址
npm run build      # 輸出到 teams/dist/
```

檔案結構寫在 `teams/README.md`。

## 產生加密的單一網頁檔

先建置，再在儲存庫最上層執行 `tools/lock.mjs`（密碼是第一個參數）：

```
cd teams && npx vite build && cd ..
node tools/lock.mjs <密碼> publish/mnp-teams-per-channel.html teams "MNP Teams · 單一通道紀錄"
```

各份規格頁各有自己的建置設定，輸出到各自的資料夾後再加密：

| 內容 | 建置 | 加密時的資料夾 |
|---|---|---|
| 單一通道紀錄規格 | `npx vite build -c vite.split-spec.config.ts` | `teams/split-spec` |
| New message 規格 | `npx vite build -c vite.newmsg-spec.config.ts` | `teams/newmsg-spec` |
| 電話號碼去重複 | `npx vite build -c vite.phone.config.ts` | `teams/phone` |
| DS 元件對照表 | `npx vite build -c vite.dsmap.config.ts` | `teams/dsmap` |

規格頁裡的畫面是從 prototype 截的圖。prototype 改了之後要重新截圖：先 build，把 `teams/dist` 複製成 `teams/split/dist` 並用 `python3 -m http.server 4190 -d teams/split/dist` 開起來，再執行：

```
node tools/split-shots.mjs teams/src/spec/split/shots
node tools/newmsg-shots.mjs teams/src/spec/newmsg/shots
```
