# @10tion

**Stop doom-scrolling. Reclaim your focus.**

@10tion is a Chrome extension that helps you break free from addictive short-form content by blocking sites like TikTok, YouTube Shorts, and Instagram Reels with mindful friction.

## Features

- 🛑 **Smart Blocking** - Block entire sites or just short-form content (Shorts/Reels)
- 🧠 **Mindful Challenges** - Complete a quick challenge (quote, math, brain teaser) to unlock temporary access
- ⏱️ **Timed Breaks** - Choose 2, 5, or 10 minute breaks with automatic re-blocking
- 📊 **Statistics** - Track blocks, breaks, and your focus streak
- ⚙️ **Fully Customizable** - Configure which sites to block, add custom domains
- 🔒 **Privacy-First** - All data stays on your device. No tracking, no analytics.

## Installation

### From Chrome Web Store

🚀 **Install @10tion from Chrome Web Store** — Coming soon

### Development Install

1. Clone the repository:
   ```bash
   git clone https://github.com/NivaasSudhan/at10tion.git
   cd at10tion
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Build the extension:
   ```bash
   bun run build
   ```

4. Load in Chrome:
   - Navigate to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## Development

```bash
# Build for development
bun run build

# Build for production (minified + ZIP)
bun run build:prod

# Type check
bun run type-check

# Run unit tests
bun test tests/

# Run extension tests (Puppeteer)
bun run test:extension
```

## Configuration

The extension blocks these sites by default:

| Site | Default Mode |
|------|-------------|
| TikTok | Entire site |
| YouTube | Shorts only |
| Instagram | Reels only |
| Facebook | Reels only |
| X (Twitter) | Entire site |
| Snapchat | Entire site |
| Twitch | Entire site |

You can change the mode for each site or add your own custom domains in Settings.

## Break Limits

To prevent break abuse, the extension enforces limits:

- **Daily limit**: 10 breaks per day (configurable)
- **Consecutive limit**: 2 breaks in a row max
- **Cooldown**: 15 minutes between break sessions

## Privacy

All data is stored locally on your device. We don't collect, transmit, or share any personal information. See our full [Privacy Policy](PRIVACY_POLICY.md).

### Privacy Highlights

- ✅ No personal data collection
- ✅ No external servers
- ✅ No analytics or tracking
- ✅ No third-party services
- ✅ Open source and auditable

## Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **Manifest**: Chrome MV3
- **Testing**: Bun test + Playwright
- **Build**: Custom Bun build script

## Browser Support

- ✅ Chrome (Manifest V3)
- ✅ Edge (Chromium-based)
- ✅ Brave
- ✅ Other Chromium-based browsers

## Project Structure

```
src/
  background.ts         # Service worker
  content.ts            # Content script (blocking overlay)
  popup.ts              # Popup UI
  options.ts            # Settings page
  constants.ts          # Types and configuration
  data.ts               # Quotes, math problems, brain teasers
  stats.ts              # Statistics tracking
  shortFormDetector.ts  # DOM-based short-form detection
  icons/                # Extension and platform icons
  
tests/                  # Unit tests
e2e/                    # Playwright E2E tests
dist/                   # Built extension
```

## Testing

```bash
# Run all tests
bun test tests/

# Run specific test file
bun test tests/data.test.ts

# Run tests matching pattern
bun test --grep "escapeHtml"

# Run E2E tests
bun run test:e2e
```

**Test Coverage:** 52 tests passing, 100% pass rate

## Contributing

Contributions are welcome! Please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`bun test`)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Development Guidelines

See [AGENTS.md](AGENTS.md) for detailed coding standards and project guidelines.

## License

MIT © [Nivaas Sudhan](https://github.com/NivaasSudhan)

## Acknowledgments

- Icon system inspired by modern design systems
- Breathing exercises based on mindfulness research
- Security practices aligned with Chrome Web Store best practices
