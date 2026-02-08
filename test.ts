/**
 * @10tion Extension Test Suite
 * 
 * This uses a TWO-STEP approach for reliable MV3 extension testing:
 * 1. First run creates a Chrome profile with the extension pre-loaded
 * 2. Second run (or same run) connects to that profile and runs tests
 * 
 * Run with: bun test:extension
 */

import puppeteer, { Browser, Page } from 'puppeteer-core';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';

// Find Chrome executable
function getChromePath(): string {
    if (os.platform() === 'darwin') {
        return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    } else if (os.platform() === 'win32') {
        return String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
    }
    return '/usr/bin/google-chrome';
}

const EXTENSION_PATH = path.resolve(__dirname, 'dist');
// Persistent profile directory - extension will be remembered
const PROFILE_PATH = path.join(os.homedir(), '.at10tion-test-profile');

interface TestResult {
    name: string;
    passed: boolean;
    error?: string;
}

const results: TestResult[] = [];

// Create the test profile if it doesn't exist
async function ensureProfileExists(): Promise<void> {
    if (!fs.existsSync(PROFILE_PATH)) {
        console.log('📁 Creating test profile directory...');
        fs.mkdirSync(PROFILE_PATH, { recursive: true });
    }
}

async function launchBrowserWithExtension(): Promise<Browser> {
    await ensureProfileExists();

    console.log(`📂 Using profile: ${PROFILE_PATH}`);
    console.log(`📦 Loading extension: ${EXTENSION_PATH}\n`);

    const browser = await puppeteer.launch({
        headless: false, // Extensions require headed mode
        executablePath: getChromePath(),
        userDataDir: PROFILE_PATH, // Persistent profile
        args: [
            `--disable-extensions-except=${EXTENSION_PATH}`,
            `--load-extension=${EXTENSION_PATH}`,
            '--no-first-run',
            '--disable-default-apps',
            '--disable-popup-blocking',
            '--disable-translate',
            '--disable-sync',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
        ],
        defaultViewport: null,
    });

    // Important: Give MV3 service worker time to initialize
    console.log('⏳ Waiting for extension service worker to initialize...');
    await new Promise(r => setTimeout(r, 5000));

    return browser;
}

async function test(name: string, fn: () => Promise<void>) {
    try {
        await fn();
        results.push({ name, passed: true });
        console.log(`✅ ${name}`);
    } catch (error) {
        results.push({ name, passed: false, error: String(error) });
        console.log(`❌ ${name}: ${error}`);
    }
}

async function waitForSelector(page: Page, selector: string, timeout = 10000): Promise<boolean> {
    try {
        await page.waitForSelector(selector, { timeout });
        return true;
    } catch {
        return false;
    }
}

// Get extension ID by reading from the profile's extension preferences
async function getExtensionId(browser: Browser): Promise<string | null> {
    // Method 1: Check targets for service worker
    const targets = await browser.targets();
    const swTarget = targets.find(t =>
        t.type() === 'service_worker' &&
        t.url().includes('chrome-extension://')
    );

    if (swTarget) {
        const match = swTarget.url().match(/chrome-extension:\/\/([^/]+)/);
        if (match) return match[1];
    }

    // Method 2: Look for any chrome-extension target
    const extTarget = targets.find(t => t.url().includes('chrome-extension://'));
    if (extTarget) {
        const match = extTarget.url().match(/chrome-extension:\/\/([^/]+)/);
        if (match) return match[1];
    }

    // Method 3: Read from preferences file (most reliable for persistent profiles)
    const prefsPath = path.join(PROFILE_PATH, 'Default', 'Preferences');
    if (fs.existsSync(prefsPath)) {
        try {
            const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
            const extensions = prefs?.extensions?.settings;
            if (extensions) {
                for (const [id, settings] of Object.entries(extensions)) {
                    const s = settings as { manifest?: { name?: string } };
                    if (s.manifest?.name?.includes('@10tion')) {
                        return id;
                    }
                }
            }
        } catch {
            // Ignore parse errors
        }
    }

    return null;
}

async function runTests() {
    console.log('\n🧪 @10tion Extension Test Suite');
    console.log('================================\n');

    let browser: Browser | null = null;
    let extensionId: string | null = null;

    try {
        browser = await launchBrowserWithExtension();

        // Get extension ID
        await test('Extension loads in Chrome', async () => {
            extensionId = await getExtensionId(browser!);
            if (!extensionId) {
                throw new Error('Extension ID not found - extension may not have loaded');
            }
            console.log(`   Extension ID: ${extensionId}`);
        });

        if (!extensionId) {
            console.log('\n⚠️  Extension did not load.');
            console.log('   Try running the test again - the profile may need to initialize.\n');
            return;
        }

        // Test 1: YouTube Shorts should be blocked
        await test('YouTube Shorts shows block overlay', async () => {
            const page = await browser!.newPage();
            await page.goto('https://www.youtube.com/shorts/dQw4w9WgXcQ', {
                waitUntil: 'networkidle0',
                timeout: 30000
            });
            await new Promise(r => setTimeout(r, 3000));

            const hasOverlay = await waitForSelector(page, '#work-focus-block');
            if (!hasOverlay) {
                // Debug: check if content script is running
                const scripts = await page.evaluate(() => {
                    return (window as any).__at10tion_initialized || false;
                });
                throw new Error(`Block overlay not found. Content script initialized: ${scripts}`);
            }
            await page.close();
        });

        // Test 2: Regular YouTube should NOT be blocked
        await test('Regular YouTube is not blocked', async () => {
            const page = await browser!.newPage();
            await page.goto('https://www.youtube.com', { waitUntil: 'domcontentloaded' });
            await new Promise(r => setTimeout(r, 2000));

            const hasOverlay = await page.$('#work-focus-block');
            if (hasOverlay) throw new Error('Block overlay found on regular YouTube');
            await page.close();
        });

        // Test 3: Extension popup works
        await test('Extension popup loads', async () => {
            const page = await browser!.newPage();
            await page.goto(`chrome-extension://${extensionId}/popup.html`);
            await new Promise(r => setTimeout(r, 1000));

            const hasStatus = await waitForSelector(page, '#status-text');
            if (!hasStatus) throw new Error('Popup did not load');

            const statusText = await page.$eval('#status-text', el => el.textContent);
            console.log(`   Status: ${statusText}`);
            await page.close();
        });

        // Test 4: Options page works
        await test('Options page loads', async () => {
            const page = await browser!.newPage();
            await page.goto(`chrome-extension://${extensionId}/options.html`);
            await new Promise(r => setTimeout(r, 1000));

            const hasCheckbox = await waitForSelector(page, '#is-enabled');
            if (!hasCheckbox) throw new Error('Options page did not load');

            const isEnabled = await page.$eval('#is-enabled', (el: Element) => (el as HTMLInputElement).checked);
            console.log(`   Extension enabled: ${isEnabled}`);
            await page.close();
        });

        // Test 5: is_enabled toggle works
        await test('is_enabled toggle disables blocking', async () => {
            // Disable via options
            const optionsPage = await browser!.newPage();
            await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
            await new Promise(r => setTimeout(r, 500));

            // Uncheck if enabled
            const isChecked = await optionsPage.$eval('#is-enabled', (el: Element) => (el as HTMLInputElement).checked);
            if (isChecked) {
                await optionsPage.click('#is-enabled');
                await optionsPage.click('#save-btn');
                await new Promise(r => setTimeout(r, 500));
            }
            await optionsPage.close();

            // Visit blocked site - should NOT show overlay
            const page = await browser!.newPage();
            await page.goto('https://www.youtube.com/shorts/dQw4w9WgXcQ', {
                waitUntil: 'networkidle0',
                timeout: 30000
            });
            await new Promise(r => setTimeout(r, 2000));

            const hasOverlay = await page.$('#work-focus-block');
            await page.close();

            // Re-enable
            const optionsPage2 = await browser!.newPage();
            await optionsPage2.goto(`chrome-extension://${extensionId}/options.html`);
            await new Promise(r => setTimeout(r, 500));
            await optionsPage2.click('#is-enabled');
            await optionsPage2.click('#save-btn');
            await optionsPage2.close();

            if (hasOverlay) throw new Error('Block was showing when extension disabled');
        });

    } finally {
        if (browser) {
            await browser.close();
        }
    }

    // Print summary
    console.log('\n================================');
    console.log('📊 Test Summary\n');
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    console.log(`Passed: ${passed}/${results.length}`);
    console.log(`Failed: ${failed}/${results.length}`);

    if (failed > 0) {
        console.log('\nFailed tests:');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`  - ${r.name}: ${r.error}`);
        });
        process.exit(1);
    } else {
        console.log('\n✅ All tests passed!\n');
    }
}

// Clean profile command
if (process.argv.includes('--clean')) {
    console.log('🧹 Cleaning test profile...');
    if (fs.existsSync(PROFILE_PATH)) {
        fs.rmSync(PROFILE_PATH, { recursive: true });
        console.log('   Profile deleted.');
    } else {
        console.log('   No profile to clean.');
    }
    process.exit(0);
}

await runTests();
