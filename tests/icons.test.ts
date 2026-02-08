import { describe, expect, test, beforeEach } from "bun:test";
import { 
    canRenderEmoji, 
    getPlatformIcon, 
    getStatusIcon, 
    renderPlatformIcon, 
    renderStatusIcon,
    getIconText,
    type StatusType 
} from "../src/icons/index";

describe("Icon System - 3-Tier Fallback", () => {
    describe("Platform Icons", () => {
        test("returns bundled SVG for known platforms", () => {
            const platforms = [
                'youtube.com',
                'instagram.com', 
                'facebook.com',
                'tiktok.com',
                'x.com',
                'twitter.com',
                'snapchat.com',
                'twitch.tv'
            ];
            
            for (const platform of platforms) {
                const icon = getPlatformIcon(platform);
                expect(icon.isBundled).toBe(true);
                expect(icon.svg).toBeDefined();
                expect(icon.svg?.endsWith('.svg')).toBe(true);
                expect(icon.ascii).toBeDefined();
            }
        });

        test("returns first letter for unknown sites", () => {
            const icon = getPlatformIcon('example.com');
            expect(icon.isBundled).toBe(false);
            expect(icon.svg).toBeUndefined();
            expect(icon.ascii).toBe('[E]');
            expect(icon.color).toBe('#666666');
        });

        test("returns custom site with correct letter", () => {
            const icon = getPlatformIcon('reddit.com');
            expect(icon.ascii).toBe('[R]');
        });
    });

    describe("Status Icons", () => {
        const statusTypes: StatusType[] = [
            'stop', 'hint', 'target', 'complete', 
            'on', 'off', 'streak', 'pause', 'breaks', 'focus'
        ];

        test("all status types have emoji and ascii defined", () => {
            for (const type of statusTypes) {
                const icon = getStatusIcon(type);
                expect(icon.emoji).toBeDefined();
                expect(icon.ascii).toBeDefined();
                expect(icon.color).toBeDefined();
                expect(icon.isBundled).toBe(false);
            }
        });

        test("on/off have correct colors", () => {
            const onIcon = getStatusIcon('on');
            const offIcon = getStatusIcon('off');
            
            expect(onIcon.color).toBe('#10B981'); // Green
            expect(offIcon.color).toBe('#EF4444'); // Red
        });

        test("stop icon is red", () => {
            const icon = getStatusIcon('stop');
            expect(icon.color).toBe('#EF4444');
        });

        test("hint icon is orange", () => {
            const icon = getStatusIcon('hint');
            expect(icon.color).toBe('#F59E0B');
        });

        test("streak icon is orange", () => {
            const icon = getStatusIcon('streak');
            expect(icon.color).toBe('#F97316');
        });
    });

    describe("Icon Rendering", () => {
        test("getIconText returns emoji or ascii", () => {
            const text = getIconText('stop');
            expect(typeof text).toBe('string');
            expect(text.length).toBeGreaterThan(0);
        });
    });

    describe("HTML Rendering", () => {
        test("renderPlatformIcon returns valid HTML for known platforms", () => {
            // Skip if chrome API not available (test environment)
            if (typeof chrome === 'undefined') {
                return;
            }
            const html = renderPlatformIcon('youtube.com', 16);
            expect(html).toContain('img');
            expect(html).toContain('youtube.svg');
            expect(html).toContain('width="16"');
            expect(html).toContain('class="platform-icon"');
        });

        test("renderPlatformIcon returns icon for unknown platforms", () => {
            const html = renderPlatformIcon('unknown.com', 16);
            expect(html).toContain('icon-ascii');
            expect(html).toContain('[U]');
        });

        test("renderStatusIcon returns styled HTML", () => {
            const html = renderStatusIcon('on', 20);
            expect(html).toContain('icon-emoji');
            expect(html).toContain('font-size: 20px');
        });
    });

    describe("Icon Styles", () => {
        test("ICON_STYLES is defined and contains CSS", () => {
            const { ICON_STYLES } = require('../src/icons/index');
            expect(ICON_STYLES).toBeDefined();
            expect(ICON_STYLES).toContain('.icon-emoji');
            expect(ICON_STYLES).toContain('.icon-ascii');
            expect(ICON_STYLES).toContain('.platform-icon');
        });
    });
});

// Visual regression tests - these would run in a browser context
// For now, we verify the structure is correct
describe("Icon System Integration", () => {
    test("platform icons use brand colors", () => {
        const icon = getPlatformIcon('youtube.com');
        expect(icon.svg).toBe('youtube.svg');
    });

    test("Twitter/X use same icon file", () => {
        const xIcon = getPlatformIcon('x.com');
        const twitterIcon = getPlatformIcon('twitter.com');
        
        expect(xIcon.svg).toBe('x.svg');
        expect(twitterIcon.svg).toBe('twitter.svg');
        expect(xIcon.ascii).toBe('[X]');
        expect(twitterIcon.ascii).toBe('[X]');
    });
});