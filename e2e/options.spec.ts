import { test, expect } from './fixtures';

test.describe('Extension Options Page', () => {
  test('should display options page correctly', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    
    // Wait for page to load
    await page.waitForSelector('#is-enabled', { timeout: 5000 });
    
    // Take baseline screenshot
    await expect(page).toHaveScreenshot('options-initial.png');
    
    // Verify enabled checkbox exists and is checked by default
    const isEnabledCheckbox = page.locator('#is-enabled');
    await expect(isEnabledCheckbox).toBeVisible();
    await expect(isEnabledCheckbox).toBeChecked();
    
    await page.close();
  });

  test('should save settings changes', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    
    await page.waitForSelector('#is-enabled', { timeout: 5000 });
    
    // Toggle extension off
    await page.locator('#is-enabled').uncheck();
    
    // Click save
    await page.locator('#save-btn').click();
    
    // Wait for save confirmation
    await page.waitForTimeout(500);
    
    // Screenshot showing saved state
    await expect(page).toHaveScreenshot('options-disabled.png');
    
    // Verify checkbox is unchecked
    await expect(page.locator('#is-enabled')).not.toBeChecked();
    
    // Toggle back on for other tests
    await page.locator('#is-enabled').check();
    await page.locator('#save-btn').click();
    await page.waitForTimeout(500);
    
    await page.close();
  });
});
