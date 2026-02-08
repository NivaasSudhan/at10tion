import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright configuration for @10tion Chrome Extension E2E tests
 * 
 * Key features:
 * - Headless extension testing via channel: 'chromium'
 * - Screenshot comparison testing
 * - Sequential execution for extension state stability
 */

export default defineConfig({
  testDir: './e2e',
  
  // Run tests sequentially (workers: 1) for extension state stability
  workers: 1,
  
  // Retry failed tests (useful for network flakiness)
  retries: 2,
  
  // Reporter configuration
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],
  
  // Shared settings for all projects
  use: {
    // Screenshot capture on failure
    screenshot: 'only-on-failure',
    
    // Trace for debugging
    trace: 'on-first-retry',
    
    // Viewport - desktop only as requested
    viewport: { width: 1920, height: 1080 },
    
    // Action timeout
    actionTimeout: 10000,
    
    // Navigation timeout (for YouTube loads)
    navigationTimeout: 30000,
  },

  // Project configurations
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use chromium channel for headless extension support
        channel: 'chromium',
      },
    },
  ],

  // Snapshot configuration
  expect: {
    toHaveScreenshot: {
      // Tolerance for anti-aliasing differences
      maxDiffPixels: 100,
      // Threshold for pixel comparison
      threshold: 0.2,
    },
  },

  // Output directories
  outputDir: 'e2e/test-results/',
  
  // Global timeout
  globalTimeout: 300000,
});
