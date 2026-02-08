import { describe, expect, test } from "bun:test";
import { fuzzyMatch, getRandomContent, quotes, teasers, getRandomOfType, escapeHtml } from "../src/data";

describe("Data Module", () => {
    describe("escapeHtml - XSS Prevention", () => {
        test("should escape script tags", () => {
            expect(escapeHtml('<script>alert(1)</script>'))
                .toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
        });

        test("should escape HTML entities", () => {
            expect(escapeHtml('<div class="test">')).toBe('&lt;div class=&quot;test&quot;&gt;');
        });

        test("should escape ampersands", () => {
            expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
        });

        test("should escape single quotes", () => {
            expect(escapeHtml("it's")).toBe("it&#039;s");
        });

        test("should handle empty strings", () => {
            expect(escapeHtml('')).toBe('');
        });

        test("should not modify safe strings", () => {
            expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
        });

        test("should escape event handlers", () => {
            expect(escapeHtml('<img onerror="alert(1)">')).toBe('&lt;img onerror=&quot;alert(1)&quot;&gt;');
            expect(escapeHtml('<div onmouseover="alert(1)">')).toBe('&lt;div onmouseover=&quot;alert(1)&quot;&gt;');
        });

        test("should escape nested/malformed tags", () => {
            expect(escapeHtml('<<script>script>alert(1)<</script>/script>')).toBe('&lt;&lt;script&gt;script&gt;alert(1)&lt;&lt;/script&gt;/script&gt;');
        });

        test("should escape javascript: protocol", () => {
            expect(escapeHtml('<a href="javascript:alert(1)">')).toBe('&lt;a href=&quot;javascript:alert(1)&quot;&gt;');
        });

        test("should handle unicode characters", () => {
            expect(escapeHtml('Hello 你好 🎉')).toBe('Hello 你好 🎉');
        });

        test("should escape SVG/XML tags", () => {
            expect(escapeHtml('<svg onload="alert(1)"></svg>')).toBe('&lt;svg onload=&quot;alert(1)&quot;&gt;&lt;/svg&gt;');
        });

        test("should escape HTML entities in domain names", () => {
            expect(escapeHtml('example<script>.com')).toBe('example&lt;script&gt;.com');
            expect(escapeHtml('test"site.com')).toBe('test&quot;site.com');
        });
    });

    describe("fuzzyMatch", () => {
        test("should match exact strings", () => {
            expect(fuzzyMatch("hello world", "hello world")).toBe(true);
        });

        test("should be case insensitive", () => {
            expect(fuzzyMatch("Hello World", "hello world")).toBe(true);
        });

        test("should ignore leading/trailing whitespace", () => {
            expect(fuzzyMatch("  hello  ", "hello")).toBe(true);
        });

        test("should ignore articles (a, an, the)", () => {
            expect(fuzzyMatch("a keyboard", "keyboard")).toBe(true);
            expect(fuzzyMatch("the echo", "echo")).toBe(true);
        });

        test("should allow minor typos (Levenshtein distance)", () => {
            expect(fuzzyMatch("keybaord", "keyboard")).toBe(true); // 1 substitution
            expect(fuzzyMatch("kyboard", "keyboard")).toBe(true);  // 1 deletion
        });

        test("should not match completely different strings", () => {
            expect(fuzzyMatch("banana", "apple")).toBe(false);
        });
    });

    describe("Content Generation", () => {
        test("getRandomContent should return valid content", () => {
            const content = getRandomContent();
            expect(content).toBeDefined();
            expect(['quotes', 'math', 'teasers']).toContain(content.type);
        });

        test("getRandomOfType('quotes') returns a quote", () => {
            const content = getRandomOfType('quotes');
            expect(content.type).toBe('quotes');
            expect((content as any).text).toBeDefined();
            // Check that the text/author exist in original array, ignoring extra 'type' prop
            const original = quotes.find(q => q.text === (content as any).text);
            expect(original).toBeDefined();
        });

        test("getRandomOfType('math') returns a math problem", () => {
            const content = getRandomOfType('math');
            expect(content.type).toBe('math');
            expect((content as any).problem).toBeDefined();
            expect((content as any).answer).toBeDefined();
            // Math problems are now dynamically generated, so verify structure
            expect(typeof (content as any).problem).toBe('string');
            expect(typeof (content as any).answer).toBe('number');
        });

        test("getRandomOfType('teasers') returns a teaser", () => {
            const content = getRandomOfType('teasers');
            expect(content.type).toBe('teasers');
            expect((content as any).question).toBeDefined();
            expect((content as any).answer).toBeDefined();
            const original = teasers.find(t => t.question === (content as any).question);
            expect(original).toBeDefined();
        });
    });
});
