# @10tion Permission Justifications

> For Chrome Web Store listing and review

## Required Permissions

### `storage`
**Purpose:** Store user preferences and extension state locally.

- Blocked site configurations
- Challenge type preferences (quotes, math, teasers)
- Break limit settings
- Current break state and timer
- Focus streak statistics

**Privacy:** All data stored locally via `chrome.storage.local`. No data transmitted externally.

---

### `tabs`
**Purpose:** Read active tab URL to determine if blocking should apply.

**Scope:** Only reads tab URL. No browsing history or content access.

**Used when:** User navigates to a configured blocked site.

---

### `alarms`
**Purpose:** Schedule timed breaks and cooldown periods.

- 2/5/10 minute break timers
- 15-minute consecutive break cooldowns
- Midnight daily counter reset

**Scope:** Internal timing only. No external triggers or notifications.

---

### `scripting`
**Purpose:** Inject content scripts into user-added custom sites.

**Trigger:** Only after user explicitly adds a site via options page AND grants permission.

**Scope:** Runs only on sites the user adds to their block list.

---

## Host Permissions

Each domain permission enables:
1. Injecting blocking overlay on matched pages
2. Detecting short-form content (Shorts, Reels)
3. Hiding/blurring embedded short-form content in feeds

| Domain | Justification |
|--------|---------------|
| `*.tiktok.com` | Block entire site (all content is short-form) |
| `*.youtube.com` | Block `/shorts/` and embedded Shorts on homepage |
| `*.instagram.com` | Block `/reels/` and embedded Reels |
| `*.facebook.com` | Block `/reel/` and Stories/Reels content |
| `*.x.com` / `*.twitter.com` | Block entire site (infinite scroll) |
| `*.snapchat.com` | Block entire site (ephemeral content) |
| `*.twitch.tv` | Block entire site (live streaming) |

---

## Optional Host Permissions

### `<all_urls>`
**Purpose:** Allow users to block custom sites beyond defaults.

**Trigger:** Only requested when user adds a custom site.

**Approval:** User must explicitly grant permission for each custom site.

---

## Privacy Summary

- ✅ No external data transmission
- ✅ No browsing history collection
- ✅ No analytics or tracking
- ✅ All data stored locally
- ✅ Minimal permission scope
