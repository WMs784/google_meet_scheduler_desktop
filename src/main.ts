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

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

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
      menuTemplate.push({
        label: `${event.startTime ?? "--:--"}  ${event.title}`,
        click: () => {
          if (event.meetUrl) {
            shell.openExternal(event.meetUrl);
          }
        },
      });
    }
  }

  menuTemplate.push({ type: "separator" });

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
