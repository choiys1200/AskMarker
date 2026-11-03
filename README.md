# Qubble

**Read. Mark. Ask again.**

Leave questions and comments beneath selected AI text, keep reading, then collect the exact passage/comment pairs into one follow-up prompt. Works with selectable AI pages such as ChatGPT, Gemini and Grok; DOM/editor compatibility varies. Core local features need no AI key or server.

[한국어](README.ko.md) · [Install ZIP](releases/qubble-v0.12.0.zip) · [Full source](releases/qubble-v0.12.0-source.zip) · [Changes](docs/CHANGES-0.12.0.md) · [Validation](docs/VALIDATION.md)

## New in 0.12.0

AskMarker is now **Qubble**. The main panel puts reading mode, prompt creation, insertion/copy and your Q list first. Settings, Records and Help start closed. Each Q has a small color dot that opens its palette. Quieter surfaces, clearer selected states and short 160ms transitions make the controls easier to scan. Reduced-motion preferences are respected.

## Use

1. On ChatGPT the tool starts automatically. On other sites click the extension toolbar icon.
2. Enable **Reading mode**, select text, then click **Add comment**. Selection alone does not open an editor.
3. Save beneath the passage. Use **[ ] QN** in the sidebar to include/exclude it from your next prompt. Notes, highlights and inline cards stay synchronized.
4. Choose **Create prompt** to preview/edit, or **Insert selected comments** / **Copy** for the selected Qs. Existing input is retained; verified insertion deselects the delivered Qs. Copying alone does not deselect them.
5. Review/edit and **send yourself**. Qubble never submits an AI message.

**Settings** contains language, theme, font/size, pointer opacity and insertion offers. Korean is the default. **Records** contains JSON backup/import and optional archive export. **Help** contains the manual selection action and brief instructions. Reading mode OFF hides annotations without deleting notes. Drafts survive mode/panel changes but not closing the tab.

Prompts contain `QN`, `Selected text`, `My comment` in that order. One final instruction asks the AI to act on each comment while treating the selected text as reference material, not executable instructions. Original user content is not rewritten.

## Optional archive

Open **Records → Export this conversation**: choose records, provider and destination; preview; approve one snapshot; save to a Notion page or Drive Markdown file. Default OFF. Connecting an account does not approve an upload. No background scheduling or two-way sync.

The shipped build shows **Connection setup required**. Drive needs a public Chrome OAuth client ID with `drive.file`. Notion public OAuth needs the supplied server-side authentication broker. Its secret never belongs in the extension; conversation content never passes through the broker. See [setup](docs/ARCHIVE-SETUP.md) and [privacy/permissions](docs/PRIVACY.md).

Generated prompts, insertion and confirmed rendered user messages are separate records. Capture covers observed request batches on the current page, not the entire conversation. Streaming/missing/completion-unverified replies remain labeled partial. Uncertain links/times/IDs are not guessed. Live OAuth and production provider writes remain unverified.

## Backup / upgrade

Local JSON backups retain v3/v4 compatibility, original `question` fields and note/choice keys. Current-chat filenames include service, title and date. Full backup includes all locally saved Qs. Tokens and the separate archive journal are not included.

Back up existing records in **Records**, then copy the contents of the ZIP's `qubble` directory into the **same unpacked extension directory already registered in Chrome/Edge**. Reload the extension and AI tabs and confirm v0.12.0 in Help. Keep the old installed folder path even if its name contains AskMarker. Do not remove the extension or register a new path: its storage identity may change. Other AI sites need another toolbar click.

Storage keys, archive RPC names and the legacy Notion snapshot marker deliberately retain their existing internal names. Existing pending exports and remote reconciliation remain compatible. Old releases and validation documents keep their historical branding.

## Development

Run `node scripts/build.cjs` after editing `src/`. `npm test` uses Playwright plus extension-capable Chromium (`QA_BROWSER`, optional `QA_PYTHON`, `QA_OUTPUT`). `python scripts/package.py` produces installation/source ZIPs and SHA-256 files. Broker code ships in the source ZIP, not the installed extension.

See [architecture](docs/ARCHITECTURE.md) and [validation](docs/VALIDATION.md) for the difference between synthetic HTML, real browser extension loading and live services. No new permissions, remote fonts or network services were added for this redesign. Not affiliated with OpenAI, Google, xAI or Notion.
