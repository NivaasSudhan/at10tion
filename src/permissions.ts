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

/**
 * Check if we have permission for a domain
 */
export async function hasSitePermission(domain: string): Promise<boolean> {
    try {
        return await chrome.permissions.contains({
            origins: [`*://*.${domain}/*`]
        });
    } catch {
        return false;
    }
}

/**
 * Remove permission for a custom domain
 */
export async function removeSitePermission(domain: string): Promise<boolean> {
    try {
        return await chrome.permissions.remove({
            origins: [`*://*.${domain}/*`, `*://${domain}/*`]
        });
    } catch {
        return false;
    }
}

/**
 * Get all currently granted optional permissions
 */
export async function getGrantedPermissions(): Promise<string[]> {
    try {
        const permissions = await chrome.permissions.getAll();
        return permissions.origins || [];
    } catch {
        return [];
    }
}
