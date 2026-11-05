# MNP Prototype

用 [`@qijenchen/design-system`](https://github.com/ajenchen/design-system) 做的 MNP 可互動 prototype。

| 版本 | 資料夾 | 線上網址（需輸入密碼） |
|---|---|---|
| 中英雙語版（已停止更新） | `bilingual/` | https://claude.ai/artifact/QwiqnwmVSsZWpNSdb5Jnpq |
| 英文原版（已停止更新） | `english/` | https://claude.ai/artifact/QNA3grD2q5vsNvfZ6JCmZX |
| 團隊版（發送空間，主要版本） | `teams/` | https://claude.ai/artifact/3wDkTsa8LZcfDikRr1RhWv |
| 訊息紀錄設計規格（團隊版） | `teams/spec.html`、`teams/src/spec/` | https://claude.ai/artifact/DJqKQRYHc7zduwfKU9T3FW |
| 發送訊息設計規格（團隊版） | `teams/compose-spec.html`、`teams/src/spec/compose/` | https://claude.ai/artifact/5Cp4EoipMcFczPk314XxRK |
| 發送訊息 UI Flow 與設計規格（團隊版，每一步下方攤開那一步的完整規格） | `teams/compose-flow.html`、`teams/src/spec/flow/` | https://claude.ai/artifact/C2XATaxJsCWLQQdeihP2x7 |
| 設計方案比較頁（通道觸及、緊急發送標示、列表篩選、詳情的多通道內容、群組成員） | `bilingual/options.html`、`bilingual/src/options/` | https://claude.ai/artifact/K42hKimpiZhicXxdie2RQy |

密碼不放在這個儲存庫裡，請另外保管。

以後的修改只做團隊版。雙語版停在 2026/11/02、英文原版停在 2026/10/29 的狀態，不再跟著改。

## 分享給別人

把網址和密碼分開傳給對方（例如網址用 email、密碼用通訊軟體）。
對方不需要 GitHub 帳號，也看不到這個儲存庫。

## 在電腦上執行

需要 Node 22 以上。以雙語版為例：

```
cd bilingual
npm install --legacy-peer-deps
npm run dev        # 開發模式，瀏覽器打開終端機顯示的網址
npm run build      # 輸出到 bilingual/dist/
```

各版本的檔案結構寫在 `bilingual/README.md`、`english/README.md`。

## 產生加密的單一網頁檔

先 `npm run build`，再在儲存庫最上層執行：

```
node tools/lock.mjs <密碼> publish/mnp-prototype-i18n.html bilingual "MNP Bilingual Prototype"
node tools/lock.mjs <密碼> publish/mnp-teams-prototype.html teams "MNP Teams Prototype"
```

設計規格頁另外建置，輸出到 `teams/spec/dist/`。畫面是從團隊版 prototype 截的圖（`teams/src/spec/shots/`，標註位置在 `marks.json`），prototype 改了之後要重新截圖：

```
cd teams && npx vite build -c vite.spec.config.ts && cd ..
node tools/lock.mjs <密碼> publish/mnp-message-log-spec.html teams/spec "MNP 訊息紀錄規格"
```

發送訊息規格同樣從團隊版截圖（`tools/compose-shots.mjs`，輸出到 `teams/src/spec/compose/shots/`）：

```
cd teams && npx vite build -c vite.compose-spec.config.ts && cd ..
node tools/lock.mjs <密碼> publish/mnp-send-flow-spec.html teams/compose-spec "MNP 發送訊息規格"
```

UI Flow 的流程圖（與清單）在每一步下方直接放那一步的完整規格，內容來自發送訊息規格（`SpecTabBody`，`teams/src/spec/compose/ComposeSpec.tsx`），對應關係在 `teams/src/spec/flow/FlowApp.tsx` 的 `SHEETS`；截圖也共用。改規格時兩份文件都要重新建置：

```
cd teams && npx vite build -c vite.compose-flow.config.ts && cd ..
node tools/lock.mjs <密碼> publish/mnp-send-ui-flow.html teams/compose-flow "MNP 發送 UI Flow"
```

舊版規格（雙語版）的原始碼還留在 `bilingual/spec.html`、`bilingual/src/spec/`，已不再使用。

設計方案比較頁同樣另外建置，輸出到 `bilingual/options/dist/`：

```
cd bilingual && npx vite build -c vite.options.config.ts && cd ..
node tools/lock.mjs <密碼> publish/mnp-channel-reach-options.html bilingual/options "MNP 設計方案比較"
```

產生的檔案打開後要輸入密碼才看得到內容。整個 prototype 是加密的，看原始碼也只會看到亂碼。
`publish/` 不會存進儲存庫，需要時隨時重新產生。

## 在 Claude Code 接著修改

開新的 Claude Code 工作階段時選這個儲存庫，告訴 Claude 要改什麼，
例如「把雙語版群組頁的 Description 改成選填」，改完請它重新加密並更新上面的網址。
