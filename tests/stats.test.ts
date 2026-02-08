import { describe, expect, test, beforeEach } from "bun:test";
import { recordBlock, recordBreak, recordTimeOnSite, getStats, getWeeklyStats, getWeeklyTrend, formatPeakHours, type Stats } from "../src/stats";
import { storageMock } from "./setup";

describe("Stats Module", () => {
    beforeEach(() => {
        storageMock.clear();
    });

    test("recordBlock should increment blocks and track hour", async () => {
        await recordBlock();
        const stats = await getStats();
        expect(stats.totalBlocks).toBe(1);

        // Should have hourly tracking
        const today = new Date().toISOString().split('T')[0];
        expect(stats.dailyStats[today].hourlyBlocks).toBeDefined();
        expect(stats.dailyStats[today].hourlyBlocks.length).toBe(24);
    });

    test("recordBreak should increment breaks and duration", async () => {
        await recordBreak(5);
        const stats = await getStats();
        expect(stats.totalBreaks).toBe(1);
        expect(stats.totalBreakMinutes).toBe(5);
    });

    test("recordTimeOnSite should track actual time spent", async () => {
        await recordTimeOnSite(10);
        await recordTimeOnSite(5);
        const stats = await getStats();
        const today = new Date().toISOString().split('T')[0];
        expect(stats.dailyStats[today].timeOnSite).toBe(15);
    });

    test("getStats should return default values if empty", async () => {
        const stats = await getStats();
        expect(stats.totalBlocks).toBe(0);
        expect(stats.totalBreakMinutes).toBe(0);
        expect(stats.currentStreak).toBe(0);
    });

    test("Weekly stats should calculate correctly", async () => {
        const today = new Date().toISOString().split('T')[0];

        // Mock data matching Stats interface with new fields
        const mockStats: Stats = {
            totalBlocks: 5,
            totalBreaks: 0,
            totalBreakMinutes: 10,
            currentStreak: 1,
            longestStreak: 1,
            lastBlockDate: today,
            dailyStats: {
                [today]: {
                    date: today,
                    blocksCount: 5,
                    breaksCount: 0,
                    totalBreakMinutes: 10,
                    timeOnSite: 25,
                    hourlyBlocks: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 2, 0, 0]
                }
            }
        };
        await chrome.storage.local.set({ stats: mockStats });

        const stats = await getStats();
        const weekly = getWeeklyStats(stats);

        expect(weekly.blocksThisWeek).toBe(5);
        expect(weekly.timeOnSiteThisWeek).toBe(25);
        expect(weekly.peakHours).toContain(20); // Hour with most blocks
    });

    test("getWeeklyTrend should return first week message when no history", async () => {
        const stats = await getStats();
        const trend = getWeeklyTrend(stats);

        expect(trend.description).toBe('First week of tracking');
        expect(trend.percentChange).toBe(0);
    });

    test("formatPeakHours should format hours correctly", () => {
        expect(formatPeakHours([])).toBe('No data yet');
        expect(formatPeakHours([14])).toBe('2pm');
        expect(formatPeakHours([9, 21])).toBe('9am, 9pm');
        expect(formatPeakHours([0])).toBe('12am');
        expect(formatPeakHours([12])).toBe('12pm');
    });
});

