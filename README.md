# AskMarker

**Read. Mark. Ask again.**

Highlight AI answers, add questions beneath the source, and collect the exact quote/question pairs into your next prompt. Use AskMarker across AI chats, including **ChatGPT, Gemini and Grok**. Built around a ChatGPT reading workflow, with a general web-page mode for other services. No AI API key, server or separate account.

[한국어 안내](README.ko.md) · [Architecture](docs/ARCHITECTURE.md) · [Validation](docs/VALIDATION.md)

## Icon

**MarkChat is the single fixed AskMarker icon.** The speech bubble and highlighted line identify the extension in the toolbar and extension manager. No icon chooser or extra setup is needed. The enlarged artwork from 0.7.3 is retained.

Version 0.7.4 removes the other four designs, the options page and its panel button. Updates clear only the retired icon preference; saved questions and reading settings are preserved. Original SVG and six transparent PNG sizes are included in the source archive.

## What's new in 0.7.1

Renamed to **AskMarker** across the extension, panel controls, documentation and downloads. Existing note/settings keys and the backup format are unchanged. Update the files in your existing registered folder to retain the extension ID and history. The repository is now [choiys1200/AskMarker](https://github.com/choiys1200/AskMarker).

## Features introduced in 0.7.0

- Modular source boundaries for source anchoring, prompt formatting, composer delivery, storage choices, cards and appearance. Appearance changes cannot write notes or prompt membership.
- Refined light/dark UI with consistent reading-mode and expand/collapse controls.
- System/local font options for AskMarker and answer paragraphs in reading mode. Code fonts remain unchanged; no downloaded fonts.
- Adjustable pointer opacity/intensity, with the same eight-color radial glow.
- Selection in ChatGPT's editable writing blocks, including email/message examples; notes appear below the complete writing/code box without modifying its editor document.
- Successfully appending a prompt clears its captured question selections. Notes and annotations remain. New questions start checked; recheck old ones to reuse them. Failed/cancelled insertions and clipboard-only copies keep selections.

## Use

1. On ChatGPT, AskMarker loads automatically. On Gemini, Grok or another ordinary web page, click the **AskMarker extension icon** first. Enable reading mode and select a passage. A small **질문 추가** (Add question) button appears without opening an editor.
2. Click it, write beneath the source and save. Repeat as you read.
3. Choose colors, local fonts and pointer intensity in the right-hand panel. Per-question color dots stay compact.
4. Check the questions to include. On ChatGPT, click its input and confirm **모아서 입력**, or use the panel's append button. Existing input is preserved; duplicates are skipped. On other services, use **바로 복사** (Copy) or the editable preview, then paste into that service's input.
5. Review and send yourself. After successful ChatGPT insertion, the consumed questions are unchecked so the next reading round starts with only new questions selected. Clipboard-only copies keep selections; use **선택 해제** after pasting when you want a fresh batch.

Editable preview, clipboard copy, select/deselect all, local backup/import, and synchronized inline/sidebar editing remain available. Reading mode and panel collapse are independent. Turning reading mode off hides annotations and preserves notes. Unsaved drafts survive mode toggles in the current tab, not reloads or tab closure. If exact source identity cannot be confirmed, notes stay in the list without attaching to another sentence.

## Install / update

[Install ZIP](releases/askmarker-v0.7.4.zip) · [Complete source ZIP](releases/askmarker-v0.7.4-source.zip)

Extract the install ZIP, open `chrome://extensions`, enable Developer mode and load the `askmarker` directory containing `manifest.json`. The install ZIP is prebuilt; Node.js is not needed.

**Existing users:** back up notes, then overwrite **all files and subdirectories from the new ZIP, including `assets/`** **in the existing registered directory**. Reload the extension and refresh the page; on other services click the extension icon again. Verify **v0.7.4** in the panel. Keep the extension and installation path to preserve its ID/storage. Existing note keys, choice keys, permissions and backup format remain compatible.

## Site support and verification

| Capability | ChatGPT | Gemini, Grok and other ordinary AI web pages |
| --- | --- | --- |
| Start AskMarker | Automatic | Click the extension icon on the page |
| Select text, highlight, add questions, sidebar, preview and copy | Dedicated answer integration | General web-page mode for selectable DOM text |
| Append to the AI input / click-to-confirm prompt offer | Yes | Copy and paste manually |
| Exact source restoration | Message identity and text offsets | Exact indexed page text; page changes may hide annotations while retaining the notes |

Other services do not need a separate AI API integration for marking and copying. This is **not a promise of every renderer or feature on every AI site**: embedded frames, closed shadow roots, non-text surfaces and editable answer widgets may not be selectable by the general adapter. Other-site records are separated by full page URL; chats that reuse one URL share that bucket. Answer-body font overrides and editable writing-box handling are currently ChatGPT-specific. AskMarker's own UI font settings apply everywhere.

Version 0.7.4 was checked using an actual extension update from 0.7.3 to 0.7.4 in isolated Chromium, the main reading-flow suite and synthetic general AI pages. The update preserves note/choice data, removes the retired icon preference and exposes no icon-selection UI. Earlier version reports remain archived.

These are isolated-browser fixtures, not live AI sessions. **Live 0.7.4 ChatGPT/Gemini/Grok and company-PC behavior remains unverified.** See [the report](docs/VALIDATION.md).

## Development

Edit **`src/`**, not generated `content.js`. See [module responsibilities and extension rules](docs/ARCHITECTURE.md).

```sh
npm install
npm run build
npm run check:build
npm test
python scripts/package.py
```

Set `QA_PYTHON` to Python for the packaged-version update check. Set `QA_BROWSER` to an extension-capable Chromium executable and optionally `QA_OUTPUT` to a test-artifact directory. The static CommonJS/CSS/HTML bundler uses only Node built-ins: no eval, network loader or framework. The prebuilt content script and local PNG assets ship together; copy the complete runtime directory when updating.

UI direction was informed by [21st.dev](https://21st.dev/); the implementation uses original local CSS rather than imported components.

## Privacy

Notes and settings are stored in `chrome.storage.local`. No network requests, font downloads or automatic message sending. Exported backups include selected quotes and questions; keep them private.

Early release. AI sites' DOM changes may require compatibility fixes. Not affiliated with OpenAI, Google or xAI.
