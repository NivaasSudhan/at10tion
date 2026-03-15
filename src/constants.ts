/**
 * @10tion Shared Constants and Types
 * 
 * Single source of truth for blocking configuration and types.
 */

// =============================================================================
// Types
// =============================================================================

export type BlockingMode = 'short-form' | 'entire-site' | 'disabled';

/** What action to take when short-form content is detected */
export type ShortFormAction = 'block-page' | 'hide-items' | 'blur-items';

export interface BlockedSite {
    domain: string;
    mode: BlockingMode;
    /** Paths to block when mode is 'short-form'. Only applies to default platforms. */
    shortFormPaths?: string[];
    /** Whether this is a user-added custom site */
    isCustom?: boolean;
    /** What action to take when short-form content detected (default: 'block-page') */
    shortFormAction?: ShortFormAction;
}

export interface BreakLimits {
    dailyLimit: number;
    consecutiveLimit: number;
    cooldownMinutes: number;
}

export interface BreakState {
    breakActive: boolean;
    breakEndTime: number;
    breakDurationMinutes: number;
    /** Breaks taken today (resets at midnight) */
    breaksToday: number;
    /** Date string (YYYY-MM-DD) for tracking daily reset */
    breaksTodayDate: string;
    /** Consecutive breaks taken without cooldown */
    consecutiveBreaks: number;
    /** Timestamp of last break end */
    lastBreakEndTime: number;
}

/** Structured reason for why a break was denied (no HTML — rendering is the UI's job) */
export interface BreakDenialReason {
    type: 'daily_limit' | 'cooldown';
    /** Primary message shown to the user */
    headline: string;
    /** Explanatory subtext (plain text) */
    detail: string;
}

// =============================================================================
// Default Platforms (with short-form support)
// =============================================================================

export const DEFAULT_BLOCKED_SITES: BlockedSite[] = [
    {
        domain: 'youtube.com',
        mode: 'short-form',
        shortFormPaths: ['/shorts/']
    },
    {
        domain: 'instagram.com',
        mode: 'short-form',
        shortFormPaths: ['/reels/', '/reel/']
    },
    {
        domain: 'facebook.com',
        mode: 'short-form',
        shortFormPaths: ['/reel/', '/reels/']
    },
    {
        domain: 'tiktok.com',
        mode: 'entire-site'
    },
    {
        domain: 'x.com',
        mode: 'entire-site'
    },
    {
        domain: 'twitter.com',
        mode: 'entire-site'
    },
    {
        domain: 'snapchat.com',
        mode: 'entire-site'
    },
    {
        domain: 'twitch.tv',
        mode: 'entire-site'
    },
];

// List of domains that support short-form mode (have known short-form paths)
export const SHORT_FORM_CAPABLE_DOMAINS = [
    'youtube.com',
    'instagram.com',
    'facebook.com',
];

// =============================================================================
// Default Break Limits
// =============================================================================

export const DEFAULT_BREAK_LIMITS: BreakLimits = {
    dailyLimit: 10,
    consecutiveLimit: 2,
    cooldownMinutes: 15,
};

// =============================================================================
// Polling Intervals
// =============================================================================

export const POLLING_INTERVALS = {
    /** Content script fallback poll interval (ms) - catches SPA navigation edge cases */
    CONTENT_SCRIPT_FALLBACK_MS: 5000,
    /** Background alarm for break check (minutes) - fallback when content script isn't running */
    BREAK_CHECK_MINUTES: 0.5,
    /** Background alarm for daily reset check (minutes) */
    DAILY_RESET_CHECK_MINUTES: 1,
    /** Delay before registering content scripts on install (ms) - waits for storage defaults */
    STARTUP_REGISTRATION_DELAY_MS: 1000,
} as const;

// =============================================================================
// UI Timing Constants
// =============================================================================

export const UI_TIMING = {
    /** Standard 1-second tick for countdowns, timers, and breathing exercises (ms) */
    TICK_INTERVAL_MS: 1000,
    /** Duration of the shake animation on incorrect answers (ms) */
    SHAKE_ANIMATION_MS: 500,
    /** Delay before auto-focusing the answer input (ms) */
    INPUT_FOCUS_DELAY_MS: 100,
    /** Delay before auto-closing the settings tab after save (ms) */
    SETTINGS_AUTO_CLOSE_MS: 1000,
    /** Duration the "Saved" toast is visible (ms) */
    TOAST_DISPLAY_MS: 1500,
} as const;

// =============================================================================
// Storage Keys
// =============================================================================

export const STORAGE_KEYS = {
    IS_ENABLED: 'is_enabled',
    BLOCKED_SITES: 'blocked_sites',
    CONTENT_TYPES: 'content_types',
    BREAK_STATE: 'break_state',
    BREAK_LIMITS: 'break_limits',
    STATS: 'stats',
    ONBOARDING_COMPLETE: 'onboarding_complete',
} as const;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get today's date as YYYY-MM-DD string
 */
export function getTodayString(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * Check if user can take a break given current state and limits.
 * Returns plain-text structured data — rendering is handled by the UI layer.
 */
export function canTakeBreak(state: BreakState, limits: BreakLimits): { allowed: boolean; reason?: BreakDenialReason } {
    const today = getTodayString();

    // Reset daily count if it's a new day
    const breaksToday = state.breaksTodayDate === today ? state.breaksToday : 0;

    // Check daily limit
    if (breaksToday >= limits.dailyLimit) {
        return {
            allowed: false,
            reason: {
                type: 'daily_limit',
                headline: `You've used all ${limits.dailyLimit} breaks today — great job protecting your focus!`,
                detail: 'Fresh start at midnight.',
            }
        };
    }

    // Check consecutive limit and cooldown
    if (state.consecutiveBreaks >= limits.consecutiveLimit) {
        const cooldownEnd = state.lastBreakEndTime + (limits.cooldownMinutes * 60 * 1000);
        if (Date.now() < cooldownEnd) {
            const remainingMins = Math.ceil((cooldownEnd - Date.now()) / 60000);
            return {
                allowed: false,
                reason: {
                    type: 'cooldown',
                    headline: `Focus Pause: ${remainingMins} min remaining`,
                    detail: `After ${limits.consecutiveLimit} consecutive breaks, a ${limits.cooldownMinutes}-minute cooldown helps prevent mindless scrolling habits. Use this time to reset and refocus!`,
                }
            };
        }
    }

    return { allowed: true };
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validation patterns for user input sanitization
 */
export const VALIDATION_PATTERNS = {
    /**
     * Domain format: alphanumeric, hyphens, dots; must have at least one dot
     * Allows: example.com, sub.example.com, example.co.uk
     * Rejects: localhost, 192.168.1.1, example
     */
    DOMAIN: /^[a-z0-9]+([-.][a-z0-9]+)*\.[a-z]{2,}$/i,

    /**
     * URL-safe characters only
     * Prevents XSS and injection attacks
     */
    URL_SAFE: /^[a-zA-Z0-9-_.~!$&'()*+,;=:@/?#[\]]*$/,
} as const;

/**
 * Validates domain format to prevent malformed or malicious input
 *
 * @param domain - The domain string to validate
 * @returns true if the domain format is valid
 *
 * @example
 * isValidDomain('example.com') // true
 * isValidDomain('sub.example.com') // true
 * isValidDomain('localhost') // false
 * isValidDomain('192.168.1.1') // false
 */
export function isValidDomain(domain: string): boolean {
    return VALIDATION_PATTERNS.DOMAIN.test(domain);
}
