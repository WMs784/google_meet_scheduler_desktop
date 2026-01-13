import { contextBridge, ipcRenderer } from "electron";

// ==============================
// 型定義
// ==============================

export type TodayEvent = {
  title: string;
  eventId: string;
  meetUrl?: string;
  startTime?: string;
};

// ==============================
// ユーティリティ
// ==============================

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ==============================
// Meet URL をモーダルから取得
// ==============================

function extractMeetUrlFromModal(): string | undefined {
  // ① data-details から取得（最優先）
  const videoSection = document.querySelector<HTMLElement>("#xDetDlgVideo");
  const details = videoSection?.dataset.details;

  if (details) {
    const match = details.match(/https:\/\/meet\.google\.com\/[a-z-]+/);
    if (match) return match[0];
  }

  // ② anchor から取得（フォールバック）
  const link = document.querySelector<HTMLAnchorElement>(
    '#xDetDlgVideo a[href*="meet.google.com"]'
  );

  if (link?.href) return link.href;

  return undefined;
}

// ==============================
// 開始時刻抽出（24時間表記対応）
// ==============================

function extractStartTimeFromText(text: string): string | undefined {
  // 午後11:55 / 午前9:00
  const withMinutes = text.match(/(午前|午後)(\d{1,2}):(\d{2})/);
  if (withMinutes) {
    let hour = Number(withMinutes[2]);
    const minute = withMinutes[3];

    if (withMinutes[1] === "午後" && hour !== 12) hour += 12;
    if (withMinutes[1] === "午前" && hour === 12) hour = 0;

    return `${hour.toString().padStart(2, "0")}:${minute}`;
  }

  // 午前12時 / 午後3時（分なし）
  const withoutMinutes = text.match(/(午前|午後)(\d{1,2})時/);
  if (withoutMinutes) {
    let hour = Number(withoutMinutes[2]);

    if (withoutMinutes[1] === "午後" && hour !== 12) hour += 12;
    if (withoutMinutes[1] === "午前" && hour === 12) hour = 0;

    return `${hour.toString().padStart(2, "0")}:00`;
  }

  return undefined;
}

// ==============================
// 今日の予定を取得するメイン処理
// ==============================

async function getTodayEvents(): Promise<TodayEvent[]> {
  console.log("[preload] getTodayEvents() start");

  // 今日のヘッダーを探す（日本語 / 英語両対応）
  let todayHeader = document.querySelector<HTMLElement>(
    '[role="columnheader"] [aria-label*="今日"]'
  );

  if (!todayHeader) {
    todayHeader = document.querySelector<HTMLElement>(
      '[role="columnheader"] [aria-label*="Today"]'
    );
  }

  if (!todayHeader) {
    console.warn("[preload] Today header not found");
    return [];
  }

  const dateKey = todayHeader.querySelector<HTMLElement>("button[data-datekey]")
    ?.dataset.datekey;

  if (!dateKey) {
    console.warn("[preload] dateKey not found");
    return [];
  }

  const todayCells = document.querySelectorAll<HTMLElement>(
    `[role="gridcell"][data-datekey="${dateKey}"]`
  );

  const events: TodayEvent[] = [];

  for (const cell of Array.from(todayCells)) {
    const chips = cell.querySelectorAll<HTMLElement>("[data-eventchip]");

    for (const chip of Array.from(chips)) {
      const title =
        chip.innerText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)[0] ?? "(no title)";

      // ① 予定クリック
      chip.click();

      // ② モーダル表示待ち
      await sleep(300);

      // ③ 情報抽出
      const meetUrl = extractMeetUrlFromModal();
      const startTime = extractStartTimeFromText(title);

      events.push({
        title,
        eventId: chip.dataset.eventid ?? "",
        meetUrl,
        startTime,
      });

      // ④ モーダルを閉じる
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      await sleep(200);
    }
  }

  console.log("[preload] Today events:", events);
  return events;
}

// ==============================
// Google Calendar の読み込み待機
// ==============================

async function waitForCalendarReady(): Promise<void> {
  console.log("[preload] Waiting for Google Calendar to load...");

  // カレンダーの主要要素が表示されるまで待機
  for (let i = 0; i < 60; i++) {
    // 最大30秒待機
    const todayHeader =
      document.querySelector('[role="columnheader"] [aria-label*="今日"]') ||
      document.querySelector('[role="columnheader"] [aria-label*="Today"]');

    if (todayHeader) {
      console.log("[preload] Google Calendar is ready!");
      return;
    }

    await sleep(500);
  }

  console.warn("[preload] Timeout waiting for Google Calendar");
}

// ==============================
// 起動時の自動実行
// ==============================

window.addEventListener("DOMContentLoaded", async () => {
  console.log("[preload] DOMContentLoaded - starting auto-fetch");

  // Google Calendar の読み込みを待つ
  await waitForCalendarReady();

  // 少し余裕を持たせる
  await sleep(1000);

  // 自動的に今日の予定を取得
  try {
    const events = await getTodayEvents();
    ipcRenderer.send("today-events", events);
    await ipcRenderer.invoke("SET_TODAY_EVENTS", events);
    console.log("[preload] Auto-fetch completed:", events.length, "events");
  } catch (error) {
    console.error("[preload] Auto-fetch failed:", error);
  }
});

// ==============================
// Renderer に公開する API
// ==============================

contextBridge.exposeInMainWorld("calendar", {
  getTodayEvents: async (): Promise<TodayEvent[]> => {
    const events = await getTodayEvents();

    // main にも通知したい場合
    ipcRenderer.send("today-events", events);
    await ipcRenderer.invoke("SET_TODAY_EVENTS", events);

    return events;
  },
  openMeet: (url: string) => {
    ipcRenderer.send("open-meet", url);
  },
});
