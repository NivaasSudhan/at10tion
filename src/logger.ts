/**
 * Centralized logger for @10tion extension.
 * 
 * Debug logs are stripped in production builds.
 * Error logs always execute.
 */

// Build-time constant injected by Bun
declare const __DEV__: boolean;

const PREFIX = '[at10tion]';

export const logger = {
  debug: (...args: unknown[]) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log(PREFIX, ...args);
    }
  },

  info: (...args: unknown[]) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.info(PREFIX, ...args);
    }
  },

  warn: (...args: unknown[]) => {
    // Warnings are always logged
    console.warn(PREFIX, ...args);
  },

  error: (...args: unknown[]) => {
    // Errors are always logged
    console.error(PREFIX, ...args);
  },
};
