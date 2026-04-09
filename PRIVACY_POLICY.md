# Privacy Policy for @10tion

**Effective Date:** February 8, 2026  
**Last Updated:** April 4, 2026

## Overview

@10tion ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our Chrome extension.

**Key Point:** @10tion is designed with privacy as a core principle. We collect **NO personal data**, transmit **NO information** to external servers, and store **EVERYTHING locally** on your device.

## Information We Collect

### We DO NOT Collect:
- Personal identification information (name, email, address, etc.)
- Browsing history or visited URLs
- Login credentials or passwords
- Payment information
- Device identifiers or IP addresses
- Analytics or usage statistics
- Any data transmitted to external servers

### We DO Store Locally:
- **Extension Settings:** Your blocking preferences, site configurations, and break limits
- **Usage Statistics:** Count of blocks and breaks (stored only on your device)
- **Break State:** Current break timer and daily usage (stored only on your device)

All stored data remains exclusively on your local device using Chrome's `storage.local` API.

## How We Use Information

Since we collect no personal data, there is no data usage beyond:
- **Local Functionality:** Enabling the extension's core features (blocking sites, tracking breaks)
- **User Preferences:** Remembering your settings between browser sessions

## Data Storage & Security

### Local Storage Only
All data is stored using Chrome's `chrome.storage.local` API, which means:
- ✅ Data never leaves your device
- ✅ No cloud synchronization
- ✅ No external databases
- ✅ Works offline completely

### Security Measures
- **XSS Protection:** All user-facing content is sanitized using `escapeHtml()`
- **Secure Randomness:** Uses `crypto.getRandomValues()` for security operations
- **Content Isolation:** Uses Shadow DOM to prevent style leakage
- **No External Scripts:** Zero external JavaScript dependencies

### Data Retention
- Statistics are automatically pruned after **90 days** to prevent storage bloat
- Settings persist until you uninstall the extension
- Uninstalling the extension removes all stored data immediately

## Third-Party Services

@10tion uses **NO third-party services**:
- No analytics (Google Analytics, Mixpanel, etc.)
- No crash reporting (Sentry, Bugsnag, etc.)
- No external APIs or CDNs
- No tracking pixels or cookies

The only network permission (`<all_urls>`) is used exclusively for:
- Injecting content scripts into blocked sites
- Closing tabs when requested by the user

## Permissions Explained

We request minimal permissions required for functionality:

| Permission | Purpose | Data Accessed |
|------------|---------|---------------|
| `storage` | Save your settings locally | None (local only) |

| `alarms` | Persist break timers | None |
| `scripting` | Inject blocking overlay | Page DOM for display only |
| `host_permissions` | Block specified sites | URL patterns only |

## Your Rights

### Data Control
You have complete control over your data:
- **View:** All data is visible in the extension's Options page
- **Modify:** Change settings anytime via the Options page
- **Delete:** Uninstall the extension to remove all data instantly
- **Export:** Use Chrome's standard extension data export (if available)

### GDPR Compliance
For users in the European Union:
- ✅ **Right to Access:** All data is accessible in the Options page
- ✅ **Right to Erasure:** Uninstall to delete all data
- ✅ **Right to Portability:** Data is stored in standard JSON format
- ✅ **Data Minimization:** We collect only what's necessary (which is nothing personal)

### CCPA Compliance
For users in California:
- ✅ **Right to Know:** This policy discloses all data practices
- ✅ **Right to Delete:** Uninstall to delete all data
- ✅ **Right to Opt-Out:** No sale of personal information (we have none)

## Children's Privacy

@10tion does not knowingly collect personal information from children under 13. Since we collect no personal information at all, the extension is safe for users of all ages.

## Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by:
- Updating the "Last Updated" date at the top of this policy
- Displaying a notification in the extension (for significant changes)

## Open Source

@10tion is open source software. You can:
- **Review the code:** [github.com/NivaasSudhan/at10tion](https://github.com/NivaasSudhan/at10tion)
- **Verify privacy claims:** All data handling is visible in the source
- **Contribute:** Submit improvements or report concerns

## Contact Us

If you have questions or concerns about this Privacy Policy or our data practices:

- **GitHub Issues:** [github.com/NivaasSudhan/at10tion/issues](https://github.com/NivaasSudhan/at10tion/issues)

## Summary

| Aspect | @10tion Practice |
|--------|------------------|
| **Personal Data Collected** | None |
| **Data Transmission** | None |
| **External Servers** | None |
| **Third-Party Sharing** | None |
| **Cookies** | None |
| **Local Storage** | Settings & statistics only |
| **Encryption** | Chrome's built-in storage |
| **Data Retention** | 90 days for stats, until uninstall for settings |

---

**By using @10tion, you agree to this Privacy Policy.** If you do not agree with this policy, please do not use the extension.

**Trust through transparency.** We believe privacy shouldn't require trust—verify our claims by inspecting our open-source code.
