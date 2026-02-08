/// <reference types="chrome"/>

import { getStats, getWeeklyStats, getWeeklyTrend, formatPeakHours } from './stats';
import {
    STORAGE_KEYS,
    BreakState,
    BreakLimits,
    DEFAULT_BREAK_LIMITS,
    getTodayString
} from './constants';
import { getStatusIcon, ICON_STYLES } from './icons/index';
import { safeStorageGet, showErrorState } from './errorBoundary';
import type { IconResult } from './icons/index';

const TIMER_CIRCUMFERENCE = 283; // 2 * π * 45

/** Ensures icon styles are added to the document head */
function ensureIconStyles(): void {
    if (!document.getElementById('icon-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'icon-styles';
        styleSheet.textContent = ICON_STYLES;
        document.head.appendChild(styleSheet);
    }
}

/** Renders an icon (emoji or styled ASCII) with text */
function renderIconWithText(icon: IconResult, text: string): string {
    const iconHtml = icon.emoji || `<span style="color: ${icon.color}; font-weight: bold;">${icon.ascii}</span>`;
    return `${iconHtml} ${text}`;
}

/** Updates the break limit info display */
function updateBreakLimitDisplay(breakLimitInfo: HTMLElement, remainingBreaks: number, dailyLimit: number): void {
    const icon = remainingBreaks > 0 ? getStatusIcon('breaks') : getStatusIcon('complete');
    const text = remainingBreaks > 0
        ? `${remainingBreaks} of ${dailyLimit} breaks remaining`
        : 'All breaks used—focus mode active!';
    breakLimitInfo.innerHTML = renderIconWithText(icon, text);
}

/** Updates UI elements for active break state */
function updateActiveBreakUI(
    statusText: HTMLElement,
    timerDisplay: HTMLElement,
    timerProgress: SVGCircleElement | null,
    timerWrapper: HTMLElement | null,
    endBreakBtn: HTMLElement,
    breakState: BreakState
): void {
    const onIcon = getStatusIcon('on');
    statusText.innerHTML = renderIconWithText(onIcon, 'ON BREAK');
    statusText.className = 'status-active';
    endBreakBtn.style.display = 'block';
    timerWrapper?.classList.add('timer-active');

    const remaining = breakState.breakEndTime - Date.now();
    const totalDuration = breakState.breakDurationMinutes * 60 * 1000;
    const progress = remaining / totalDuration;

    const m = Math.floor(remaining / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    timerDisplay.textContent = `${m}:${s.toString().padStart(2, '0')}`;

    if (timerProgress) {
        timerProgress.style.strokeDashoffset = String(TIMER_CIRCUMFERENCE * (1 - progress));
    }
}

/** Updates UI elements for focus mode (blocked) state */
function updateFocusModeUI(
    statusText: HTMLElement,
    timerDisplay: HTMLElement,
    timerProgress: SVGCircleElement | null,
    timerWrapper: HTMLElement | null,
    endBreakBtn: HTMLElement
): void {
    const offIcon = getStatusIcon('off');
    statusText.innerHTML = renderIconWithText(offIcon, 'FOCUS MODE');
    statusText.className = 'status-blocked';
    endBreakBtn.style.display = 'none';
    timerWrapper?.classList.remove('timer-active');
    timerDisplay.textContent = '--:--';
    if (timerProgress) {
        timerProgress.style.strokeDashoffset = '0';
    }
}

/** Creates a stat item element */
function createStatItem(value: string, label: string, title?: string): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'stat-item';
    if (title) item.title = title;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'stat-value';
    valueSpan.textContent = value;

    const labelSpan = document.createElement('span');
    labelSpan.className = 'stat-label';
    labelSpan.textContent = label;

    item.appendChild(valueSpan);
    item.appendChild(labelSpan);
    return item;
}

/** Updates the stats and trend containers */
async function updateStatsAndTrends(statsContainer: HTMLElement): Promise<void> {
    const stats = await getStats();
    const weekly = getWeeklyStats(stats);
    const trend = getWeeklyTrend(stats);

    statsContainer.textContent = '';

    statsContainer.appendChild(
        createStatItem(String(weekly.blocksThisWeek), 'Interventions', 'Times we helped you refocus this week')
    );
    statsContainer.appendChild(
        createStatItem(`${weekly.timeOnSiteThisWeek}m`, 'On sites', 'Actual minutes on blocked sites during breaks')
    );

    const streakIcon = getStatusIcon('streak');
    statsContainer.appendChild(
        createStatItem(
            `${streakIcon.emoji || streakIcon.ascii} ${stats.currentStreak}`,
            'Focus streak',
            'Consecutive days with mindful browsing'
        )
    );

    updateTrendContainer(trend, weekly);
}

/** Updates the trend container with trend and peak hours info */
function updateTrendContainer(
    trend: { description: string; improved: boolean },
    weekly: { peakHours: number[] }
): void {
    const trendContainer = document.getElementById('trend-container');
    if (!trendContainer) return;

    trendContainer.textContent = '';

    const trendText = document.createElement('p');
    trendText.className = 'trend-text';
    trendText.textContent = trend.description;
    if (trend.improved) {
        trendText.classList.add('trend-improved');
    }
    trendContainer.appendChild(trendText);

    if (weekly.peakHours.length > 0) {
        const peakText = document.createElement('p');
        peakText.className = 'peak-hours-text';
        peakText.textContent = `📍 Most vulnerable: ${formatPeakHours(weekly.peakHours)}`;
        trendContainer.appendChild(peakText);
    }
}

async function updateDisplay(): Promise<void> {
    const statusText = document.getElementById('status-text');
    const timerDisplay = document.getElementById('timer');
    const timerProgress = document.getElementById('timer-progress') as SVGCircleElement | null;
    const timerWrapper = document.getElementById('timer-wrapper');
    const endBreakBtn = document.getElementById('end-break-btn');
    const statsContainer = document.getElementById('stats-container');
    const breakLimitInfo = document.getElementById('break-limit-info');

    ensureIconStyles();

    if (!statusText || !timerDisplay || !endBreakBtn) return;

    const data = await safeStorageGet<Record<string, unknown>>([STORAGE_KEYS.BREAK_STATE, STORAGE_KEYS.BREAK_LIMITS]);
    if (!data) {
        showErrorState(document.body, 'Unable to load extension data. Please try again.');
        return;
    }

    const breakState = (data[STORAGE_KEYS.BREAK_STATE] as BreakState) || {
        breakActive: false,
        breakEndTime: 0,
        breakDurationMinutes: 0,
        breaksToday: 0,
        breaksTodayDate: getTodayString(),
        consecutiveBreaks: 0,
        lastBreakEndTime: 0
    };
    const limits = (data[STORAGE_KEYS.BREAK_LIMITS] as BreakLimits) || DEFAULT_BREAK_LIMITS;

    const today = getTodayString();
    const breaksToday = breakState.breaksTodayDate === today ? breakState.breaksToday : 0;
    const remainingBreaks = Math.max(0, limits.dailyLimit - breaksToday);

    if (breakLimitInfo) {
        updateBreakLimitDisplay(breakLimitInfo, remainingBreaks, limits.dailyLimit);
    }

    const isOnBreak = breakState.breakActive && breakState.breakEndTime > Date.now();
    if (isOnBreak) {
        updateActiveBreakUI(statusText, timerDisplay, timerProgress, timerWrapper, endBreakBtn, breakState);
    } else {
        updateFocusModeUI(statusText, timerDisplay, timerProgress, timerWrapper, endBreakBtn);
    }


    if (statsContainer) {
        await updateStatsAndTrends(statsContainer);
    }
}

document.getElementById('end-break-btn')?.addEventListener('click', async () => {
    const data = await chrome.storage.local.get([STORAGE_KEYS.BREAK_STATE]);
    const breakState = (data[STORAGE_KEYS.BREAK_STATE] as BreakState);

    if (breakState) {
        const updatedState: BreakState = {
            ...breakState,
            breakActive: false,
            breakEndTime: 0,
            lastBreakEndTime: Date.now()
        };
        await chrome.storage.local.set({ [STORAGE_KEYS.BREAK_STATE]: updatedState });
    }

    globalThis.close();
});

document.getElementById('open-options')?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
});

// Timer interval - only runs during active breaks
let displayInterval: ReturnType<typeof setInterval> | undefined;

async function updateDisplayAndManageInterval() {
    await updateDisplay();

    // Check if we need the interval (break is active)
    const data = await chrome.storage.local.get([STORAGE_KEYS.BREAK_STATE]);
    const breakState = data[STORAGE_KEYS.BREAK_STATE] as BreakState | undefined;
    const isOnBreak = breakState?.breakActive && breakState.breakEndTime > Date.now();

    if (isOnBreak && !displayInterval) {
        // Start interval when break is active
        displayInterval = setInterval(updateDisplay, 1000);
    } else if (!isOnBreak && displayInterval) {
        // Stop interval when break ends
        clearInterval(displayInterval);
        displayInterval = undefined;
    }
}

// Listen for break state changes
chrome.storage.onChanged.addListener((changes) => {
    if (changes[STORAGE_KEYS.BREAK_STATE]) {
        updateDisplayAndManageInterval();
    }
});

await updateDisplayAndManageInterval();
