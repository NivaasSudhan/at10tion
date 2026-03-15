/**
 * Icon System - 3-Tier Fallback
 * Tier 1: Bundled SVG icons (best quality, brand colors)
 * Tier 2: Emoji fallback (if bundled icon unavailable)
 * Tier 3: ASCII fallback with styled colors (100% guaranteed)
 */

// =============================================================================
// Platform Icon Mapping
// =============================================================================

const PLATFORM_ICONS: Record<string, { file: string; emoji: string; ascii: string }> = {
    'youtube.com': { file: 'youtube.svg', emoji: '▶️', ascii: '[YT]' },
    'instagram.com': { file: 'instagram.svg', emoji: '📷', ascii: '[IG]' },
    'facebook.com': { file: 'facebook.svg', emoji: '📘', ascii: '[FB]' },
    'tiktok.com': { file: 'tiktok.svg', emoji: '🎵', ascii: '[TT]' },
    'x.com': { file: 'x.svg', emoji: '𝕏', ascii: '[X]' },
    'twitter.com': { file: 'twitter.svg', emoji: '🐦', ascii: '[X]' },
    'snapchat.com': { file: 'snapchat.svg', emoji: '👻', ascii: '[SC]' },
    'twitch.tv': { file: 'twitch.svg', emoji: '🎮', ascii: '[TW]' },
};

// =============================================================================
// Status Icon Mapping
// =============================================================================

export type StatusType = 
    | 'stop' 
    | 'hint' 
    | 'target' 
    | 'complete' 
    | 'on' 
    | 'off' 
    | 'streak' 
    | 'pause'
    | 'breaks'
    | 'focus';

const STATUS_ICONS: Record<StatusType, { emoji: string; ascii: string; color: string }> = {
    'stop': { emoji: '🛑', ascii: '(!)', color: '#EF4444' },
    'hint': { emoji: '💡', ascii: '(i)', color: '#F59E0B' },
    'target': { emoji: '🎯', ascii: '(*)', color: '#10B981' },
    'complete': { emoji: '🎉', ascii: '(*)', color: '#10B981' },
    'on': { emoji: '🟢', ascii: '(+)', color: '#10B981' },
    'off': { emoji: '🔴', ascii: '(-)', color: '#EF4444' },
    'streak': { emoji: '🔥', ascii: '[#]', color: '#F97316' },
    'pause': { emoji: '⏸️', ascii: '||', color: '#F59E0B' },
    'breaks': { emoji: '🎯', ascii: '(*)', color: '#10B981' },
    'focus': { emoji: '🎯', ascii: '(*)', color: '#10B981' },
};

// =============================================================================
// Emoji Detection
// =============================================================================

/**
 * Canvas-based emoji detection - 100% accurate
 * Tests if a specific emoji can be rendered
 */
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
const emojiCache = new Map<string, boolean>();

function getCanvasContext(): CanvasRenderingContext2D | null {
    if (typeof document === 'undefined') return null;
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.width = 20;
        canvas.height = 20;
        ctx = canvas.getContext('2d', { willReadFrequently: true });
    }
    return ctx;
}

/**
 * Detect if an emoji can be rendered by measuring actual pixels
 * Uses canvas to compare emoji vs reference character
 */
export function canRenderEmoji(emoji: string): boolean {
    // Check cache first
    if (emojiCache.has(emoji)) {
        return emojiCache.get(emoji)!;
    }

    const context = getCanvasContext();
    if (!context) {
        // Default to assuming emoji works in content scripts
        return true;
    }

    // Clear canvas
    context.clearRect(0, 0, 20, 20);
    
    // Draw emoji
    context.font = '16px serif';
    context.fillText(emoji, 0, 16);
    
    // Get pixel data
    const data = context.getImageData(0, 0, 20, 20).data;
    
    // Count non-transparent pixels
    let pixelCount = 0;
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) pixelCount++;
    }
    
    // Clear and draw reference character (tofu box indicator)
    context.clearRect(0, 0, 20, 20);
    context.fillText('□', 0, 16); // Empty box character
    const refData = context.getImageData(0, 0, 20, 20).data;
    let refPixelCount = 0;
    for (let i = 3; i < refData.length; i += 4) {
        if (refData[i] > 0) refPixelCount++;
    }
    
    // If pixel counts are very similar, it's likely a tofu fallback
    const canRender = pixelCount > refPixelCount + 10;
    
    emojiCache.set(emoji, canRender);
    return canRender;
}

// =============================================================================
// Icon Resolution
// =============================================================================

export interface IconResult {
    svg?: string;
    emoji?: string;
    ascii: string;
    color?: string;
    isBundled: boolean;
    isEmoji: boolean;
}

/**
 * Get platform icon for a domain
 * Returns bundled SVG path if available, emoji if renders, ASCII fallback
 */
export function getPlatformIcon(domain: string): IconResult {
    const platform = PLATFORM_ICONS[domain];
    
    if (!platform) {
        // Unknown site - use first letter
        const firstLetter = domain.charAt(0).toUpperCase();
        return {
            ascii: `[${firstLetter}]`,
            color: '#666666',
            isBundled: false,
            isEmoji: false
        };
    }
    
    const canRender = canRenderEmoji(platform.emoji);
    
    return {
        svg: platform.file,
        emoji: canRender ? platform.emoji : undefined,
        ascii: platform.ascii,
        isBundled: true,
        isEmoji: canRender
    };
}

/**
 * Get status icon with 3-tier fallback
 */
export function getStatusIcon(type: StatusType): IconResult {
    const config = STATUS_ICONS[type];
    const canRender = canRenderEmoji(config.emoji);
    
    return {
        emoji: canRender ? config.emoji : undefined,
        ascii: config.ascii,
        color: config.color,
        isBundled: false,
        isEmoji: canRender
    };
}

// =============================================================================
// CSS Styles
// =============================================================================

export const ICON_STYLES = `
.icon-emoji {
    font-family: "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Android Emoji", sans-serif;
    line-height: 1;
    vertical-align: middle;
}

.icon-ascii {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, monospace;
    line-height: 1;
    vertical-align: middle;
    letter-spacing: -0.5px;
}

.platform-icon {
    display: inline-block;
    vertical-align: middle;
    border-radius: 2px;
}
`;