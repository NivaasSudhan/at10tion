/**
 * @10tion Permissions Utility
 *
 * Handles dynamic permission requests for custom sites.
 */

import { logger } from './logger';

/**
 * Request host permission for a custom domain
 */
export async function requestSitePermission(domain: string): Promise<boolean> {
    try {
        const granted = await chrome.permissions.request({
            origins: [`*://*.${domain}/*`, `*://${domain}/*`]
        });
        return granted;
    } catch (error) {
        logger.error('Failed to request permission for', domain, error);
        return false;
    }
}
