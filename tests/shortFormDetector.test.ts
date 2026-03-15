import { describe, expect, test, beforeEach, mock } from "bun:test";
import {
    getDetectorForDomain,
    type ShortFormDetector
} from "../src/shortFormDetector";

describe("ShortFormDetector", () => {
    describe("getDetectorForDomain", () => {
        test("should return YouTube detector for youtube.com", () => {
            const detector = getDetectorForDomain("youtube.com");
            expect(detector).not.toBeNull();
            expect(detector?.domain).toBe("youtube.com");
        });

        test("should return YouTube detector for www.youtube.com", () => {
            const detector = getDetectorForDomain("www.youtube.com");
            expect(detector).not.toBeNull();
            expect(detector?.domain).toBe("youtube.com");
        });

        test("should return YouTube detector for m.youtube.com (subdomain)", () => {
            const detector = getDetectorForDomain("m.youtube.com");
            expect(detector).not.toBeNull();
            expect(detector?.domain).toBe("youtube.com");
        });

        test("should return Instagram detector", () => {
            const detector = getDetectorForDomain("instagram.com");
            expect(detector).not.toBeNull();
            expect(detector?.domain).toBe("instagram.com");
        });

        test("should return Facebook detector", () => {
            const detector = getDetectorForDomain("www.facebook.com");
            expect(detector).not.toBeNull();
            expect(detector?.domain).toBe("facebook.com");
        });

        test("should return TikTok detector", () => {
            const detector = getDetectorForDomain("tiktok.com");
            expect(detector).not.toBeNull();
            expect(detector?.domain).toBe("tiktok.com");
        });

        test("should return null for unknown domain", () => {
            const detector = getDetectorForDomain("example.com");
            expect(detector).toBeNull();
        });
    });

    describe("Detector content selectors", () => {
        test("YouTube detector should have shorts-specific selectors", () => {
            const detector = getDetectorForDomain("youtube.com")!;
            expect(detector.contentSelectors).toContain("ytd-reel-shelf-renderer");
            expect(detector.contentSelectors.some(s => s.includes("SHORTS"))).toBe(true);
        });

        test("Instagram detector should look for video elements", () => {
            const detector = getDetectorForDomain("instagram.com")!;
            expect(detector.contentSelectors).toContain("article video");
        });

        test("TikTok detector should detect any video (entire site is short-form)", () => {
            const detector = getDetectorForDomain("tiktok.com")!;
            expect(detector.contentSelectors).toContain("video");
        });
    });
});
