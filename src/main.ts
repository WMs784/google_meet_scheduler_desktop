import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  nativeImage,
  shell,
} from "electron";
import path from "path";
import { TodayEvent } from "./preload";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let meetWindow: BrowserWindow | null = null;
let scheduledTimers: NodeJS.Timeout[] = [];

// preload から受け取った「今日の予定」を保持
let todayEvents: {
  title: string;
  startTime?: string;
  meetUrl?: string;
}[] = [];

// ==============================
// Window 作成
// ==============================

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadURL("https://calendar.google.com");
}

// ==============================
// Tray 作成
// ==============================

function createTray() {
  const iconPath = path.join(__dirname, "tray.png"); // ★後述
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon);
  tray.setToolTip("Today Calendar Events");

  updateTrayMenu();
}

// ==============================
// Tray メニュー更新
// ==============================

function updateTrayMenu() {
  const menuTemplate: Electron.MenuItemConstructorOptions[] = [];

  if (todayEvents.length === 0) {
    menuTemplate.push({
      label: "今日の予定はありません",
      enabled: false,
    });
  } else {
    for (const event of todayEvents) {
      // 時刻表示（装飾用）
      menuTemplate.push({
        label: `🕒 ${event.startTime ?? "--:--"}`,
        enabled: false,
      });

      // 予定タイトル（装飾用）
      menuTemplate.push({
        label: `  ${event.title}`,
        enabled: false,
      });

      // Meet 参加ボタン
      if (event.meetUrl) {
        menuTemplate.push({
          label: "  ▶ Google Meet に参加",
          click: () => {
            shell.openExternal(event.meetUrl);
          },
        });
      } else {
        menuTemplate.push({
          label: "  (Meet なし)",
          enabled: false,
        });
      }

      // 区切り
      menuTemplate.push({ type: "separator" });
    }
  }

  menuTemplate.push({
    label: "Google Calendar を開く",
    click: () => {
      mainWindow?.show();
    },
  });

  menuTemplate.push({
    label: "終了",
    click: () => {
      app.quit();
    },
  });

  const menu = Menu.buildFromTemplate(menuTemplate);
  tray?.setContextMenu(menu);
}

// ==============================
// IPC（preload → main）
// ==============================

ipcMain.on("today-events", (_event, events) => {
  todayEvents = events;
  updateTrayMenu();
});

ipcMain.on("open-meet", (_event, url: string) => {
  shell.openExternal(url);
});

ipcMain.handle("SET_TODAY_EVENTS", (_e, events: TodayEvent[]) => {
  scheduleMeetAutoJoin(events);
});

// ==============================
// App lifecycle
// ==============================

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on("window-all-closed", () => {
  // Tray 常駐させるので終了しない
  // macOS 以外では終了しない
});

function clearScheduledTimers() {
  scheduledTimers.forEach((t) => clearTimeout(t));
  scheduledTimers = [];
}

function openMeetActive(meetUrl: string) {
  if (meetWindow) {
    meetWindow.close();
    meetWindow = null;
  }

  meetWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "meet-preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  meetWindow.loadURL(meetUrl);

  meetWindow.webContents.on("did-finish-load", () => {
    meetWindow?.webContents.executeJavaScript(`
    window.meetAutoJoin?.start();
  `);
  });

  meetWindow.once("ready-to-show", () => {
    meetWindow?.show();
    meetWindow?.focus();
  });

  meetWindow.on("closed", () => {
    meetWindow = null;
  });
}

function scheduleMeetAutoJoin(events: TodayEvent[]) {
  clearScheduledTimers();

  const now = new Date();

  for (const event of events) {
    if (!event.meetUrl || !event.startTime) continue;

    const [h, m] = event.startTime.split(":").map(Number);

    const eventTime = new Date();
    eventTime.setHours(h, m, 0, 0);

    const joinTime = new Date(eventTime.getTime() - 60 * 1000);
    const diff = joinTime.getTime() - now.getTime();

    if (diff <= 0) continue; // すでに過ぎている

    console.log(`[AutoJoin] ${event.title} → ${joinTime.toLocaleTimeString()}`);

    const timer = setTimeout(() => {
      console.log(`[AutoJoin] Opening Meet: ${event.meetUrl}`);
      openMeetActive(event.meetUrl!);
    }, diff);

    scheduledTimers.push(timer);
  }
}
