/// <reference types="chrome"/>

import {
    DEFAULT_BLOCKED_SITES,
    DEFAULT_BREAK_LIMITS,
    POLLING_INTERVALS,
    STORAGE_KEYS,
    BreakState,
    getTodayString
} from './constants';
import { logger } from './logger';

// =============================================================================
// Installation Handler
// =============================================================================

chrome.runtime.onInstalled.addListener((details) => {
    chrome.storage.local.get([
        STORAGE_KEYS.IS_ENABLED,
        STORAGE_KEYS.ONBOARDING_COMPLETE,
        STORAGE_KEYS.BLOCKED_SITES
    ], (result) => {
        // Set default values on first install
        if (result[STORAGE_KEYS.IS_ENABLED] === undefined) {
            const defaultBreakState: BreakState = {
                breakActive: false,
                breakEndTime: 0,
                breakDurationMinutes: 0,
                breaksToday: 0,
                breaksTodayDate: getTodayString(),
                consecutiveBreaks: 0,
                lastBreakEndTime: 0
            };

            chrome.storage.local.set({
                [STORAGE_KEYS.IS_ENABLED]: true,
                [STORAGE_KEYS.CONTENT_TYPES]: {
                    quotes: true,
                    math: true,
                    teasers: true
                },
                [STORAGE_KEYS.BLOCKED_SITES]: DEFAULT_BLOCKED_SITES,
                [STORAGE_KEYS.BREAK_STATE]: defaultBreakState,
                [STORAGE_KEYS.BREAK_LIMITS]: DEFAULT_BREAK_LIMITS
            });
        }

        // Migration: Update old format blocked_sites to new format
        if (result[STORAGE_KEYS.BLOCKED_SITES] && Array.isArray(result[STORAGE_KEYS.BLOCKED_SITES])) {
            const sites = result[STORAGE_KEYS.BLOCKED_SITES] as Array<{ domain: string; enabled?: boolean; blockAll?: boolean; paths?: string[]; mode?: string }>;
            // Check if using old format (has 'enabled' and 'blockAll' instead of 'mode')
            if (sites.length > 0 && sites[0].enabled !== undefined) {
                const determineBlockMode = (enabled: boolean | undefined, blockAll: boolean | undefined): string => {
                    if (!enabled) return 'disabled';
                    return blockAll ? 'entire-site' : 'short-form';
                };

                const migratedSites = sites.map((s) => ({
                    domain: s.domain,
                    mode: determineBlockMode(s.enabled, s.blockAll),
                    shortFormPaths: s.paths,
                    isCustom: false
                }));
                chrome.storage.local.set({ [STORAGE_KEYS.BLOCKED_SITES]: migratedSites });

            }
        }

        // Show onboarding on first install
        if (details.reason === 'install' && !result[STORAGE_KEYS.ONBOARDING_COMPLETE]) {
            chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
        }
    });

    // Create alarm for break checking (persists across service worker restarts)
    chrome.alarms.create('breakCheck', { periodInMinutes: POLLING_INTERVALS.BREAK_CHECK_MINUTES });
    chrome.alarms.create('dailyReset', { periodInMinutes: POLLING_INTERVALS.DAILY_RESET_CHECK_MINUTES });
});

// =============================================================================
// Alarm Handlers
// =============================================================================

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'breakCheck') {
        handleBreakCheck();
    } else if (alarm.name === 'dailyReset') {
        handleDailyReset();
    }
});

async function handleBreakCheck() {
    const data = await chrome.storage.local.get([STORAGE_KEYS.BREAK_STATE]);
    const breakState = data[STORAGE_KEYS.BREAK_STATE] as BreakState;

    if (breakState?.breakActive && breakState.breakEndTime) {
        if (Date.now() > breakState.breakEndTime) {
            // Break expired
            const updatedState: BreakState = {
                ...breakState,
                breakActive: false,
                breakEndTime: 0,
                lastBreakEndTime: Date.now()
            };
            await chrome.storage.local.set({ [STORAGE_KEYS.BREAK_STATE]: updatedState });

        }
    }
}

async function handleDailyReset() {
    const data = await chrome.storage.local.get([STORAGE_KEYS.BREAK_STATE]);
    const breakState = data[STORAGE_KEYS.BREAK_STATE] as BreakState;
    const today = getTodayString();

    if (breakState && breakState.breaksTodayDate !== today) {
        // New day - reset daily counters
        const updatedState: BreakState = {
            ...breakState,
            breaksToday: 0,
            breaksTodayDate: today,
            consecutiveBreaks: 0
        };
        await chrome.storage.local.set({ [STORAGE_KEYS.BREAK_STATE]: updatedState });

    }
}

// =============================================================================
// Message Handlers
// =============================================================================

chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.action === "close_tab" && sender.tab?.id) {
        chrome.tabs.remove(sender.tab.id);
    }
});


// =============================================================================
// Dynamic Content Script Registration (For Custom Sites)
// =============================================================================

async function updateContentScriptRegistration() {
    try {
        const data = await chrome.storage.local.get([STORAGE_KEYS.BLOCKED_SITES]);
        const sites = (data[STORAGE_KEYS.BLOCKED_SITES] as Array<{ domain: string; isCustom: boolean }>) || [];

        // Filter for custom sites only
        const customDomains = sites.filter(s => s.isCustom).map(s => s.domain);

        if (customDomains.length === 0) {
            // Remove registration if no custom sites
            const existing = await chrome.scripting.getRegisteredContentScripts();
            if (existing.some(s => s.id === 'custom-blocked-sites')) {
                await chrome.scripting.unregisterContentScripts({ ids: ['custom-blocked-sites'] });
            }
            return;
        }

        const matchPatterns = customDomains.map(domain => `*://*.${domain}/*`);

        // Register or Update
        // Note: registerContentScripts persists, but we can't "update" purely, we must unregister then register 
        // OR use updateContentScripts (Chrome 102+). Let's use robust unregister/register.

        // Remove old first to avoid "Duplicate script ID" error if we are just updating patterns
        const existing = await chrome.scripting.getRegisteredContentScripts();
        if (existing.some(s => s.id === 'custom-blocked-sites')) {
            await chrome.scripting.unregisterContentScripts({ ids: ['custom-blocked-sites'] });
        }

        await chrome.scripting.registerContentScripts([{
            id: 'custom-blocked-sites',
            js: ['content.js'],
            matches: matchPatterns,
            runAt: 'document_end',
            persistAcrossSessions: true
        }]);

    } catch (err) {
        logger.error("Failed to register content scripts:", err);
    }
}

// Watch for changes to blocked sites to update registration
chrome.storage.onChanged.addListener((changes) => {
    if (changes[STORAGE_KEYS.BLOCKED_SITES]) {
        updateContentScriptRegistration();
    }
});

// Run on startup/install to ensure consistency
chrome.runtime.onStartup.addListener(updateContentScriptRegistration);
// Also run onInstalled after the default data init
chrome.runtime.onInstalled.addListener(() => {
    // Wait a bit for the initial storage set to handle defaults
    setTimeout(updateContentScriptRegistration, 1000);
});
