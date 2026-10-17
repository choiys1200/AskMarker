# AskMarker

**Read. Mark. Ask again.**

Highlight AI answers, ask beneath the source, and collect exact quote/question pairs into your next prompt. Use AskMarker with ChatGPT, Gemini, Grok and other AI pages containing selectable text. No AI API key, server or separate account.

[한국어 안내](README.ko.md) · [Install ZIP](releases/askmarker-v0.8.0.zip) · [Complete source](releases/askmarker-v0.8.0-source.zip) · [Validation](docs/VALIDATION.md) · [Architecture](docs/ARCHITECTURE.md)

## New in 0.8.0

- Gemini Quill and Grok ProseMirror/combobox composer recognition, plus ordinary textarea and editable textbox/combobox support on other sites.
- Hover briefly over the input, or click it, to offer **모아서 입력** (Collect and append). Confirmation preserves existing text, skips pairs already present, and unchecks delivered questions. The extension never sends the message.
- The right-panel offer toggle works across sites. Manual append remains available while automatic offers are off. With multiple editors, point to or click the intended editor rather than guessing a target.
- Text size defaults to **System/browser default**. **Custom input** accepts 80–160% through a number field or slider, affecting AskMarker UI and question bubbles.
- Default purple is **#6554e8**, the MarkChat icon color. The previous purple is replaced, keeping eight colors. Explicit previous color choices and per-note keys are preserved.

## Use

1. ChatGPT loads automatically. On Gemini, Grok or another ordinary page, click the **AskMarker toolbar icon** first.
2. Enable reading mode, select a passage, click **질문 추가** (Add question), then save beneath the source. Repeat while reading.
3. Check questions in the sidebar. New questions start checked; previously delivered questions require explicit reselection.
4. Hover over or click the AI input and confirm **모아서 입력**. Review and send yourself. Alternatively use manual append, editable preview or clipboard copy. Copy alone keeps selections.

Inline notes, highlights and sidebar editing stay synchronized. Reading mode OFF hides source annotations and retains records. Unsaved drafts survive mode toggles in the current tab, not reloads or closure. The compact right-hand dock moves vertically through its top handle; position persists and stays inside the viewport. Keyboard arrows and Home/End also work.

## Scope

ChatGPT uses dedicated answer/composer recognition and conversation IDs. Gemini and Grok use observed composer attributes with general source anchoring. Other pages use ordinary DOM editor recognition. Other-site records are separated by the full page URL; multiple chats reusing one URL share a bucket. Changed sources remain in the list without guessing a new anchor.

This does not promise every renderer on every AI site. Frames, closed shadow roots, non-text surfaces and specialized editors may not be recognized. If input acceptance cannot be confirmed, choices stay selected and copying remains available. Rich editors may display paragraph breaks differently from plain textareas; exact quote/question wording is retained.

## Install / update

Extract the prebuilt install ZIP and load its `askmarker` folder with Chrome Developer mode. Node.js is not required.

Existing users: back up records, overwrite **all ZIP files/subdirectories in the existing registered folder**, reload the extension and refresh the page. On Gemini/Grok and other manually activated pages, click the extension icon again. Confirm **v0.8.0**. Keep the original extension/path to preserve its ID and local storage. Note keys, prompt choices and backup format remain compatible. Retired Current size mode reads as System; explicit Custom values remain. Legacy colorless notes retain their yellow fallback.

## Validation

All 19 suites passed against executable files extracted from the install ZIP. Actual Gemini/Grok editor attributes were inspected read-only in connected Chrome; synthetic fixtures exercised those structures. **New-version insertion on live providers, their real editor frameworks and the company PC remain unverified.** See the environment-specific [report](docs/VALIDATION.md).

## Development / privacy

Edit `src/`, then run `npm run build`, `npm run check:build`, `npm test` and `python scripts/package.py`. Tests require Playwright and extension-capable Chromium; set `QA_BROWSER` and optionally `QA_PYTHON`/`QA_OUTPUT`. The build uses static local modules with no eval or network loader.

Notes/settings use `chrome.storage.local`. No network calls, downloaded fonts or automatic sends. Backups contain selected quotes and questions. Not affiliated with OpenAI, Google or xAI.
