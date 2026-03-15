/// <reference types="chrome"/>

import { DEFAULT_BREAK_LIMITS, STORAGE_KEYS } from './constants';

// Inject dynamic break limit values from constants (single source of truth)
document.addEventListener('DOMContentLoaded', () => {
    const consecutiveEl = document.getElementById('break-consecutive-limit');
    const cooldownEl = document.getElementById('break-cooldown-minutes');

    if (consecutiveEl) {
        consecutiveEl.textContent = String(DEFAULT_BREAK_LIMITS.consecutiveLimit);
    }
    if (cooldownEl) {
        cooldownEl.textContent = String(DEFAULT_BREAK_LIMITS.cooldownMinutes);
    }
});

document.getElementById('get-started')?.addEventListener('click', () => {
    // Mark onboarding as complete
    chrome.storage.local.set({ [STORAGE_KEYS.ONBOARDING_COMPLETE]: true }, () => {
        globalThis.close();
    });
});

document.getElementById('open-settings')?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.storage.local.set({ [STORAGE_KEYS.ONBOARDING_COMPLETE]: true }, () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('options.html?source=onboarding') });
    });
});

