# Google Meet Scheduler Desktop

Google Calendarと連携して、Google Meetの会議に自動参加するElectronデスクトップアプリケーションです。

## 主な機能

### 📅 自動予定取得
- アプリ起動時に自動的にGoogle Calendarから今日の予定を取得
- システムトレイに予定を表示
- Meet URLと開始時刻を自動で抽出

### 🤖 自動参加
- **参加タイミング**: 会議開始1分前～開始後10分まで自動参加
- **カメラ/マイク**: 自動的にOFF（ミュート）
- **参加方法**:
  - 優先: 「今すぐ参加」ボタンを自動クリック
  - フォールバック: 「このデバイスでも参加」ボタンを自動クリック

### 🔄 会議終了後の自動リダイレクト
- Meet landingページ（会議終了画面）に遷移したら、自動的にGoogle Calendarに戻る

### 🖥️ システムトレイ常駐
- 今日の予定を一覧表示
- 各予定の開始時刻を表示
- Meet URLがある予定は手動でも参加可能

## 必要要件

- Node.js（推奨: v18以上）
- npm
- macOS / Windows / Linux

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. トレイアイコンの準備

以下のディレクトリにトレイアイコン（`tray.png`）を配置してください：

```
src/assets/tray.png
```

アイコンサイズ: 16x16〜32x32ピクセル推奨

## 使い方

### アプリの起動

```bash
npm run start
```

このコマンドは以下を実行します：
1. TypeScriptファイルをコンパイル
2. アセット（アイコンなど）をdistディレクトリにコピー
3. Electronアプリを起動

### 初回起動時

1. アプリが起動すると、Google Calendarのログイン画面が表示されます
2. Googleアカウントでログインしてください
3. ログイン後、自動的に今日の予定を取得します
4. システムトレイに予定が表示されます

### システムトレイの使い方

システムトレイアイコンをクリックすると、以下のメニューが表示されます：

- **🕒 [時刻] [予定タイトル]**: 今日の予定の一覧
- **▶ Google Meet に参加**: Meet URLがある予定に手動で参加
- **Google Calendar を開く**: Google Calendarのウィンドウを表示
- **終了**: アプリを終了

## 開発

### ビルドのみ

```bash
npm run build
```

### ディレクトリ構造

```
google_meet_scheduler_desktop/
├── src/
│   ├── main.ts              # メインプロセス（Electronアプリの起動、トレイ管理）
│   ├── preload.ts           # Google Calendar用のプリロードスクリプト
│   ├── meet-preload.ts      # Google Meet自動参加用のプリロードスクリプト
│   ├── scheduler.ts         # スケジューリングユーティリティ
│   └── assets/
│       └── tray.png         # システムトレイアイコン
├── dist/                    # コンパイル後のファイル（自動生成）
├── package.json
├── tsconfig.json
└── README.md
```

## 技術仕様

### アーキテクチャ

このアプリケーションはElectronのマルチプロセスアーキテクチャを採用しています：

#### 1. メインプロセス（`main.ts`）
- Google Calendarを表示するBrowserWindowを作成
- システムトレイを管理
- 予定データを受け取り、自動参加をスケジューリング
- Meet参加用の新しいウィンドウを開く

#### 2. プリロードスクリプト（`preload.ts`）
- Google CalendarのDOMをスクレイピング
- 今日の予定を抽出（タイトル、開始時刻、Meet URL）
- メインプロセスにIPCでデータを送信

#### 3. Meet自動参加スクリプト（`meet-preload.ts`）
- Meetページ読み込み後、自動的に実行
- カメラ/マイクボタンを探してOFF
- 参加ボタンを探してクリック
- Landing pageへのリダイレクトを監視

### 自動参加のタイミング

```
           開始1分前      開始時刻      開始10分後
              |            |              |
              v            v              v
━━━━━━━━━━━━━━●━━━━━━━━━━━━●━━━━━━━━━━━━━●━━━━━━━━━━
              ↑                           ↑
              |                           |
         参加開始                    参加終了
              |___________________________|
                   自動参加対象期間
```

- **開始1分前**: スケジュールされた時刻に自動参加
- **開始時刻〜開始10分後**: アプリ起動時に予定を検知したら即座に参加
- **開始10分後以降**: 参加しない（スキップ）

### イベント抽出ロジック

#### Meet URLの取得
1. Google Calendarの予定詳細モーダルを開く
2. `#xDetDlgVideo`要素の`data-details`属性からURLを抽出
3. フォールバック: `a[href*="meet.google.com"]`からURLを取得

#### 開始時刻の抽出
- 予定タイトルから日本語の時刻表記を抽出
- 対応フォーマット:
  - `午前9:00` / `午後3:30`（分あり）
  - `午前9時` / `午後3時`（分なし）
- 24時間表記（HH:MM）に変換

## トラブルシューティング

### 予定が取得されない

1. Google Calendarに正しくログインしているか確認
2. devtoolsのコンソールでエラーを確認：
   - メインウィンドウ: View > Toggle Developer Tools
3. カレンダーの表示を「週表示」にする

### 自動参加が動作しない

1. ターミナルのログを確認：
   ```
   [AutoJoin] scheduleMeetAutoJoin called with X events
   [AutoJoin] ✓ Scheduled: [予定名] → [参加時刻]
   ```
2. 予定にMeet URLが含まれているか確認
3. 開始時刻が正しく抽出されているか確認（ログに表示されます）

### カメラ/マイクがOFFにならない

Google Meetのインターフェースが変更された可能性があります。
`src/meet-preload.ts`の`disableCameraAndMic()`関数内のセレクターを確認してください。

## 制限事項

- Google CalendarのUIに依存しているため、Googleが大幅にUIを変更した場合は動作しなくなる可能性があります
- 日本語の時刻表記のみ対応（英語表記は未対応）
- カレンダーは「週表示」での動作を前提としています
- 同時に複数の会議には参加できません（最後の会議が優先されます）

## ライセンス

ISC

## 開発者向けメモ

### デバッグログの確認

アプリを起動したターミナルに、以下のようなログが出力されます：

```
[preload] DOMContentLoaded - starting auto-fetch
[preload] Google Calendar is ready!
[preload] Auto-fetch completed: 3 events
[AutoJoin] scheduleMeetAutoJoin called with 3 events
[AutoJoin] ✓ Scheduled: [予定名] → 10:59:00
[openMeetActive] Opening Meet window: https://meet.google.com/xxx-xxxx-xxx
[Meet AutoJoin] Starting auto-join process...
[Meet] Camera toggled OFF
[Meet] Mic toggled OFF
[Meet] ✓ Fallback join button found
[Meet] Clicked join button successfully
[Meet AutoJoin] ✓ Successfully joined meeting!
```

### コンソールログの種類

- `[preload]`: Google Calendarスクレイピング処理
- `[AutoJoin]`: 自動参加スケジューリング処理
- `[openMeetActive]`: Meetウィンドウの管理
- `[Meet]` / `[Meet AutoJoin]`: Meet自動参加処理
- `[IPC]`: プロセス間通信
