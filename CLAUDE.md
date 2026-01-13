# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron desktop application that displays Google Calendar events in the system tray and automatically opens Google Meet URLs at scheduled times. The app loads Google Calendar in a webview and scrapes event data to populate the tray menu.

## Build & Run Commands

```bash
# Build TypeScript and run the app
npm run dev
```

This compiles TypeScript files from `src/` to `dist/` and launches Electron.

## Architecture

### Three-Process Model

The application follows Electron's multi-process architecture:

1. **Main Process** (`src/main.ts`)
   - Creates the BrowserWindow that loads Google Calendar
   - Manages the system tray with a menu of today's events
   - Receives event data from the preload script via IPC (`today-events` channel)
   - Updates tray menu dynamically when new events are received

2. **Preload Script** (`src/preload.ts`)
   - Runs in the renderer context with Node.js access via `contextBridge`
   - Scrapes Google Calendar DOM to extract today's events
   - Exposes `window.calendar.getTodayEvents()` API to the renderer
   - Sends extracted events to main process via `ipcRenderer.send("today-events", events)`
   - Handles both Japanese and English locale for Google Calendar

3. **Scheduler** (`src/scheduler.ts`)
   - Utility function to schedule automatic opening of Meet URLs
   - Uses `setTimeout` to open Meet links 1 minute before event start time

### Data Flow

```
Google Calendar (Web)
  → Preload scrapes DOM
  → Sends events via IPC to Main
  → Main updates Tray menu
```

### Event Extraction Logic

The preload script:
- Finds today's column header by looking for `[aria-label*="今日"]` or `[aria-label*="Today"]`
- Gets the `data-datekey` from the header button
- Queries all grid cells with matching `data-datekey`
- Clicks each event chip to open the details modal
- Extracts Meet URL from the modal's `#xDetDlgVideo` section
- Extracts start time from event title text (handles Japanese 午前/午後 format)
- Closes modal with ESC key and moves to next event

### Tray Menu Behavior

- Shows list of today's events with start times
- Clicking an event opens its Google Meet URL in default browser
- Menu includes "Google Calendar を開く" to show the main window
- App doesn't quit when window is closed (tray remains active)
