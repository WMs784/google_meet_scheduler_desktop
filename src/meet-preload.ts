import { contextBridge } from "electron";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitFor(selector: string, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const el = document.querySelector(selector);
    if (el) return el as HTMLElement;
    await sleep(300);
  }
  throw new Error(`Timeout waiting for ${selector}`);
}

async function disableCameraAndMic() {
  // カメラ OFF
  const camButton = document.querySelector(
    '[aria-label*="カメラ"], [aria-label*="camera"]'
  ) as HTMLElement | null;

  if (camButton?.getAttribute("aria-pressed") === "true") {
    camButton.click();
    console.log("[Meet] Camera OFF");
  }

  // マイク OFF
  const micButton = document.querySelector(
    '[aria-label*="マイク"], [aria-label*="microphone"]'
  ) as HTMLElement | null;

  if (micButton?.getAttribute("aria-pressed") === "true") {
    micButton.click();
    console.log("[Meet] Mic OFF");
  }
}

async function clickJoinButton() {
  const joinButton = await waitFor(
    'button[jsname][aria-label*="参加"], button[jsname][aria-label*="Join"]'
  );
  joinButton.click();
  console.log("[Meet] Joined meeting");
}

async function autoJoinMeet() {
  try {
    await sleep(2000); // ページ安定待ち
    await disableCameraAndMic();
    await sleep(500);
    await clickJoinButton();
  } catch (e) {
    console.error("[Meet AutoJoin]", e);
  }
}

contextBridge.exposeInMainWorld("meetAutoJoin", {
  start: autoJoinMeet,
});
