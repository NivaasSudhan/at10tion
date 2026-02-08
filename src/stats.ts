/**
 * @10tion Statistics Module
 * 
 * Tracks and retrieves usage statistics for the extension.
 */

export interface DailyStats {
    date: string; // YYYY-MM-DD
    blocksCount: number;
    breaksCount: number;
    totalBreakMinutes: number;
    /** Actual minutes spent on blocked sites (during breaks) */
    timeOnSite: number;
    /** Block counts per hour (24-element array, index = hour 0-23) */
    hourlyBlocks: number[];
}

/**
 * Create a default hourly blocks array (24 zeros)
 */
function createDefaultHourlyBlocks(): number[] {
    return new Array(24).fill(0);
}

export interface Stats {
    totalBlocks: number;
    totalBreaks: number;
    totalBreakMinutes: number;
    currentStreak: number;
    longestStreak: number;
    lastBlockDate: string;
    dailyStats: Record<string, DailyStats>;
}

const DEFAULT_STATS: Stats = {
    totalBlocks: 0,
    totalBreaks: 0,
    totalBreakMinutes: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastBlockDate: '',
    dailyStats: {},
};

/**
 * Number of days to retain daily statistics before pruning.
 *
 * This value is intentionally not user-configurable to prevent unbounded
 * storage growth in Chrome's local storage (which has a ~5MB limit).
 * 90 days provides sufficient historical data while keeping storage usage
 * under ~100KB for typical usage patterns.
 *
 * @constant
 * @default 90
 */
export const RETENTION_DAYS = 90;

/**
 * Prune daily stats older than retention period to prevent unbounded growth
 */
function pruneOldStats(stats: Stats): Stats {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const prunedDaily: Record<string, DailyStats> = {};
    for (const [date, data] of Object.entries(stats.dailyStats)) {
        if (date >= cutoffStr) {
            prunedDaily[date] = data;
        }
    }
    return { ...stats, dailyStats: prunedDaily };
}

function getToday(): string {
    return new Date().toISOString().split('T')[0];
}

function getYesterday(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
}

export async function getStats(): Promise<Stats> {
    const data = await chrome.storage.local.get(['stats']);
    return (data.stats as Stats) || { ...DEFAULT_STATS };
}

export async function recordBlock(): Promise<void> {
    const stats = await getStats();
    const today = getToday();

    // Update totals
    stats.totalBlocks++;

    // Update daily stats
    if (!stats.dailyStats[today]) {
        stats.dailyStats[today] = {
            date: today,
            blocksCount: 0,
            breaksCount: 0,
            totalBreakMinutes: 0,
            timeOnSite: 0,
            hourlyBlocks: createDefaultHourlyBlocks(),
        };
    }

    // Ensure hourlyBlocks exists (backward compatibility)
    if (!stats.dailyStats[today].hourlyBlocks) {
        stats.dailyStats[today].hourlyBlocks = createDefaultHourlyBlocks();
    }

    stats.dailyStats[today].blocksCount++;

    // Track hour of block for vulnerability analysis
    const currentHour = new Date().getHours();
    stats.dailyStats[today].hourlyBlocks[currentHour]++;

    // Update streak
    if (stats.lastBlockDate === getYesterday() || stats.lastBlockDate === today) {
        // Continue streak
        if (stats.lastBlockDate !== today) {
            stats.currentStreak++;
            if (stats.currentStreak > stats.longestStreak) {
                stats.longestStreak = stats.currentStreak;
            }
        }
    } else if (stats.lastBlockDate !== today) {
        // Streak broken, start new one
        stats.currentStreak = 1;
    }
    stats.lastBlockDate = today;

    // Prune old daily stats to prevent unbounded growth
    const prunedStats = pruneOldStats(stats);
    await chrome.storage.local.set({ stats: prunedStats });
}

export async function recordBreak(durationMinutes: number): Promise<void> {
    const stats = await getStats();
    const today = getToday();

    // Update totals
    stats.totalBreaks++;
    stats.totalBreakMinutes += durationMinutes;

    // Update daily stats
    if (!stats.dailyStats[today]) {
        stats.dailyStats[today] = {
            date: today,
            blocksCount: 0,
            breaksCount: 0,
            totalBreakMinutes: 0,
            timeOnSite: 0,
            hourlyBlocks: createDefaultHourlyBlocks(),
        };
    }
    stats.dailyStats[today].breaksCount++;
    stats.dailyStats[today].totalBreakMinutes += durationMinutes;

    // Prune old daily stats to prevent unbounded growth
    const prunedStats = pruneOldStats(stats);
    await chrome.storage.local.set({ stats: prunedStats });
}

export interface WeeklyStats {
    blocksThisWeek: number;
    breaksThisWeek: number;
    /** Actual minutes spent on blocked sites during breaks */
    timeOnSiteThisWeek: number;
    /** Peak hours of vulnerability (hours with most blocks) */
    peakHours: number[];
    /** Estimated minutes saved (15 minutes per block) */
    minutesSaved: number;
}

export interface WeeklyTrend {
    /** Percentage change in timeOnSite vs last week (-100 to +∞, negative = improvement) */
    percentChange: number;
    /** Whether user improved (less time on blocked sites) */
    improved: boolean;
    /** Human-readable trend description */
    description: string;
}

/**
 * Record actual time spent on a blocked site during a break.
 * Called when break ends to log usage.
 */
export async function recordTimeOnSite(minutes: number): Promise<void> {
    const stats = await getStats();
    const today = getToday();

    // Ensure daily stats exist
    if (!stats.dailyStats[today]) {
        stats.dailyStats[today] = {
            date: today,
            blocksCount: 0,
            breaksCount: 0,
            totalBreakMinutes: 0,
            timeOnSite: 0,
            hourlyBlocks: createDefaultHourlyBlocks(),
        };
    }

    // Ensure timeOnSite exists (backward compatibility)
    if (typeof stats.dailyStats[today].timeOnSite !== 'number') {
        stats.dailyStats[today].timeOnSite = 0;
    }

    stats.dailyStats[today].timeOnSite += minutes;

    const prunedStats = pruneOldStats(stats);
    await chrome.storage.local.set({ stats: prunedStats });
}

/**
 * Get weekly statistics with meaningful metrics.
 */
export function getWeeklyStats(stats: Stats): WeeklyStats {
    const now = new Date();
    let blocksThisWeek = 0;
    let breaksThisWeek = 0;
    let timeOnSiteThisWeek = 0;
    const hourlyTotals = createDefaultHourlyBlocks();

    for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const daily = stats.dailyStats[dateStr];
        if (daily) {
            blocksThisWeek += daily.blocksCount;
            breaksThisWeek += daily.breaksCount;
            timeOnSiteThisWeek += daily.timeOnSite || 0;

            // Aggregate hourly blocks
            if (daily.hourlyBlocks) {
                for (let h = 0; h < 24; h++) {
                    hourlyTotals[h] += daily.hourlyBlocks[h] || 0;
                }
            }
        }
    }

    // Find peak hours (top 2 hours with most blocks)
    const peakHours = findPeakHours(hourlyTotals, 2);

    return { blocksThisWeek, breaksThisWeek, timeOnSiteThisWeek, peakHours, minutesSaved: blocksThisWeek * 15 };
}

/**
 * Find the hours with the most blocks.
 */
function findPeakHours(hourlyTotals: number[], count: number): number[] {
    const indexed = hourlyTotals.map((blocks, hour) => ({ hour, blocks }));
    indexed.sort((a, b) => b.blocks - a.blocks);

    // Only return hours that have at least 1 block
    return indexed
        .filter(h => h.blocks > 0)
        .slice(0, count)
        .map(h => h.hour);
}

/**
 * Calculate weekly trend (comparison with previous week).
 */
export function getWeeklyTrend(stats: Stats): WeeklyTrend {
    const now = new Date();
    let thisWeekTime = 0;
    let lastWeekTime = 0;

    // This week: days 0-6
    for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const daily = stats.dailyStats[dateStr];
        if (daily) {
            thisWeekTime += daily.timeOnSite || 0;
        }
    }

    // Last week: days 7-13
    for (let i = 7; i < 14; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const daily = stats.dailyStats[dateStr];
        if (daily) {
            lastWeekTime += daily.timeOnSite || 0;
        }
    }

    // Calculate percentage change
    if (lastWeekTime === 0) {
        // No data from last week
        return {
            percentChange: 0,
            improved: false,
            description: 'First week of tracking'
        };
    }

    const percentChange = Math.round(((thisWeekTime - lastWeekTime) / lastWeekTime) * 100);
    const improved = percentChange < 0;

    let description: string;
    if (percentChange === 0) {
        description = 'Same as last week';
    } else if (improved) {
        description = `↓ ${Math.abs(percentChange)}% less than last week`;
    } else {
        description = `↑ ${percentChange}% more than last week`;
    }

    return { percentChange, improved, description };
}

/**
 * Format peak hours as human-readable time range.
 */
export function formatPeakHours(peakHours: number[]): string {
    if (peakHours.length === 0) {
        return 'No data yet';
    }

    const formatHour = (h: number): string => {
        const period = h >= 12 ? 'pm' : 'am';
        let hour12: number;
        if (h === 0) {
            hour12 = 12; // Midnight
        } else if (h > 12) {
            hour12 = h - 12; // Convert 13-23 to 1-11
        } else {
            hour12 = h; // 1-12 stays as-is
        }
        return `${hour12}${period}`;
    };

    if (peakHours.length === 1) {
        return formatHour(peakHours[0]);
    }

    // Sort hours and format
    const sorted = [...peakHours].sort((a, b) => a - b);
    return sorted.map(formatHour).join(', ');
}

