import { getRandomOfType, escapeHtml, fuzzyMatch, getSecureRandomIndex } from './data';
import { recordBlock, recordBreak, recordTimeOnSite } from './stats';
import {
  BlockedSite,
  DEFAULT_BLOCKED_SITES,
  STORAGE_KEYS,
  BreakState,
  BreakLimits,
  DEFAULT_BREAK_LIMITS,
  POLLING_INTERVALS,
  canTakeBreak,
  getTodayString
} from './constants';
import {
  getDetectorForDomain,
  domContainsShortForm,
  hideShortFormItems,
  blurShortFormItems,
  observeShortFormContent,
  type ShortFormDetector
} from './shortFormDetector';
import { getStatusIcon } from './icons/index';
import { logger } from './logger';

// Prevent multiple injections
if ((globalThis as any).__at10tion_initialized) {
  throw new Error("Already initialized");
}
(globalThis as any).__at10tion_initialized = true;

let breakTimerInterval: ReturnType<typeof setInterval> | undefined;
let blockObserver: MutationObserver | null = null;
let shadowHost: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let lastUrl = location.href;

/**
 * Pause all video and audio elements on the page.
 * This is called when blocking kicks in or when a break ends.
 */
function pauseAllMedia() {
  const videos = document.querySelectorAll('video');
  const audios = document.querySelectorAll('audio');
  videos.forEach(v => v.pause());
  audios.forEach(a => a.pause());
}

// ... (Styles constant remains here) ...

// SPA Navigation Detection
// Sites like YouTube, Instagram, etc. use History API for navigation. 
// We need to detect these changes to re-run eligibility checks.
function setupNavigationDetection() {
  // 1. Listen for popstate (back/forward button)
  globalThis.addEventListener('popstate', () => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      checkState();
    }
  });

  // 2. Patch pushState and replaceState to detect programmatic navigation
  // Note: We need to do this carefully to not break site functionality
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    const result = originalPushState.apply(this, args);
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      checkState();
    }
    return result;
  };

  history.replaceState = function (...args) {
    const result = originalReplaceState.apply(this, args);
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      checkState();
    }
    return result;
  };

  // 3. MutationObserver fallback for title changes (common in SPAs) or just rapid DOM changes
  // We already have a blockObserver, but that detects if our *overlay* is removed.
  // We might need a separate lightweight observer to detect significant page transitions if history API fails.
  // For now, let's rely on history API + the existing polling backup.
}

setupNavigationDetection();

// CSS for Shadow DOM
const STYLES = `
:host {
  all: initial;
  display: block;
  z-index: 2147483647;
  position: fixed;
  top: 0;
  left: 0;
  font-size: 16px; /* Enforce base font size */
  line-height: 1.5;
}

#work-focus-block {
  box-sizing: border-box;
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(20, 18, 16, 0.98);
  display: flex;
  justify-content: center;
  align-items: center;
  color: #f5f5f4;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 16px;
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

#work-focus-block * {
  box-sizing: border-box;
}

.block-container {
  text-align: center;
  max-width: 500px;
  width: 90%;
  padding: 32px;
  background: #1c1b1a;
  border-radius: 12px;
  border: 1px solid #3f3c38;
  box-shadow: 0 0 50px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.5s ease-out;
}

.content-card {
  margin: 32px 0;
  padding: 24px;
  background: #2d2b29;
  border-radius: 8px;
  border: 1px solid #3f3c38;
  animation: slideUp 0.6s ease-out 0.1s both;
}

blockquote {
  font-size: 19px;
  font-style: italic;
  margin-bottom: 16px;
  line-height: 1.5;
  color: #e7e5e4;
}

cite {
  color: #a8a29e;
  font-size: 16px;
}

.challenge-text {
  font-size: 19px;
  margin-bottom: 16px;
  color: #e7e5e4;
}

input[type="text"],
input[type="number"] {
  background: #1c1b1a;
  border: 1px solid #57534e;
  color: #f5f5f4;
  padding: 13px;
  border-radius: 4px;
  font-size: 16px;
  width: 100%;
  text-align: center;
}

input:focus {
  outline: none;
  border-color: #4ade80;
}

.controls {
  margin: 32px 0;
  transition: opacity 0.3s;
}

.duration-selector {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin: 16px 0;
}

.duration-selector label {
  cursor: pointer;
  padding: 8px 16px;
  background: #2d2b29;
  border-radius: 4px;
  border: 1px solid #3f3c38;
  color: #d6d3d1;
  display: flex; /* Ensure radio and text align */
  align-items: center;
  gap: 8px;
  font-size: 16px;
}

.duration-selector label.selected {
  background: #4ade80;
  color: #1c1b1a;
  border-color: #4ade80;
  font-weight: bold;
}

.duration-selector input[type="radio"] {
    accent-color: #1c1b1a; /* Dark radio button on green background */
}

button {
  background: #4ade80;
  color: #1c1b1a;
  border: none;
  padding: 13px 32px;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  width: 100%;
  font-weight: bold;
  transition: transform 0.1s, opacity 0.2s;
}

button.secondary {
  background: #2d2b29;
  color: #a8a29e;
  margin-top: 16px;
  border: 1px solid #3f3c38;
}

button:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

button:active {
  transform: translateY(0);
}

#at10tion-timer {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(28, 27, 26, 0.9);
  color: #4ade80;
  padding: 10px 15px;
  border-radius: 20px;
  font-family: monospace;
  font-size: 16px;
  border: 1px solid #4ade80;
  box-shadow: 0 0 10px rgba(74, 222, 128, 0.2);
}

/* Shake animation */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}
.shake { animation: shake 0.5s ease-in-out; }

/* Breathing exercise styles */
.breathing-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 24px 0;
}

/* Animation 1: Morphing Blob - ROYGBIV Rainbow */
.breathing-blob {
  width: 120px;
  height: 120px;
  background: linear-gradient(
    135deg,
    #ff6b6b 0%,      /* Red */
    #ffa94d 14%,     /* Orange */
    #ffd43b 28%,     /* Yellow */
    #69db7c 42%,     /* Green */
    #4dabf7 56%,     /* Blue */
    #748ffc 70%,     /* Indigo */
    #da77f2 84%,     /* Violet */
    #ff6b6b 100%     /* Red (loop) */
  );
  background-size: 300% 300%;
  border-radius: 60% 40% 50% 50% / 50% 60% 40% 50%;
  animation: breathe 5s ease-in-out infinite, morph 5s ease-in-out infinite, rainbowShift 5s ease-in-out infinite;
  box-shadow: 
    0 0 60px rgba(255, 107, 107, 0.3),
    0 0 120px rgba(255, 169, 77, 0.2),
    0 0 180px rgba(105, 219, 124, 0.15);
  filter: saturate(1.2);
}

@keyframes breathe {
  0%, 100% { 
    transform: scale(0.8);
    opacity: 0.7;
  }
  50% { 
    transform: scale(1.2);
    opacity: 1;
  }
}

@keyframes morph {
  0%, 100% { border-radius: 60% 40% 50% 50% / 50% 60% 40% 50%; }
  25% { border-radius: 50% 60% 40% 50% / 40% 50% 60% 50%; }
  50% { border-radius: 40% 50% 60% 50% / 50% 40% 50% 60%; }
  75% { border-radius: 50% 40% 50% 60% / 60% 50% 40% 50%; }
}

@keyframes rainbowShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* Animation 2: Wave/Ocean */
.breathing-wave {
  width: 160px;
  height: 100px;
  position: relative;
  overflow: hidden;
  border-radius: 8px;
}

.breathing-wave::before,
.breathing-wave::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: -50%;
  width: 200%;
  height: 100%;
  background: linear-gradient(180deg, transparent 50%, rgba(74, 222, 128, 0.3) 100%);
  border-radius: 40%;
  animation: wave 5s ease-in-out infinite;
}

.breathing-wave::after {
  animation-delay: -2.5s;
  opacity: 0.6;
}

@keyframes wave {
  0%, 100% { 
    transform: translateY(30px) rotate(0deg);
  }
  50% { 
    transform: translateY(-10px) rotate(5deg);
  }
}

/* Animation 3: Breathing Circle */
.breathing-circle {
  width: 100px;
  height: 100px;
  border: 4px solid #4ade80;
  border-radius: 50%;
  animation: circleBreath 5s ease-in-out infinite;
  box-shadow: 0 0 20px rgba(74, 222, 128, 0.3), inset 0 0 20px rgba(74, 222, 128, 0.1);
}

@keyframes circleBreath {
  0%, 100% { 
    transform: scale(0.7);
    border-width: 4px;
    box-shadow: 0 0 20px rgba(74, 222, 128, 0.2), inset 0 0 15px rgba(74, 222, 128, 0.1);
  }
  50% { 
    transform: scale(1.3);
    border-width: 2px;
    box-shadow: 0 0 40px rgba(74, 222, 128, 0.5), inset 0 0 30px rgba(74, 222, 128, 0.2);
  }
}

.breathing-instruction {
  margin-top: 20px;
  font-size: 20px;
  color: #a8a29e;
  font-weight: 500;
  transition: opacity 0.5s ease;
}

.breathing-countdown {
  margin-top: 8px;
  font-size: 14px;
  color: #57534e;
  font-family: monospace;
}

.breathing-complete {
  color: #4ade80;
  font-weight: bold;
}
`;

function getShadowRoot(): ShadowRoot {
  if (!shadowHost) {
    shadowHost = document.createElement('div');
    shadowHost.id = 'at10tion-shadow-host';
    // Set styles on host to ensure it's on top but doesn't block clicks when empty
    shadowHost.style.cssText = 'position: fixed; top: 0; left: 0; z-index: 2147483647; pointer-events: none;';
    document.documentElement.appendChild(shadowHost);

    shadowRoot = shadowHost.attachShadow({ mode: 'closed' });

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = STYLES;
    shadowRoot.appendChild(styleEl);
  }
  // Re-append if missing (e.g. document body cleared)
  if (!document.documentElement.contains(shadowHost)) {
    document.documentElement.appendChild(shadowHost);
  }
  return shadowRoot!;
}

// =============================================================================
// Short-Form Detection State
// =============================================================================

let shortFormObserver: MutationObserver | null = null;
let currentShortFormDetector: ShortFormDetector | null = null;

// Check if current URL is a target for blocking
// Returns: { shouldBlock: boolean; site: BlockedSite | null; isShortFormDom: boolean }
async function getBlockingDecision(): Promise<{ shouldBlock: boolean; site: BlockedSite | null; isShortFormDom: boolean }> {
  const data = await chrome.storage.local.get([STORAGE_KEYS.BLOCKED_SITES]);
  const sites: BlockedSite[] = (data[STORAGE_KEYS.BLOCKED_SITES] as BlockedSite[]) || DEFAULT_BLOCKED_SITES;

  const { hostname, pathname } = globalThis.location;

  // Find matching site configuration
  const matchingSite = sites.find(site =>
    site.mode !== 'disabled' &&
    (hostname === site.domain ||
      hostname === `www.${site.domain}` ||
      hostname.endsWith(`.${site.domain}`))
  );

  if (!matchingSite) {
    return { shouldBlock: false, site: null, isShortFormDom: false };
  }

  // If entire-site mode, always block
  if (matchingSite.mode === 'entire-site') {
    return { shouldBlock: true, site: matchingSite, isShortFormDom: false };
  }

  // Short-form mode: check URL first, then DOM
  if (matchingSite.mode === 'short-form') {
    // 1. URL-based detection (existing logic)
    if (matchingSite.shortFormPaths?.some(path => pathname.includes(path))) {
      return { shouldBlock: true, site: matchingSite, isShortFormDom: false };
    }

    // 2. DOM-based detection (new hybrid approach)
    const detector = getDetectorForDomain(hostname);
    if (detector) {
      currentShortFormDetector = detector;
      if (domContainsShortForm(detector)) {
        return { shouldBlock: true, site: matchingSite, isShortFormDom: true };
      }
    }
  }

  return { shouldBlock: false, site: matchingSite, isShortFormDom: false };
}

/**
 * Handle short-form content based on the configured action.
 * - 'block-page': Show the full blocking overlay (default)
 * - 'hide-items': Hide individual short-form items
 * - 'blur-items': Blur individual short-form items
 */
function handleShortFormAction(site: BlockedSite, detector: ShortFormDetector): 'blocked-page' | 'handled-items' {
  const action = site.shortFormAction || 'block-page';

  if (action === 'hide-items') {
    hideShortFormItems(detector);
    return 'handled-items';
  } else if (action === 'blur-items') {
    blurShortFormItems(detector);
    return 'handled-items';
  }

  return 'blocked-page';
}

/**
 * Set up MutationObserver for dynamically loaded short-form content.
 */
function setupShortFormObserver(site: BlockedSite, detector: ShortFormDetector) {
  // Clean up existing observer
  if (shortFormObserver) {
    shortFormObserver.disconnect();
    shortFormObserver = null;
  }

  const action = site.shortFormAction || 'block-page';

  // Only observe for hide/blur modes - block-page handles it differently
  if (action === 'hide-items' || action === 'blur-items') {
    shortFormObserver = observeShortFormContent(detector, () => {
      if (action === 'hide-items') {
        hideShortFormItems(detector);
      } else {
        blurShortFormItems(detector);
      }
    });
  }
}

// checkState handles all blocking logic
async function checkState() {
  // Check if extension is enabled
  const settings = await chrome.storage.local.get([STORAGE_KEYS.IS_ENABLED]);
  if (settings[STORAGE_KEYS.IS_ENABLED] === false) {
    removeBlock();
    return;
  }

  // 1. Get blocking decision (URL + DOM based)
  const { shouldBlock, site, isShortFormDom } = await getBlockingDecision();

  logger.debug('Blocking decision:', {
    shouldBlock,
    siteDomain: site?.domain,
    siteMode: site?.mode,
    isShortFormDom,
    pathname: globalThis.location.pathname
  });

  if (!shouldBlock) {
    removeBlock();
    return;
  }

  // 2. Handle DOM-based short-form detection
  // IMPORTANT: DOM-based detection = shorts appear in a feed (e.g., homepage)
  // We should HIDE those items, NOT block the entire page.
  // Only URL-based detection (e.g., /shorts/xyz) should block the whole page.
  if (isShortFormDom && site && currentShortFormDetector) {
    logger.debug('DOM-based detection - hiding items, not blocking page');
    // Always hide items for DOM-based detection, regardless of shortFormAction setting
    // The shortFormAction setting is for URL-based detection only
    hideShortFormItems(currentShortFormDetector);
    setupShortFormObserver(site, currentShortFormDetector);
    // Don't block the whole page when shorts are just embedded in feeds
    removeBlock();
    return;
  }

  logger.debug('URL-based or entire-site detection - proceeding to block overlay');

  // 3. Check break status
  const data = await chrome.storage.local.get([STORAGE_KEYS.BREAK_STATE]);
  const breakState = data[STORAGE_KEYS.BREAK_STATE] as BreakState;

  const onBreak = breakState?.breakActive && breakState.breakEndTime > Date.now();

  if (onBreak) {
    logger.debug('User on break, not blocking');
    if (!breakTimerInterval) {
      startBreakTimer(breakState.breakEndTime);
    }
    // Ensure block is gone
    const root = getShadowRoot();
    const block = root.getElementById('work-focus-block');
    if (block) {
      block.remove();
      document.body.style.overflow = '';
      // Reset pointer events on host
      if (shadowHost) shadowHost.style.pointerEvents = 'none';
    }
  } else {
    // Not on break. If block not present, show it.
    logger.debug('Showing block overlay');
    const root = getShadowRoot();
    if (!root.getElementById('work-focus-block')) {
      showBlock();
    }
  }
}

async function showBlock() {
  const root = getShadowRoot();
  if (root.getElementById('work-focus-block')) return;

  // Enable pointer events on host so we can interact with overlay
  if (shadowHost) shadowHost.style.pointerEvents = 'auto';

  // Record this block in statistics
  recordBlock();

  // Stop media playback
  pauseAllMedia();

  // Get content type
  const settings = await chrome.storage.local.get([STORAGE_KEYS.CONTENT_TYPES]);
  const types = settings[STORAGE_KEYS.CONTENT_TYPES] || { quotes: true, math: true, teasers: true };
  const enabledTypes = (Object.entries(types) as [('quotes' | 'math' | 'teasers'), boolean][])
    .filter(([_, enabled]) => enabled)
    .map(([type]) => type);

  const randomType = enabledTypes.length > 0
    ? enabledTypes[getSecureRandomIndex(enabledTypes.length)]
    : 'quotes';
  const content = getRandomOfType(randomType);
  let contentHtml = '';

  if (content.type === 'quotes') {
    // Randomly select breathing animation style for variety
    const breathingStyles = ['breathing-blob', 'breathing-wave', 'breathing-circle'];
    const selectedStyle = breathingStyles[getSecureRandomIndex(breathingStyles.length)];

    contentHtml = `
        <div class="content-card">
          <blockquote>"${escapeHtml(content.text)}"</blockquote>
          <cite>- ${escapeHtml(content.author || 'Unknown')}</cite>
          <div class="breathing-container">
            <div class="${selectedStyle}"></div>
            <p class="breathing-instruction">Inhale...</p>
            <p class="breathing-countdown">15 seconds</p>
          </div>
        </div>
      `;
  } else if (content.type === 'math') {
    contentHtml = `
        <div class="content-card">
          <p class="challenge-text">Solve to Unlock: ${content.problem} = ?</p>
          <input type="number" id="challenge-answer" placeholder="Answer" autocomplete="off" />
        </div>
      `;
  } else if (content.type === 'teasers') {
    contentHtml = `
        <div class="content-card">
          <p class="challenge-text">${escapeHtml(content.question)}</p>
          <input type="text" id="challenge-answer" placeholder="Answer" autocomplete="off" />
          <p class="teaser-timer" style="font-size: 0.8em; color: #57534e; margin-top: 8px;">Think about it...</p>
          <p class="hint hint-1" style="display:none; font-size: 0.9em; color: #a8a29e; margin-top: 10px; font-style: italic;"></p>
          <p class="hint hint-2" style="display:none; font-size: 0.9em; color: #d4d4d4; margin-top: 5px;"></p>
        </div>
      `;
  }

  const stopIcon = getStatusIcon('stop');
  const overlay = document.createElement('div');
  overlay.id = 'work-focus-block';
  overlay.innerHTML = `
      <div class="block-container">
        <img src="${chrome.runtime.getURL('icons/icon128.png')}" style="width: 64px; margin-bottom: 1rem;" />
        <h1>${stopIcon.emoji || `<span style="color: ${stopIcon.color}; font-weight: bold;">${stopIcon.ascii}</span>`} Stop Doom-Scrolling</h1>
        ${contentHtml}
        
        <div class="controls" id="unlock-controls" style="opacity: 0.5; pointer-events: none;">
          <label style="display:block; margin-bottom:0.5rem; color:#a8a29e;">Break Duration:</label>
          <div class="duration-selector">
            <label class="selected"><input type="radio" name="duration" value="2" checked> 2m</label>
            <label><input type="radio" name="duration" value="5"> 5m</label>
            <label><input type="radio" name="duration" value="10"> 10m</label>
          </div>
          <button id="unlock-btn">Unlock & Take Break</button>
        </div>
        
        <button id="close-tab-btn" class="secondary">Close Tab</button>
      </div>
    `;

  root.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  // Block media control keyboard shortcuts from reaching the underlying page
  // This prevents spacebar, arrow keys, etc. from controlling video behind overlay
  overlay.addEventListener('keydown', (e) => {
    const mediaKeys = new Set(['Space', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'k', 'j', 'l', 'm', 'f']);
    if (mediaKeys.has(e.key) || mediaKeys.has(e.code)) {
      e.stopPropagation();
    }
  }, true); // Use capture phase to intercept early

  // Logic
  const answerInput = overlay.querySelector('#challenge-answer') as HTMLInputElement;
  const unlockControls = overlay.querySelector('#unlock-controls') as HTMLElement;
  const unlockBtn = overlay.querySelector('#unlock-btn');
  const closeBtn = overlay.querySelector('#close-tab-btn');
  const radioLabels = overlay.querySelectorAll('.duration-selector label');
  const radioInputs = overlay.querySelectorAll('input[name="duration"]');
  const breathingInstruction = overlay.querySelector('.breathing-instruction') as HTMLElement;
  const breathingCountdown = overlay.querySelector('.breathing-countdown') as HTMLElement;

  // Handle radio button styling (manual for robustness)
  radioInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      radioLabels.forEach(l => l.classList.remove('selected'));
      (e.target as HTMLElement).parentElement?.classList.add('selected');
    });
  });

  // Breathing exercise countdown for quotes
  if (content.type === 'quotes' && breathingInstruction && breathingCountdown) {
    let secondsLeft = 15;
    let isInhale = true;

    const updateBreathing = () => {
      secondsLeft--;
      breathingCountdown.textContent = `${secondsLeft} seconds`;

      // Toggle inhale/exhale every 2.5 seconds (synced with 5s animation cycle)
      if (secondsLeft % 2.5 === 0 || secondsLeft % 5 === 0) {
        isInhale = !isInhale;
        breathingInstruction.textContent = isInhale ? 'Inhale...' : 'Exhale...';
      }

      if (secondsLeft <= 0) {
        clearInterval(breathingInterval);
        breathingInstruction.textContent = 'Take your break';
        breathingInstruction.classList.add('breathing-complete');
        breathingCountdown.textContent = '';
        unlockControls.style.opacity = '1';
        unlockControls.style.pointerEvents = 'auto';
      }
    };

    const breathingInterval = setInterval(updateBreathing, 1000);
  }

  // Progressive hints for brain teasers (no more instant "Show Answer")
  if (content.type === 'teasers') {
    const teaserTimer = overlay.querySelector('.teaser-timer') as HTMLElement;
    const hint1 = overlay.querySelector('.hint-1') as HTMLElement;
    const hint2 = overlay.querySelector('.hint-2') as HTMLElement;
    let elapsed = 0;

    const answer = content.answer.toLowerCase();
    const firstLetter = answer.charAt(0).toUpperCase();
    const wordCount = answer.split(' ').length;

    const updateHints = () => {
      elapsed++;

      const hintIcon = getStatusIcon('hint');
      const hintPrefix = hintIcon.emoji || `<span style="color: ${hintIcon.color}; font-weight: bold;">${hintIcon.ascii}</span>`;

      if (elapsed === 15 && hint1) {
        // First hint: letter count and first letter
        hint1.style.display = 'block';
        hint1.innerHTML = `${hintPrefix} Hint: It starts with "${firstLetter}" and has ${answer.length} letters`;
        if (teaserTimer) teaserTimer.textContent = 'Still thinking...';
      }

      if (elapsed === 30 && hint2) {
        // Second hint: more direct
        hint2.style.display = 'block';
        if (wordCount === 1) {
          hint2.innerHTML = `${hintPrefix} The answer rhymes with or sounds like common words...`;
        } else {
          hint2.innerHTML = `${hintPrefix} It's ${wordCount} words: "${answer.split(' ').map(w => w[0] + '_'.repeat(w.length - 1)).join(' ')}"`;
        }
        if (teaserTimer) teaserTimer.textContent = 'Take your time...';
      }

      if (elapsed === 45) {
        // Reveal but still require input
        clearInterval(hintInterval);
        if (teaserTimer) {
          teaserTimer.textContent = `The answer is: ${content.answer}. Type it to continue.`;
          teaserTimer.style.color = '#4ade80';
        }
      }
    };

    const hintInterval = setInterval(updateHints, 1000);
  }

  let isCorrect = false;

  const checkAnswer = () => {
    if (!answerInput) return;
    const val = answerInput.value.trim().toLowerCase();
    let correct = false;

    if (content.type === 'math') {
      correct = Number.parseInt(val) === content.answer;
    } else if (content.type === 'teasers') {
      correct = fuzzyMatch(val, content.answer);
    }

    isCorrect = correct;
    if (correct) {
      unlockControls.style.opacity = '1';
      unlockControls.style.pointerEvents = 'auto';
      answerInput.style.borderColor = '#4ade80';
      const errorMsg = overlay.querySelector('.error-msg');
      if (errorMsg) errorMsg.remove();
    } else {
      unlockControls.style.opacity = '0.5';
      unlockControls.style.pointerEvents = 'none';
      answerInput.style.borderColor = '#333';
    }
  };

  if (answerInput) {
    answerInput.addEventListener('input', checkAnswer);
    answerInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (isCorrect) {
          (unlockBtn as HTMLElement).click();
        } else if (answerInput.value.trim().length > 0) {
          answerInput.style.borderColor = '#ef4444';
          answerInput.classList.add('shake');
          setTimeout(() => answerInput.classList.remove('shake'), 500);

          let errorMsg = overlay.querySelector('.error-msg') as HTMLElement;
          if (!errorMsg) {
            errorMsg = document.createElement('p');
            errorMsg.className = 'error-msg';
            errorMsg.style.cssText = 'color: #ef4444; font-size: 0.85em; margin-top: 5px;';
            answerInput.parentElement?.appendChild(errorMsg);
          }
          errorMsg.textContent = 'Incorrect, try again';
        }
      }
    });
    setTimeout(() => answerInput.focus(), 100);
  } else if (content.type !== 'quotes') {
    // For non-quote content without input (shouldn't happen, but safety)
    unlockControls.style.opacity = '1';
    unlockControls.style.pointerEvents = 'auto';
  }

  unlockBtn?.addEventListener('click', async () => {
    const data = await chrome.storage.local.get([STORAGE_KEYS.BREAK_STATE, STORAGE_KEYS.BREAK_LIMITS]);
    const currentState = (data[STORAGE_KEYS.BREAK_STATE] as BreakState) || {
      breakActive: false, breakEndTime: 0, breakDurationMinutes: 0,
      breaksToday: 0, breaksTodayDate: getTodayString(), consecutiveBreaks: 0, lastBreakEndTime: 0
    };
    const limits = (data[STORAGE_KEYS.BREAK_LIMITS] as BreakLimits) || DEFAULT_BREAK_LIMITS;

    const { allowed, reason } = canTakeBreak(currentState, limits);
    if (!allowed) {
      const errorDiv = overlay.querySelector('.break-limit-error') as HTMLElement || (() => {
        const div = document.createElement('div');
        div.className = 'break-limit-error';
        div.style.cssText = 'color: #10b981; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 10px; border-radius: 6px; margin-top: 10px; text-align: center;';
        overlay.querySelector('.controls')?.appendChild(div);
        return div;
      })();
      const focusIcon = getStatusIcon('focus');
      const iconHtml = focusIcon.emoji || `<span style="color: ${focusIcon.color};">${focusIcon.ascii}</span>`;
      errorDiv.innerHTML = `<strong>${iconHtml} Focus Checkpoint</strong><br/>${reason}`;
      return;
    }

    const durationInput = overlay.querySelector('input[name="duration"]:checked') as HTMLInputElement;
    const duration = Number.parseInt(durationInput.value);
    const endTime = Date.now() + (duration * 60 * 1000);

    recordBreak(duration);

    const today = getTodayString();
    const breaksToday = currentState.breaksTodayDate === today ? currentState.breaksToday + 1 : 1;
    const newState: BreakState = {
      breakActive: true,
      breakEndTime: endTime,
      breakDurationMinutes: duration,
      breaksToday,
      breaksTodayDate: today,
      consecutiveBreaks: currentState.consecutiveBreaks + 1,
      lastBreakEndTime: currentState.lastBreakEndTime // Updated by background/onBreakEnd really, but we'll update stats here
    };

    await chrome.storage.local.set({ [STORAGE_KEYS.BREAK_STATE]: newState });
  });

  closeBtn?.addEventListener('click', () => {
    if (confirm('Close this tab and go back to work?')) {
      chrome.runtime.sendMessage({ action: "close_tab" });
    }
  });
}

function removeBlock() {
  if (blockObserver) {
    blockObserver.disconnect();
    blockObserver = null;
  }
  const root = getShadowRoot();
  const overlay = root.getElementById('work-focus-block');
  if (overlay) {
    overlay.remove();
    document.body.style.overflow = '';
    if (shadowHost) shadowHost.style.pointerEvents = 'none';

  }
}

function startBreakTimer(endTime: number) {
  stopBreakTimer();
  const root = getShadowRoot();

  // Ensure host sees events? No, timer is informational, check if it needs pointer events
  // Timer has pointer-events: none in CSS, so host being pointer-events: auto or none doesn't matter much for clicks on timer
  // BUT we need the host to be visible.
  // If we rely on pointer-events: none on host for clicking THROUGH to the page, 
  // we must ensure the timer itself is visible.
  // Shadow host z-index is max.

  // Wait... if host has pointer-events: none, then anything inside it that DOES have pointer-events: auto (if any) works?
  // No, if parent has pointer-events: none, children can override it. 
  // But my timer CSS has pointer-events: none. So it's just visual.

  const timerDiv = document.createElement('div');
  timerDiv.id = 'at10tion-timer';
  root.appendChild(timerDiv);

  const update = async () => {
    const remaining = endTime - Date.now();
    if (remaining <= 0) {
      // Stop timer and pause media before blocking resumes
      stopBreakTimer();
      pauseAllMedia();
      // Then update state asynchronously
      const data = await chrome.storage.local.get([STORAGE_KEYS.BREAK_STATE]);
      const currentState = data[STORAGE_KEYS.BREAK_STATE] as BreakState;
      if (currentState) {
        // Record actual time spent on site during break
        const actualTimeMinutes = currentState.breakDurationMinutes;
        if (actualTimeMinutes > 0) {
          recordTimeOnSite(actualTimeMinutes);
        }

        const updatedState: BreakState = {
          ...currentState,
          breakActive: false,
          breakEndTime: 0
        };
        await chrome.storage.local.set({ [STORAGE_KEYS.BREAK_STATE]: updatedState });
      }
      return;
    }
    const m = Math.floor(remaining / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    timerDiv.textContent = `${m}:${s.toString().padStart(2, '0')}`;
  };

  update();
  breakTimerInterval = setInterval(update, 1000);
}

function stopBreakTimer() {
  if (breakTimerInterval) clearInterval(breakTimerInterval);
  breakTimerInterval = undefined;
  const root = getShadowRoot();
  const el = root.getElementById('at10tion-timer');
  if (el) el.remove();
}

// Store poll interval for cleanup
let pollInterval: ReturnType<typeof setInterval> | undefined;

// Cleanup on page unload to prevent orphaned intervals/observers
globalThis.addEventListener('beforeunload', () => {
  if (breakTimerInterval) clearInterval(breakTimerInterval);
  if (pollInterval) clearInterval(pollInterval);
  if (shortFormObserver) {
    shortFormObserver.disconnect();
    shortFormObserver = null;
  }
});

// Initialize
(async () => { // NOSONAR
  // Initial check
  try {
    await checkState();
  } catch (e) {
    // Context invalidated or other error, safe to ignore during init/reload
    logger.debug('Init checkState error (expected):', e);
  }

  // Poll less frequently - storage change listeners handle most updates
  // This is a fallback for edge cases (e.g., SPA navigation not detected)
  pollInterval = setInterval(() => {
    if (!chrome.runtime?.id) {
      clearInterval(pollInterval);
      pollInterval = undefined;
      return;
    }
    checkState().catch((e) => {
      logger.debug('Poll checkState error:', e);
      clearInterval(pollInterval);
      pollInterval = undefined;
    });
  }, POLLING_INTERVALS.CONTENT_SCRIPT_FALLBACK_MS);

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes) => {
    if (!chrome.runtime?.id) return;

    if (changes[STORAGE_KEYS.IS_ENABLED]) checkState().catch((e) => logger.debug('Storage change checkState error:', e));

    if (changes[STORAGE_KEYS.BREAK_STATE]) {
      const newBreakState = changes[STORAGE_KEYS.BREAK_STATE].newValue as BreakState | undefined;
      if (newBreakState?.breakActive) {
        removeBlock();
        if (newBreakState.breakEndTime) startBreakTimer(newBreakState.breakEndTime);
      } else {
        // Break ended - checkState will show block overlay which pauses media
        // Don't call pauseAllMedia() here since this fires in ALL tabs,
        // not just blocked ones
        stopBreakTimer();
        checkState().catch((e) => logger.debug('Break end checkState error:', e));
      }
    }

    if (changes[STORAGE_KEYS.BLOCKED_SITES]) checkState().catch((e) => logger.debug('Blocked sites change checkState error:', e));
  });
})();
