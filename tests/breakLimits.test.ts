import { describe, expect, test } from "bun:test";
import { canTakeBreak, getTodayString, DEFAULT_BREAK_LIMITS } from "../src/constants";

describe("canTakeBreak messaging", () => {
    test("daily limit message is supportive", () => {
        const state = {
            breakActive: false,
            breakEndTime: 0,
            breakDurationMinutes: 0,
            breaksToday: 10,
            breaksTodayDate: getTodayString(),
            consecutiveBreaks: 0,
            lastBreakEndTime: 0
        };
        const result = canTakeBreak(state, DEFAULT_BREAK_LIMITS);
        expect(result.allowed).toBe(false);
        expect(result.reason?.headline).toContain("great job");
        expect(result.reason?.detail).toContain("midnight");
    });

    test("cooldown message is educational", () => {
        const state = {
            breakActive: false,
            breakEndTime: 0,
            breakDurationMinutes: 0,
            breaksToday: 2,
            breaksTodayDate: getTodayString(),
            consecutiveBreaks: 2,
            lastBreakEndTime: Date.now() // just ended
        };
        const result = canTakeBreak(state, DEFAULT_BREAK_LIMITS);
        expect(result.allowed).toBe(false);
        expect(result.reason?.headline).toContain("Focus Pause");
        expect(result.reason?.detail).toContain("cooldown");
        expect(result.reason?.detail).toContain("15-minute");
    });

    test("allows break when under limits", () => {
        const state = {
            breakActive: false,
            breakEndTime: 0,
            breakDurationMinutes: 0,
            breaksToday: 1,
            breaksTodayDate: getTodayString(),
            consecutiveBreaks: 0,
            lastBreakEndTime: 0
        };
        const result = canTakeBreak(state, DEFAULT_BREAK_LIMITS);
        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
    });
});
