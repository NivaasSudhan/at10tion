/**
 * Short-Form Content Detector
 * 
 * Provides DOM-based detection of short-form content (Shorts, Reels, TikToks)
 * embedded within feeds and homepages—not just dedicated URL paths.
 * 
 * Platform DOM structures change frequently. Selectors may need updates.
 */

import { logger } from './logger';

// =============================================================================
// Types
// =============================================================================

export interface ShortFormDetector {
    domain: string;
    /** CSS selectors that indicate short-form content exists on the page */
    contentSelectors: string[];
    /** Selectors for individual short-form items (for hiding/blurring) */
    itemSelectors: string[];
    /** URL patterns still detected via path matching */
    urlPaths: string[];
}

// =============================================================================
// Platform-Specific Detectors
// =============================================================================

/**
 * Platform detection configurations.
 * 
 * These selectors are based on DOM inspection as of Feb 2026.
 * Platforms frequently change their HTML structure, so these may need updates.
 */
const DETECTORS: ShortFormDetector[] = [
    {
        domain: 'youtube.com',
        contentSelectors: [
            // Shorts shelf on homepage/subscriptions
            'ytd-reel-shelf-renderer',
            // Alternative shorts section renderer
            'ytd-rich-shelf-renderer[is-shorts]',
            // Individual short video thumbnails anywhere on page
            '[overlay-style="SHORTS"]',
            // Shorts player (when actually viewing a short in modal/inline)
            'ytd-shorts',
        ],
        itemSelectors: [
            // Entire shorts shelf
            'ytd-reel-shelf-renderer',
            // Individual video cards that are shorts
            'ytd-rich-item-renderer:has([overlay-style="SHORTS"])',
            'ytd-grid-video-renderer:has([overlay-style="SHORTS"])',
            'ytd-video-renderer:has([overlay-style="SHORTS"])',
        ],
        urlPaths: ['/shorts/'],
    },
    {
        domain: 'instagram.com',
        contentSelectors: [
            // Videos in feed posts (reels appear as videos)
            'article video',
            // Reels-specific aria labels
            '[aria-label*="Reel"]',
            '[aria-label*="reel"]',
            // Reels icon/badge
            'svg[aria-label="Reels"]',
        ],
        itemSelectors: [
            // Feed article containing a video (likely a reel)
            'article:has(video)',
        ],
        urlPaths: ['/reels/', '/reel/'],
    },
    {
        domain: 'facebook.com',
        contentSelectors: [
            // Reels aria labels
            '[aria-label*="Reel"]',
            '[aria-label*="reel"]',
            // Facebook Reels pagelets
            '[data-pagelet*="Reels"]',
            '[data-pagelet*="reels"]',
            // Watch tab with short videos
            '[data-pagelet="WatchPermalinkVideo"]',
        ],
        itemSelectors: [
            '[data-pagelet*="Reels"]',
            '[data-pagelet*="reels"]',
        ],
        urlPaths: ['/reel/', '/reels/', '/watch'],
    },
    {
        domain: 'tiktok.com',
        // TikTok is entirely short-form content. Any video element = short-form.
        contentSelectors: [
            'video',
            '[class*="DivVideoContainer"]',
            '[class*="VideoPlayer"]',
        ],
        itemSelectors: [
            '[class*="DivItemContainer"]',
            '[class*="DivVideoWrapper"]',
        ],
        // All of TikTok is short-form, no specific paths needed
        urlPaths: [],
    },
];

// =============================================================================
// Detection Functions
// =============================================================================

/**
 * Get the detector configuration for a given domain.
 */
export function getDetectorForDomain(hostname: string): ShortFormDetector | null {
    return DETECTORS.find(d =>
        hostname === d.domain ||
        hostname === `www.${d.domain}` ||
        hostname.endsWith(`.${d.domain}`)
    ) || null;
}

/**
 * Check if the DOM contains short-form content.
 * This is the new DOM-based detection for embedded content.
 */
export function domContainsShortForm(detector: ShortFormDetector): boolean {
    return detector.contentSelectors.some(selector => {
        try {
            return document.querySelector(selector) !== null;
        } catch {
            // Invalid selector, skip it
            return false;
        }
    });
}

/**
 * Get all short-form content items currently in the DOM.
 * Useful for hiding/blurring individual items instead of blocking the page.
 */
export function getShortFormItems(detector: ShortFormDetector): Element[] {
    const items: Element[] = [];
    for (const selector of detector.itemSelectors) {
        try {
            const elements = document.querySelectorAll(selector);
            items.push(...Array.from(elements));
        } catch {
            // Invalid selector, skip
        }
    }
    return items;
}

// Injected style element for hiding (more robust than inline styles)
let injectedStyleEl: HTMLStyleElement | null = null;

function ensureHidingStyles() {
    if (injectedStyleEl) return;

    injectedStyleEl = document.createElement('style');
    injectedStyleEl.id = 'at10tion-hiding-styles';
    injectedStyleEl.textContent = `
        [data-at10tion-hidden="true"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            height: 0 !important;
            overflow: hidden !important;
        }
        [data-at10tion-blurred="true"] {
            filter: blur(20px) !important;
            pointer-events: none !important;
        }
    `;
    document.head.appendChild(injectedStyleEl);
}

/**
 * Hide short-form items using a CSS class (more robust than inline styles).
 * Returns the number of items hidden.
 */
export function hideShortFormItems(detector: ShortFormDetector): number {
    ensureHidingStyles();
    const items = getShortFormItems(detector);
    let count = 0;
    for (const item of items) {
        const el = item as HTMLElement;
        if (!el.dataset.at10tionHidden) {
            el.dataset.at10tionHidden = 'true';
            // Also set inline style as backup
            el.style.setProperty('display', 'none', 'important');
            count++;
        }
    }
    logger.debug(`Hidden ${count} short-form items`);
    return count;
}

/**
 * Blur short-form items instead of hiding them completely.
 */
export function blurShortFormItems(detector: ShortFormDetector): number {
    ensureHidingStyles();
    const items = getShortFormItems(detector);
    let count = 0;
    for (const item of items) {
        const el = item as HTMLElement;
        if (!el.dataset.at10tionBlurred) {
            el.dataset.at10tionBlurred = 'true';
            // Also set inline style as backup
            el.style.setProperty('filter', 'blur(20px)', 'important');
            el.style.setProperty('pointer-events', 'none', 'important');
            count++;
        }
    }
    logger.debug(`Blurred ${count} short-form items`);
    return count;
}

// =============================================================================
// MutationObserver for Dynamic Content
// =============================================================================

/**
 * Create a MutationObserver that watches for newly loaded short-form content.
 * Call disconnect() on the returned observer when done.
 */
export function observeShortFormContent(
    detector: ShortFormDetector,
    onDetected: (items: Element[]) => void
): MutationObserver {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const observer = new MutationObserver((mutations) => {
        // Batch check: only run detection if there are added nodes
        const hasAddedNodes = mutations.some(m => m.addedNodes.length > 0);
        if (!hasAddedNodes) return;

        if (timeoutId === null) {
            timeoutId = setTimeout(() => {
                timeoutId = null;
                // Check if any new short-form content appeared
                if (domContainsShortForm(detector)) {
                    const items = getShortFormItems(detector);
                    // Filter to only newly added items (not already processed)
                    const newItems = items.filter(item => {
                        const el = item as HTMLElement;
                        return !el.dataset.at10tionHidden && !el.dataset.at10tionBlurred;
                    });
                    if (newItems.length > 0) {
                        onDetected(newItems);
                    }
                }
            }, 250);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    return observer;
}


