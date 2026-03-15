/// <reference types="chrome"/>

/**
 * Error Boundary Utilities
 * 
 * Provides safe wrappers for Chrome API calls and user-friendly error UI states.
 */



/**
 * Safe wrapper for chrome.storage.local.get
 * Returns null on error instead of throwing
 */
export async function safeStorageGet<T extends Record<string, unknown>>(
    keys: string[]
): Promise<T | null> {
    try {
        const result = await chrome.storage.local.get(keys);
        return result as T;
    } catch (error) {
        console.error('[ErrorBoundary] Storage get failed:', error);
        return null;
    }
}

/**
 * Display a user-friendly error state in a container
 */
export function showErrorState(
    container: HTMLElement,
    message: string,
    showRetry: boolean = true
): void {
    // Clear existing content
    container.innerHTML = '';

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-state';

    // Error icon
    const iconSpan = document.createElement('span');
    iconSpan.className = 'error-icon';
    iconSpan.textContent = '⚠️';
    errorDiv.appendChild(iconSpan);

    // Error message (escaped for safety)
    const msgP = document.createElement('p');
    msgP.className = 'error-message';
    msgP.textContent = message;
    errorDiv.appendChild(msgP);

    // Retry button
    if (showRetry) {
        const retryBtn = document.createElement('button');
        retryBtn.className = 'retry-btn';
        retryBtn.textContent = 'Retry';
        retryBtn.addEventListener('click', () => {
            location.reload();
        });
        errorDiv.appendChild(retryBtn);
    }

    container.appendChild(errorDiv);
}

