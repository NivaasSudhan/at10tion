import { test, expect } from './fixtures';

test.describe('Extension Popup', () => {
  test.beforeEach(async ({ cleanExtensionState }) => {
    await cleanExtensionState();
  });

  test('should display initial state correctly', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    
    // Wait for popup to load
    await page.waitForSelector('#status-text', { timeout: 5000 });
    
    // Take baseline screenshot
    await expect(page).toHaveScreenshot('popup-initial.png');
    
    // Verify status text indicates active/enabled state
    const statusText = await page.locator('#status-text').textContent();
    expect(statusText).toMatch(/focus mode|enabled|active/i);
    
    await page.close();
  });

  test('should toggle extension state', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    
    await page.waitForSelector('#status-text', { timeout: 5000 });
    
    // Initial state screenshot
    await expect(page).toHaveScreenshot('popup-enabled.png');
    
    // Toggle off
    const toggleButton = page.locator('#toggle-btn, button:has-text("Disable"), button:has-text("Turn Off")').first();
    
    if (await toggleButton.isVisible().catch(() => false)) {
      await toggleButton.click();
      await page.waitForTimeout(500);
      
      // Screenshot after toggle
      await expect(page).toHaveScreenshot('popup-disabled.png');
      
      // Verify status changed
      const statusText = await page.locator('#status-text').textContent();
      expect(statusText?.toLowerCase()).toContain('disabled');
    }
    
    await page.close();
  });
});
