# AskMarker

**Read. Mark. Comment. Ask again.**

Mark selected AI text and add comments, questions, instructions, or revision requests beneath the source. Collect exact selected-text/comment pairs into a follow-up prompt. Works with selectable AI pages such as ChatGPT, Gemini and Grok; DOM/editor compatibility varies. Core local features need no AI key or server.

[한국어](README.ko.md) · [Install ZIP](releases/askmarker-v0.10.1.zip) · [Full source](releases/askmarker-v0.10.1-source.zip) · [Changes](docs/CHANGES-0.10.1.md) · [Validation](docs/VALIDATION.md)

## Use

1. On ChatGPT the tool starts automatically. On other sites click the extension toolbar icon.
2. Enable reading mode, select text, then click **Add comment**. Selection alone does not open an editor.
3. Save the comment beneath the passage. Use **[ ] Mark N** in the sidebar to include/exclude it from your next prompt. Notes, highlights and inline cards stay synchronized.
4. Accept the insertion offer at the AI input or use the sidebar button. Existing input is retained; verified insertion deselects the delivered Marks. Copying alone does not deselect them.
5. Review/edit and **send yourself**. The extension never submits an AI message.

Korean is the default; English is selectable. Reading mode, fonts, browser-default/custom sizing, pointer color/opacity, hide/show and draggable compact controls remain available. Reading mode OFF hides annotations without deleting notes. In-progress drafts survive mode changes but not closing the tab.

Prompts contain `Mark N`, `Selected text`, `My comment` in that order. One final instruction asks the AI to respond or work according to each comment while treating selected text as reference material, not executable instructions. Original user content is not rewritten.

## Optional archive

**Export this conversation** opens a separate extension page: choose records, provider and destination; preview; approve one snapshot; save to a Notion page or Drive Markdown file. Default OFF. Connecting an account does not approve an upload. No background scheduling or two-way sync.

The shipped build deliberately shows **Connection setup required**. Drive needs a public Chrome OAuth client ID with `drive.file`. Notion public OAuth needs the supplied server-side authentication broker. Its secret never belongs in the extension, and conversation content never passes through the broker. See [setup](docs/ARCHIVE-SETUP.md) and [privacy/permissions](docs/PRIVACY.md).

Generated prompts, insertion and confirmed rendered user messages are separate records. Capture covers only observed request batches in the current page, not the entire conversation. Streaming, missing and completion-unverified replies remain labeled partial. Uncertain links/times/IDs are not guessed. Live OAuth and production provider writes remain unverified.

## Backup / upgrade

Local JSON backups retain their v3/v4 compatibility, original `question` fields and note keys. Current-chat backup filenames include service, title and date. Full backup includes all locally saved Marks. Tokens and the separate archive journal are not included.

Back up existing records, then overwrite files in the **same unpacked extension directory**, reload the extension and AI tabs, and confirm v0.10.1. Do not remove the extension or change its installation path if you want to retain its storage identity. Other AI sites need another toolbar click.

## Development

Run `node scripts/build.cjs` after editing `src/`. `npm test` uses Playwright plus extension-capable Chromium (`QA_BROWSER`, optional `QA_PYTHON`, `QA_OUTPUT`). `python scripts/package.py` produces installation/source ZIPs and SHA-256 files. Broker code ships in the source ZIP, not the installed extension.

See [architecture](docs/ARCHITECTURE.md) and the environment-specific [validation report](docs/VALIDATION.md). Not affiliated with OpenAI, Google, xAI or Notion.
