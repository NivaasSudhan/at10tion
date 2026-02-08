export interface Quote {
    text: string;
    author?: string;
}

export interface MathProblem {
    problem: string;
    answer: number;
}

export interface Teaser {
    question: string;
    answer: string;
}

export const quotes: Quote[] = [
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Focus is a matter of deciding what things you're not going to do.", author: "John Carmack" },
    { text: "It is not enough to be busy. So are the ants. The question is: What are we busy about?", author: "Henry David Thoreau" },
    { text: "Amateurs sit and wait for inspiration, the rest of us just get up and go to work.", author: "Stephen King" },
    { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
    { text: "Concentrate all your thoughts upon the work at hand. The sun's rays do not burn until brought to a focus.", author: "Alexander Graham Bell" },
    { text: "Productivity is being able to do things that you were never able to do before.", author: "Franz Kafka" },
    { text: "Starve your distractions, feed your focus.", author: "Unknown" },
    { text: "You can do anything, but not everything.", author: "David Allen" },
    { text: "The successful warrior is the average man, with laser-like focus.", author: "Bruce Lee" },
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "Do not wait to strike till the iron is hot, but make it hot by striking.", author: "William Butler Yeats" },
    { text: "Time you enjoy wasting is not wasted time.", author: "Marthe Troly-Curtin" },
    { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
    { text: "Either you run the day or the day runs you.", author: "Jim Rohn" },
    { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
    { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { text: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
    { text: "The least productive people are usually the ones who are most in favor of meetings.", author: "Thomas Sowell" },
    { text: "If you spend too much time thinking about a thing, you'll never get it done.", author: "Bruce Lee" }
];

export const math: MathProblem[] = [
    { problem: "12 + 15", answer: 27 },
    { problem: "8 × 7", answer: 56 },
    { problem: "100 - 43", answer: 57 },
    { problem: "15 × 3", answer: 45 },
    { problem: "72 ÷ 8", answer: 9 },
    { problem: "25 + 36", answer: 61 },
    { problem: "9 × 9", answer: 81 },
    { problem: "50 - 18", answer: 32 },
    { problem: "14 × 2", answer: 28 },
    { problem: "60 ÷ 5", answer: 12 },
    { problem: "13 + 28", answer: 41 },
    { problem: "6 × 12", answer: 72 },
    { problem: "144 ÷ 12", answer: 12 },
    { problem: "17 + 24", answer: 41 },
    { problem: "11 × 11", answer: 121 },
    { problem: "200 - 87", answer: 113 },
    { problem: "45 + 55", answer: 100 },
    { problem: "7 × 8", answer: 56 },
    { problem: "96 ÷ 8", answer: 12 },
    { problem: "33 + 67", answer: 100 }
];

export const teasers: Teaser[] = [
    { question: "What has keys, but no locks; space, but no room; you can enter, but never go outside?", answer: "Keyboard" },
    { question: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", answer: "Echo" },
    { question: "The more of this there is, the less you see. What is it?", answer: "Darkness" },
    { question: "What has many keys but can't open a single lock?", answer: "Piano" },
    { question: "What comes once in a minute, twice in a moment, but never in a thousand years?", answer: "The letter M" },
    { question: "I am not alive, but I grow; I don't have lungs, but I need air; I don't have a mouth, but water kills me. What am I?", answer: "Fire" },
    { question: "What has to be broken before you can use it?", answer: "Egg" },
    { question: "I’m tall when I’m young, and I’m short when I’m old. What am I?", answer: "Candle" },
    { question: "What is full of holes but still holds water?", answer: "Sponge" },
    { question: "What goes up but never comes down?", answer: "Age" },
    { question: "What can you catch but not throw?", answer: "Cold" },
    { question: "What gets wetter the more it dries?", answer: "Towel" },
    { question: "What can travel around the world while staying in a corner?", answer: "Stamp" },
    { question: "What has a head and a tail but no body?", answer: "Coin" },
    { question: "What building has the most stories?", answer: "Library" }
];

/**
 * Generate a random integer between min and max (inclusive)
 * Uses crypto for security compliance
 */
function getSecureRandomInt(min: number, max: number): number {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return min + (array[0] % (max - min + 1));
}

/**
 * Dynamic math problem generator
 * Creates varied, engaging problems that require actual thinking
 */
export function generateMathProblem(): MathProblem {
    const problemTypes = ['arithmetic', 'sequence', 'percentage', 'multistep'] as const;
    const type = problemTypes[getSecureRandomInt(0, problemTypes.length - 1)];

    switch (type) {
        case 'arithmetic': {
            // More interesting arithmetic: larger numbers, varied operations
            const ops = ['+', '-', '×'] as const;
            const op = ops[getSecureRandomInt(0, ops.length - 1)];
            let a: number, b: number, answer: number;

            if (op === '×') {
                a = getSecureRandomInt(7, 15);
                b = getSecureRandomInt(3, 9);
                answer = a * b;
            } else if (op === '-') {
                a = getSecureRandomInt(50, 150);
                b = getSecureRandomInt(10, a - 10);
                answer = a - b;
            } else {
                a = getSecureRandomInt(25, 75);
                b = getSecureRandomInt(25, 75);
                answer = a + b;
            }
            return { problem: `${a} ${op} ${b}`, answer };
        }

        case 'sequence': {
            // "What comes next: 3, 6, 9, 12, ?"
            const start = getSecureRandomInt(2, 8);
            const step = getSecureRandomInt(2, 7);
            const terms = [start, start + step, start + step * 2, start + step * 3];
            const answer = start + step * 4;
            return {
                problem: `What comes next: ${terms.join(', ')}, ?`,
                answer
            };
        }

        case 'percentage': {
            // "What is 25% of 80?"
            const percentages = [10, 20, 25, 50];
            const percent = percentages[getSecureRandomInt(0, percentages.length - 1)];
            const base = getSecureRandomInt(4, 20) * (100 / percent); // Ensure clean answer
            const answer = (percent / 100) * base;
            return {
                problem: `What is ${percent}% of ${base}?`,
                answer
            };
        }

        case 'multistep': {
            // "If 4 × 5 = 20, what is 20 + 7?"
            const a = getSecureRandomInt(3, 8);
            const b = getSecureRandomInt(2, 6);
            const mid = a * b;
            const c = getSecureRandomInt(5, 15);
            const answer = mid + c;
            return {
                problem: `If ${a} × ${b} = ${mid}, what is ${mid} + ${c}?`,
                answer
            };
        }
    }
}

/**
 * Cryptographically secure random index generator
 * Replaces Math.random() for SonarQube compliance (typescript:S2245)
 *
 * Uses rejection sampling to eliminate modulo bias.
 * This ensures uniform distribution across all possible indices.
 */
export function getSecureRandomIndex(max: number): number {
    const limit = Math.floor(0xFFFFFFFF / max) * max;
    let value: number;
    do {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        value = array[0];
    } while (value >= limit);
    return value % max;
}

export function getRandomContent() {
    const types = ['quotes', 'math', 'teasers'] as const;
    const type = types[getSecureRandomIndex(types.length)];
    return getRandomOfType(type);
}

export function getRandomOfType(type: 'quotes' | 'math' | 'teasers') {
    switch (type) {
        case 'quotes':
            return { type, ...quotes[getSecureRandomIndex(quotes.length)] };
        case 'math':
            return { type, ...generateMathProblem() };
        case 'teasers':
            return { type, ...teasers[getSecureRandomIndex(teasers.length)] };
    }
}

export function escapeHtml(text: string): string {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/**
 * Normalize answer text by removing articles and extra whitespace
 */
function normalizeAnswer(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/^(a|an|the)\s+/i, '') // Remove leading articles
        .replaceAll(/\s+/g, ' ');
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
    const matrix = new Array(b.length + 1).fill(null).map(() => new Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,     // deletion
                matrix[j - 1][i] + 1,     // insertion
                matrix[j - 1][i - 1] + cost // substitution
            );
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Check if user's answer matches the expected answer using fuzzy matching
 * - Strips articles (a, an, the)
 * - Allows for typos (Levenshtein distance <= 2)
 * - Case insensitive
 */
export function fuzzyMatch(userAnswer: string, correctAnswer: string): boolean {
    const normalizedUser = normalizeAnswer(userAnswer);
    const normalizedCorrect = normalizeAnswer(correctAnswer);

    // Exact match after normalization
    if (normalizedUser === normalizedCorrect) {
        return true;
    }

    // Allow for small typos (distance <= 2) if answer is at least 4 chars
    if (normalizedCorrect.length >= 4) {
        const distance = levenshteinDistance(normalizedUser, normalizedCorrect);
        const maxDistance = Math.min(2, Math.floor(normalizedCorrect.length / 3));
        if (distance <= maxDistance) {
            return true;
        }
    }

    return false;
}

