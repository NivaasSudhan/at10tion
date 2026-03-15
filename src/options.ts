/// <reference types="chrome"/>

import {
    BlockedSite,
    BlockingMode,
    DEFAULT_BLOCKED_SITES,
    SHORT_FORM_CAPABLE_DOMAINS,
    STORAGE_KEYS,
    UI_TIMING,
    isValidDomain
} from './constants';

import { requestSitePermission } from './permissions';
import { getPlatformIcon, ICON_STYLES } from './icons/index';
import { safeStorageGet, showErrorState } from './errorBoundary';

// =============================================================================
// State
// =============================================================================

let currentSites: BlockedSite[] = [];
const shouldAutoClose = new URLSearchParams(globalThis.location.search).has('source');

// =============================================================================
// Load Settings
// =============================================================================

async function loadSettings() {
    const data = await safeStorageGet<Record<string, unknown>>([
        STORAGE_KEYS.IS_ENABLED,
        STORAGE_KEYS.CONTENT_TYPES,
        STORAGE_KEYS.BLOCKED_SITES,
        STORAGE_KEYS.BREAK_LIMITS
    ]);

    if (!data) {
        showErrorState(document.body, 'Unable to load settings. Please try again.');
        return;
    }

    // Extension enabled toggle
    const isEnabled = data[STORAGE_KEYS.IS_ENABLED] as boolean ?? true;
    (document.getElementById('is-enabled') as HTMLInputElement).checked = isEnabled;

    // Content types
    const types = (data[STORAGE_KEYS.CONTENT_TYPES] as { quotes: boolean; math: boolean; teasers: boolean })
        || { quotes: true, math: true, teasers: true };
    (document.getElementById('type-quotes') as HTMLInputElement).checked = types.quotes;
    (document.getElementById('type-math') as HTMLInputElement).checked = types.math;
    (document.getElementById('type-teasers') as HTMLInputElement).checked = types.teasers;

    // Load blocked sites
    currentSites = (data[STORAGE_KEYS.BLOCKED_SITES] as BlockedSite[]) || [...DEFAULT_BLOCKED_SITES];
    renderBlockedSites();
}

// =============================================================================
// Render Blocked Sites
// =============================================================================

function renderBlockedSites() {
    const defaultContainer = document.getElementById('default-sites-list');
    const customContainer = document.getElementById('custom-sites-list');
    if (!defaultContainer || !customContainer) return;

    const defaultSites = currentSites.filter(s => !s.isCustom);
    const customSites = currentSites.filter(s => s.isCustom);

    // Clear containers
    defaultContainer.replaceChildren();
    customContainer.replaceChildren();

    // Render default platforms with 3-mode radio buttons
    for (const site of defaultSites) {
        const actualIndex = currentSites.indexOf(site);
        const supportsShortForm = SHORT_FORM_CAPABLE_DOMAINS.includes(site.domain);
        defaultContainer.appendChild(createSiteItem(site, actualIndex, true, supportsShortForm));
    }

    // Render custom sites with 2-mode (entire-site or disabled)
    if (customSites.length === 0) {
        const emptyState = document.createElement('p');
        emptyState.className = 'empty-state';
        emptyState.textContent = 'No custom sites added yet.';
        customContainer.appendChild(emptyState);
    } else {
        for (const site of customSites) {
            const actualIndex = currentSites.indexOf(site);
            customContainer.appendChild(createSiteItem(site, actualIndex, false, false));
        }
    }
}

/**
 * Creates a site item element using DOM methods (XSS-safe)
 */
function createSiteItem(site: BlockedSite, index: number, isDefault: boolean, supportsShortForm: boolean): HTMLElement {
    const div = document.createElement('div');
    div.className = isDefault ? 'site-item' : 'site-item custom-site';
    div.dataset.index = String(index);

    // Site header
    const header = document.createElement('div');
    header.className = 'site-header';

    const domainSpan = document.createElement('span');
    domainSpan.className = 'site-domain';

    // Add icon (using DOM methods)
    const iconElement = createSiteIconElement(site.domain);
    domainSpan.appendChild(iconElement);

    // Add domain name using textContent (auto-escapes, XSS-safe)
    const domainText = document.createTextNode(' ' + site.domain);
    domainSpan.appendChild(domainText);

    header.appendChild(domainSpan);

    // Add remove button for custom sites
    if (!isDefault) {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-site';
        removeBtn.title = 'Remove';
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', () => {
            currentSites.splice(index, 1);
            saveBlockedSites();
            renderBlockedSites();
        });
        header.appendChild(removeBtn);
    }

    div.appendChild(header);

    // Mode selector
    const modeSelector = document.createElement('div');
    modeSelector.className = 'mode-selector';

    // Add short-form option for supported sites
    if (supportsShortForm) {
        modeSelector.appendChild(createModeOption(index, 'short-form', 'Short-Form Only', site.mode === 'short-form'));
    }

    modeSelector.appendChild(createModeOption(index, 'entire-site', 'Entire Site', site.mode === 'entire-site'));
    modeSelector.appendChild(createModeOption(index, 'disabled', 'Disabled', site.mode === 'disabled'));

    div.appendChild(modeSelector);

    return div;
}

/**
 * Creates a mode option label with radio button
 */
function createModeOption(index: number, value: BlockingMode, label: string, checked: boolean): HTMLElement {
    const labelEl = document.createElement('label');
    labelEl.className = 'mode-option';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = `mode-${index}`;
    radio.value = value;
    radio.checked = checked;
    radio.addEventListener('change', () => {
        currentSites[index].mode = value;
        saveBlockedSites();
    });

    const span = document.createElement('span');
    span.textContent = label;

    labelEl.appendChild(radio);
    labelEl.appendChild(span);

    return labelEl;
}

/**
 * Creates an icon element for the site (XSS-safe)
 */
function createSiteIconElement(domain: string): HTMLElement {
    const icon = getPlatformIcon(domain);

    if (icon.svg) {
        const img = document.createElement('img');
        img.src = chrome.runtime.getURL(`icons/platforms/${icon.svg}`);
        img.width = 16;
        img.height = 16;
        img.alt = domain;
        img.className = `platform-icon icon-${domain.replace(/\./g, '-')}`;
        return img;
    }

    if (icon.emoji) {
        const span = document.createElement('span');
        span.className = 'icon-emoji';
        span.textContent = icon.emoji;
        return span;
    }

    const span = document.createElement('span');
    span.className = 'icon-ascii';
    span.style.color = icon.color ?? '#666666';
    span.style.fontWeight = 'bold';
    span.textContent = icon.ascii;
    return span;
}

// =============================================================================
// Save Functions
// =============================================================================

async function saveBlockedSites() {
    await chrome.storage.local.set({ [STORAGE_KEYS.BLOCKED_SITES]: currentSites });
    showSavedToast();
}



// =============================================================================
// Add Custom Site
// =============================================================================

async function addNewSite() {
    const input = document.getElementById('new-site-input') as HTMLInputElement;
    let domain = input.value.trim().toLowerCase();

    if (!domain) return;

    // Parse domain from URL or raw input
    let url: URL;
    try {
        url = new URL(domain);
    } catch {
        try {
            url = new URL('https://' + domain);
        } catch {
            alert('Please enter a valid domain');
            return;
        }
    }

    domain = url.hostname;
    if (domain.startsWith('www.')) {
        domain = domain.slice(4);
    }

    if (!domain.includes('.') || !isValidDomain(domain)) {
        alert('Please enter a valid domain (e.g., reddit.com)');
        return;
    }

    // Check if already exists
    if (currentSites.some(s => s.domain === domain)) {
        alert('This site is already in your list');
        return;
    }

    // Request permission for the custom domain
    const permissionGranted = await requestSitePermission(domain);
    if (!permissionGranted) {
        alert(`Permission denied for ${domain}. The site cannot be blocked without permission.`);
        return;
    }

    // Add as custom site with entire-site mode
    currentSites.push({
        domain,
        mode: 'entire-site',
        isCustom: true
    });

    await saveBlockedSites();
    renderBlockedSites();
    input.value = '';
}

// =============================================================================
// General Settings
// =============================================================================

async function saveSettings() {
    const isEnabled = (document.getElementById('is-enabled') as HTMLInputElement).checked;
    const quotes = (document.getElementById('type-quotes') as HTMLInputElement).checked;
    const math = (document.getElementById('type-math') as HTMLInputElement).checked;
    const teasers = (document.getElementById('type-teasers') as HTMLInputElement).checked;

    if (!quotes && !math && !teasers) {
        alert("Please select at least one content type.");
        return;
    }

    await chrome.storage.local.set({
        [STORAGE_KEYS.IS_ENABLED]: isEnabled,
        [STORAGE_KEYS.CONTENT_TYPES]: { quotes, math, teasers }
    });

    showSavedToast();

    if (shouldAutoClose) {
        setTimeout(() => window.close(), UI_TIMING.SETTINGS_AUTO_CLOSE_MS);
    }
}

// =============================================================================
// UI Helpers
// =============================================================================

function debounce(fn: () => void, delay: number) {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(fn, delay);
    };
}

function showSavedToast() {
    const msg = document.getElementById('save-msg');
    if (msg) {
        msg.textContent = '[OK] Saved';
        msg.style.display = 'inline';
        setTimeout(() => { msg.style.display = 'none'; }, UI_TIMING.TOAST_DISPLAY_MS);
    }
}

const debouncedSave = debounce(async () => {
    await saveSettings();
}, 500);



// =============================================================================
// Event Listeners
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Add icon styles to document
    const styleSheet = document.createElement('style');
    styleSheet.textContent = ICON_STYLES;
    document.head.appendChild(styleSheet);

    loadSettings();

    // Auto-save on checkbox changes in general settings
    document.querySelectorAll('#general-settings input[type="checkbox"]').forEach(input => {
        input.addEventListener('change', debouncedSave);
    });


});

document.getElementById('save-btn')?.addEventListener('click', async () => {
    await saveSettings();
});

document.getElementById('add-site-btn')?.addEventListener('click', addNewSite);

document.getElementById('new-site-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addNewSite();
    }
});
