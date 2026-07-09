# 開発再開メモ（RESUME）

次に作業を再開するときに、まずこのファイルを読めば状況が分かるようにまとめています。
（最終更新: 2026-07-09）

---

## 1. このアプリの実態（重要）

- **CLAUDE.md には Next.js と書いてあるが、実際は静的な HTML/JS アプリ**
  - 構成: `index.html` + `data.js` + `features.js` + `app.js` + `notifications.js` + `supabase-auth.js` + `styles.css`
  - 各JSは **`<script>` タグの読み込み順でグローバル変数（`state`, `icon`, 各 render 関数）を共有**している。ES module ではない。
- Supabase（PostgreSQL + Auth）に接続済み。設定は `supabase-config.js` の `window.SUPABASE_CONFIG`。

## 2. 起動方法（⚠️注意）

- **現在 `npm run dev` は `vite` を指しているが vite は未インストールなので動きません。**
- すぐ動かしたいときは、当面こちらで起動:
  ```bash
  python3 -m http.server 3001 --bind 127.0.0.1
  # → http://127.0.0.1:3001
  ```
- `node_modules` が無いと supabase-js を読めず、打刻等がDB保存されない（ローカル表示のみにフォールバック）。初回は `npm install` を実行。

## 3. Supabase 情報

- プロジェクト: `attendance-app` / ref: `lvwpgsibopjtosycvaqp` / 東京リージョン
- anon key は新形式 `sb_publishable_...`（公開前提の publishable key）。`.env.local` にも同じ値あり（gitignore 済み・未使用）。
- CLI は link & login 済み。**Management API でSQL直接実行可**:
  `POST https://api.supabase.com/v1/projects/lvwpgsibopjtosycvaqp/database/query` に `{"query":"..."}`（RLSバイパス）
- トークンはmacOSキーチェーンから取得:
  `security find-generic-password -s "Supabase CLI" -w | sed 's/^go-keyring-base64://' | base64 -d`

## 4. 適用済みマイグレーション（supabase/migrations/）

| ファイル | 内容 |
|---|---|
| 202607070001 / 0002 | 初期テーブル・RLS・トリガー |
| 202607090001 | 勤怠にJST表示用生成カラム clock_in_jst / clock_out_jst |
| 202607090002 | RLS権限昇格対策（profiles.role 自己変更禁止、新規は member 固定） |
| 202607090003 | shifts DELETE を本人＋admin に |
| 202607090004 | shifts に保留(on_hold)ステータス |
| 202607090005 | daily_reports RLS: member=本人CRUD / admin=閲覧のみ |
| 202607090006 | daily_reports に achievement（自己達成度 0-100） |
| 202607090007 | shifts に review_comment |

※ 一部はダッシュボードSQL Editorで手動適用（`if not exists` 等で db push しても安全）。

## 5. 実装済み機能

- 打刻（出勤=INSERT / 退勤=同レコードUPDATE、UTC保存・JST表示）
- シフト申請（Supabase接続、承認/却下/保留、通知、キャンセル）／管理者シフト管理 `/admin/shifts`
- カレンダー・ダッシュボード統計（Supabase実データ、月切替、出勤マーカー蛍光色、指標別カラーバッジ、1x3カード）
- 日報（Supabase接続、作成/編集/削除、達成度25%刻みメーター、送信時ダイアログ、上部3カード）
- 各申請フォームは「ボタン押下時のみ表示」トグル。ボタンはページ固有名（シフト申請/休暇申請/残業申請/日報作成）
- 遅い回線でのローディング表示（デモ初期値ではなくスピナー）

## 6. 未対応・次にやること（TODO）

- [ ] **休暇申請・残業申請が未接続**（`state.leaveRequests` / `overtimeRequests` はローカルのモックのみで、DBに保存されない）。シフト申請と同じ要領でSupabase接続が必要。
- [ ] **Vite移行**（今回は見送り）。package.json のスクリプトは vite に変更済みだが未インストール・未構成。
  - 最小構成なら約10-15分、きちんとES module化するなら約30-45分＋全機能の回帰テスト。
  - 6ファイルのグローバル共有をimport/export化するのが最大の手間・リスク。
- [ ] git リモートが旧URL。`git remote set-url origin https://github.com/ta1vodesu/attendance-app.git` に更新するとpush時のリダイレクト通知が消える。

## 7. 検証環境メモ

- Playwright は `~/.npm/_npx/e41f203b7505f1fb/node_modules/playwright`（v1.58）にある。
- `window.supabaseAuth` は本物の supabase-auth.js が上書きするので、テスト時は `Object.defineProperty(window,'supabaseAuth',{get:()=>stub,set:()=>{}})` でスタブ固定する。
- テストユーザー: `e2e-punch-test@example.com`（member）ほか。パスワード等の資格情報はローカルの `CLAUDE.local.md`（gitignore済み）を参照。DB検証データは note に `VERIFY-*` を付けて投入後に削除する運用。
