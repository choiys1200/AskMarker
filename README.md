# Qubble

**Don't interrupt your reading to ask a question.**

Qubble lets you attach questions to specific passages of AI answers, keep reading, and bring selected quote–question pairs together in one follow-up prompt.

**Read. Mark. Ask again.**

[한국어](README.ko.md) · [Install ZIP](releases/qubble-v0.12.0.zip) · [Source ZIP](releases/qubble-v0.12.0-source.zip) · [Privacy](docs/PRIVACY.md) · [Validation](docs/VALIDATION.md)

## Why Qubble?

When a long AI answer contains something confusing or questionable, asking immediately breaks your reading flow. If you wait, you may lose the exact passage and the question you had. Qubble keeps the two connected.

## How it works

1. **Read.** Enable reading mode and select a passage in an AI answer.
2. **Mark.** Click **Add comment**, write a question beneath that passage, and continue reading. Merely selecting text does not open an editor.
3. **Collect.** Your questions stay attached to their original text and appear in a sidebar. Check only the ones you want to use next.
4. **Ask again.** Preview/edit, copy, or append the selected quote–question pairs to the AI input. Review and send the message yourself; Qubble never submits it automatically.

**What makes it different:** the primary interaction is not inserting a quote into the chat input immediately. It is collecting contextual questions *while reading*, keeping the inline bubbles and records, then choosing which ones become the next prompt.

### Demo

A short recording of the **real extension running on a live AI page** is being prepared. Until then, the instructions above and the downloadable build describe the currently available workflow. Any illustrative simulation should be labeled as a simulation, not as live compatibility proof.

## Install

1. Download and extract the [Qubble v0.12.0 install ZIP](releases/qubble-v0.12.0.zip).
2. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge), enable Developer mode, and select **Load unpacked**.
3. Choose the extracted `qubble` folder containing `manifest.json`; refresh the ChatGPT tab.
4. On ChatGPT the extension loads automatically. On other supported pages, click the toolbar icon to start it.

Chrome/Edge are Chromium-based, but live behavior depends on the specific AI site's DOM/editor. The current automated tests use isolated browsers and synthetic AI pages; they do **not** establish compatibility with every live service or account. Report reproducible issues through GitHub Issues.

## Focused by default

The main panel shows reading mode, your question list, selection count, and actions to create, insert, or copy a prompt. **Settings**, **Records**, and **Help** start collapsed. Each question's color palette appears only when needed. Short transitions respect reduced-motion preferences.

Questions, highlights, and inline comments remain synchronized. Reading mode OFF hides annotations without deleting records. Drafts survive panel/mode changes in the current tab, but not tab closure.

## Privacy and records

Questions and settings are stored locally via `chrome.storage.local`. Core features require no AI API key, account, or Qubble server. The extension does not automatically send AI messages. JSON backup/import is available under **Records**.

Optional Notion/Google Drive archive export is separate, defaults OFF, and requires explicit setup, selection, preview and approval. The distributed build is not preconfigured for live OAuth. It does not auto-sync or capture entire historical conversations. See [Archive setup](docs/ARCHIVE-SETUP.md) and [Privacy](docs/PRIVACY.md).

## Updating without losing notes

Back up your records, then copy the new ZIP's `qubble` contents into the **same unpacked extension directory** already registered in your browser. Reload the extension and refresh the AI tab. Keep that directory even if it is named AskMarker: changing installation identity can separate the local records. Existing note/choice keys and v3/v4 JSON backups remain compatible.

## Development and limitations

Edit `src/` and run `node scripts/build.cjs`; tests use `npm test` with an extension-capable Chromium browser. Build/source archives and SHA-256 files are produced by `python scripts/package.py`.

[Changes v0.12.0](docs/CHANGES-0.12.0.md) · [Architecture](docs/ARCHITECTURE.md) · [Validation](docs/VALIDATION.md) · [Public launch checklist](docs/LAUNCH-KIT.md)

The current automated validation includes synthetic HTML and installed Chrome/Edge extension runtimes, not user accounts on the current live ChatGPT/Gemini/Grok/Claude services. AI site updates may require compatibility fixes. Qubble is not affiliated with OpenAI, Google, xAI or Notion.
