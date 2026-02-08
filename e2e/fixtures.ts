import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'path';

/**
 * Extension test fixtures
 * 
 * Provides:
 * - context: BrowserContext with extension loaded
 * - extensionId: Extension ID extracted from service worker
 * - cleanExtensionState: Helper to reset extension storage
 */

export type TestFixtures = {
  context: BrowserContext;
  extensionId: string;
  cleanExtensionState: () => Promise<void>;
};

export const test = base.extend<TestFixtures>({
  // Create browser context with extension loaded
  context: async ({ }, use) => {
    const pathToExtension = path.join(process.cwd(), 'dist');
    
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--disable-web-security',
        '--no-first-run',
        '--disable-default-apps',
      ],
    });

    // Wait for service worker to initialize
    await new Promise(r => setTimeout(r, 2000));
    
    await use(context);
    await context.close();
  },

  // Extract extension ID from service worker
  extensionId: async ({ context }, use) => {
    let [serviceWorker] = context.serviceWorkers();
    
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker', { timeout: 10000 });
    }

    const extensionId = serviceWorker.url().split('/')[2];
    
    if (!extensionId) {
      throw new Error('Could not extract extension ID from service worker');
    }

    await use(extensionId);
  },

  // Helper to reset extension state
  cleanExtensionState: async ({ context, extensionId }, use) => {
    const resetState = async () => {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/options.html`);
      await page.waitForSelector('#is-enabled', { timeout: 5000 });
      
      // Enable extension
      const isEnabledCheckbox = page.locator('#is-enabled');
      await isEnabledCheckbox.check();
      
      // Click save
      await page.locator('#save-btn').click();
      await page.waitForTimeout(500);
      
      await page.close();
    };
    
    await use(resetState);
  },
});

export { expect } from '@playwright/test';
