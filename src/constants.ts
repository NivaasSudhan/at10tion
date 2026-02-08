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
 * Safely parse a URL, returning null if invalid
 */
function parseUrl(url: string): URL | null {
    try {
        return new URL(url);
    } catch {
        return null;
    }
}

/**
 * Check if a hostname matches a site's domain (including subdomains)
 */
function matchesDomain(hostname: string, domain: string): boolean {
    return hostname === domain ||
        hostname === `www.${domain}` ||
        hostname.endsWith(`.${domain}`);
}

/**
 * Check if a path matches any of the short-form paths
 */
function matchesShortFormPath(pathname: string, shortFormPaths: string[]): boolean {
    return shortFormPaths.some(blockedPath => pathname.includes(blockedPath));
}

/**
 * Check if a site configuration should block the given URL parts
 */
function siteBlocksUrl(site: BlockedSite, hostname: string, pathname: string): boolean {
    if (site.mode === 'disabled') {
        return false;
    }

    if (!matchesDomain(hostname, site.domain)) {
        return false;
    }

    if (site.mode === 'entire-site') {
        return true;
    }

    return site.mode === 'short-form' &&
        site.shortFormPaths !== undefined &&
        matchesShortFormPath(pathname, site.shortFormPaths);
}

/**
 * Check if a site should be blocked based on its configuration
 */
export function shouldBlockUrl(url: string, sites: BlockedSite[]): boolean {
    const parsedUrl = parseUrl(url);
    if (!parsedUrl) {
        return false;
    }

    const { hostname, pathname } = parsedUrl;
    return sites.some(site => siteBlocksUrl(site, hostname, pathname));
}

/**
 * Get today's date as YYYY-MM-DD string
 */
export function getTodayString(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * Check if user can take a break given current state and limits
 */
export function canTakeBreak(state: BreakState, limits: BreakLimits): { allowed: boolean; reason?: string } {
    const today = getTodayString();

    // Reset daily count if it's a new day
    const breaksToday = state.breaksTodayDate === today ? state.breaksToday : 0;

    // Check daily limit
    if (breaksToday >= limits.dailyLimit) {
        return {
            allowed: false,
            reason: `You've used all ${limits.dailyLimit} breaks today—great job protecting your focus! (*) Fresh start at midnight.`
        };
    }

    // Check consecutive limit and cooldown
    if (state.consecutiveBreaks >= limits.consecutiveLimit) {
        const cooldownEnd = state.lastBreakEndTime + (limits.cooldownMinutes * 60 * 1000);
        if (Date.now() < cooldownEnd) {
            const remainingMins = Math.ceil((cooldownEnd - Date.now()) / 60000);
            return {
                allowed: false,
                reason: `|| Focus Pause: ${remainingMins} min remaining<br/><small style="opacity: 0.8; display: block; margin-top: 5px;">After 2 consecutive breaks, a 15-minute cooldown helps prevent mindless scrolling habits. Use this time to reset and refocus!</small>`
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
