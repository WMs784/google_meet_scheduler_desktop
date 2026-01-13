import { contextBridge } from "electron";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function disableCameraAndMic() {
  console.log("[Meet] Looking for camera and mic buttons...");

  await sleep(1000); // 要素が表示されるまで待機

  // カメラボタンを探す（複数のパターンを試す）
  const camSelectors = [
    '[aria-label*="カメラをオフ"]',
    '[aria-label*="Turn off camera"]',
    '[aria-label*="camera"][aria-pressed="true"]',
  ];

  let camButton: HTMLElement | null = null;
  for (const selector of camSelectors) {
    camButton = document.querySelector(selector);
    if (camButton) {
      console.log(`[Meet] Found camera button with selector: ${selector}`);
      break;
    }
  }

  if (camButton) {
    camButton.click();
    await sleep(300);
    console.log("[Meet] Camera toggled OFF");
  } else {
    console.log("[Meet] Camera button not found or already OFF");
  }

  // マイクボタンを探す
  const micSelectors = [
    '[aria-label*="マイクをオフ"]',
    '[aria-label*="Turn off microphone"]',
    '[aria-label*="microphone"][aria-pressed="true"]',
  ];

  let micButton: HTMLElement | null = null;
  for (const selector of micSelectors) {
    micButton = document.querySelector(selector);
    if (micButton) {
      console.log(`[Meet] Found mic button with selector: ${selector}`);
      break;
    }
  }

  if (micButton) {
    micButton.click();
    await sleep(300);
    console.log("[Meet] Mic toggled OFF");
  } else {
    console.log("[Meet] Mic button not found or already OFF");
  }
}

async function clickJoinButton() {
  console.log("[Meet] Looking for join button...");

  let joinButton: HTMLElement | null = null;

  // 20回試行（合計10秒待機）
  for (let attempt = 0; attempt < 20; attempt++) {
    console.log(`[Meet] Attempt ${attempt + 1} to find join button...`);

    // すべてのボタンとdiv[role="button"]を取得
    const allButtons = Array.from(document.querySelectorAll<HTMLElement>('button, div[role="button"]'));
    console.log(`[Meet] Found ${allButtons.length} buttons/clickable elements on page`);

    // 最初の試行時にすべてのボタンのテキストを出力（デバッグ用）
    if (attempt === 0) {
      console.log("[Meet] === All buttons on page ===");
      allButtons.forEach((btn, i) => {
        const text = (btn.innerText || btn.textContent || '').trim();
        const ariaLabel = btn.getAttribute('aria-label') || '';
        if (text || ariaLabel) {
          console.log(`[Meet] Button ${i + 1}: text="${text.substring(0, 100)}", aria-label="${ariaLabel.substring(0, 100)}"`);
        }
      });
      console.log("[Meet] === End of button list ===");
    }

    // 優先順位1: 「今すぐ参加」「Join now」ボタンを探す
    joinButton = allButtons.find((button) => {
      const text = (button.innerText || button.textContent || '').trim();
      const ariaLabel = button.getAttribute('aria-label') || '';

      const matchesText =
        text === '今すぐ参加' ||
        text === '参加リクエストを送信' ||
        text === 'Join now' ||
        text === 'Ask to join';

      const matchesAria =
        ariaLabel === '今すぐ参加' ||
        ariaLabel === '参加リクエストを送信' ||
        ariaLabel === 'Join now' ||
        ariaLabel === 'Ask to join';

      if (matchesText || matchesAria) {
        console.log(`[Meet] ✓ Primary join button found - text: "${text}", aria-label: "${ariaLabel}"`);
        return true;
      }

      return false;
    }) || null;

    // 優先順位2: 「今すぐ参加」がなければ「このデバイスでも参加」を探す
    if (!joinButton) {
      joinButton = allButtons.find((button) => {
        const text = (button.innerText || button.textContent || '').trim();

        if (text.includes('このデバイスでも参加') || text.includes('Join on this device')) {
          console.log(`[Meet] ✓ Fallback join button found - text: "${text.substring(0, 50)}"`);
          return true;
        }

        return false;
      }) || null;
    }

    if (joinButton) {
      console.log(`[Meet] Found join button: "${joinButton.innerText || joinButton.textContent}"`);
      break;
    }

    await sleep(500);
  }

  if (!joinButton) {
    console.error("[Meet] Join button not found after 20 attempts");
    // デバッグ用：すべてのボタンのテキストを出力
    const allButtons = Array.from(document.querySelectorAll<HTMLElement>('button, div[role="button"]'));
    console.log("[Meet] All buttons on page:");
    allButtons.slice(0, 10).forEach((btn, i) => {
      console.log(`  ${i + 1}. "${(btn.innerText || btn.textContent || '').substring(0, 50)}" - aria-label: "${btn.getAttribute('aria-label')}"`);
    });
    throw new Error("Join button not found");
  }

  console.log("[Meet] Clicking join button...");
  joinButton.click();
  console.log("[Meet] Clicked join button successfully");
}

async function autoJoinMeet() {
  console.log("[Meet AutoJoin] Starting auto-join process...");
  try {
    await sleep(5000); // ページ安定待ち（長めに）
    console.log("[Meet AutoJoin] Disabling camera and mic...");
    await disableCameraAndMic();
    await sleep(2000); // カメラ/マイク設定後も待機
    console.log("[Meet AutoJoin] Clicking join button...");
    await clickJoinButton();
    console.log("[Meet AutoJoin] ✓ Successfully joined meeting!");
  } catch (e) {
    console.error("[Meet AutoJoin] ✗ Error:", e);
  }
}

contextBridge.exposeInMainWorld("meetAutoJoin", {
  start: autoJoinMeet,
});

// ページロード時に自動実行
console.log("[Meet AutoJoin] Preload script loaded");

window.addEventListener("DOMContentLoaded", () => {
  console.log("[Meet AutoJoin] DOMContentLoaded event fired");

  // landing ページかチェック
  if (window.location.href.includes('meet.google.com/landing')) {
    console.log("[Meet AutoJoin] Detected landing page, redirecting to calendar...");
    window.location.href = 'https://calendar.google.com';
    return;
  }

  setTimeout(() => {
    console.log("[Meet AutoJoin] Starting auto-join after delay...");
    autoJoinMeet();
  }, 2000);
});

// URL変化を監視
let lastUrl = window.location.href;
new MutationObserver(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    console.log(`[Meet AutoJoin] URL changed to: ${currentUrl}`);

    if (currentUrl.includes('meet.google.com/landing')) {
      console.log("[Meet AutoJoin] Meeting ended, redirecting to calendar...");
      window.location.href = 'https://calendar.google.com';
    }
  }
}).observe(document, { subtree: true, childList: true });
