# Qubble public launch kit

**Status:** draft materials; not yet posted. Product: [Qubble](https://github.com/choiys1200/AskMarker) v0.12.0.

## Positioning

**Korean:** 질문 때문에 읽던 흐름을 끊지 마세요.

**English:** Don't interrupt your reading to ask a question.

**Tagline:** Read. Mark. Ask again.

Core workflow: **Read → Mark → Collect → Ask again**. This is not just a highlighter or an instant multi-quote button. Users place question bubbles beside exact passages, continue reading, preserve those quote–question pairs and selectively assemble a follow-up prompt.

Claims to avoid:
- Do not claim every AI website is fully supported. ChatGPT has dedicated integration; other sites have general adapters with variable compatibility.
- Do not claim live services passed tests based on synthetic fixtures.
- Do not claim Notion/Drive sync or export works out of the box; distributed OAuth configuration is empty.
- Do not imply affiliation, endorsement or adoption by OpenAI.

## Launch gate — complete before public posting

- [ ] Install the packaged build in a fresh Chrome profile and a fresh Edge profile.
- [ ] On the **real current ChatGPT website**, test: enable mode; select a passage; add a question; add a second; navigate away/back; reload; edit; select/deselect; append; confirm no automatic send; verify no duplicate append.
- [ ] On real Gemini/Grok sites, test only features to be advertised, and document site-specific limitations.
- [ ] Verify fresh-install instructions from ZIP, not only upgrade flows.
- [ ] Capture a 20–30-second **real browser recording** containing no private/enterprise conversation content. Clearly label synthetic demos if used.
- [ ] Add the recording or GIF near the top of both READMEs; remove the demo placeholder text.
- [ ] Check readable contrast, keyboard focus, reduced-motion and dark/light modes at common browser sizes.
- [ ] Confirm the current license/permissions and choose an explicit LICENSE before labeling the project “open source” in promotional posts.
- [ ] Set GitHub repository description to Qubble and add discoverability topics (suggested: `chatgpt`, `chrome-extension`, `annotation`, `productivity`, `note-taking`).
- [ ] Confirm latest release, SHA-256 and README install ZIP match.
- [ ] Optionally list in Chrome Web Store; developer-mode ZIP install is more friction for nontechnical users.

## Video storyboard (25 seconds)

| Time | What to show | Overlay |
| --- | --- | --- |
| 0–4 s | Long answer with a confusing passage; pointer pauses | Don't interrupt your reading to ask a question. |
| 4–9 s | Highlight sentence → click Add comment → enter question in inline bubble | Mark it right where it appears |
| 9–14 s | Continue reading → second inline question | Keep reading |
| 14–19 s | Sidebar shows two quote–question pairs; choose one or both | Collect only what matters |
| 19–25 s | Click Insert selected; see structured prompt in composer; do not submit | Ask again, with context |

Record the real v0.12.0 extension, not a simulated product UI, for public launch.

## GeekNews — Korean draft

**Title:** Qubble - AI 답변을 읽으며 질문을 남기고 모아서 다시 묻는 확장

**Body:**

긴 ChatGPT 답변을 읽다가 이상하거나 이해되지 않는 문장이 나와도, 바로 질문하면 읽던 흐름이 끊깁니다. 끝까지 읽고 질문하려면 어떤 문장이 궁금했는지 다시 찾아야 했습니다.

그래서 Qubble을 만들었습니다. 문장을 드래그해 그 아래 질문을 남기고 계속 읽을 수 있습니다. 질문은 원문과 함께 기록되고 오른쪽 목록에 모입니다. 다 읽고 나면 필요한 질문만 선택해 하나의 후속 프롬프트로 입력하거나 복사할 수 있습니다.

Chrome·Edge에서 사용할 수 있는 Manifest V3 확장입니다. 기본 기록은 로컬에 저장되며, AI API 키나 별도 계정은 필요 없습니다. 현재 ZIP을 개발자 모드로 설치해야 하고, 사이트별 DOM 호환성 제약이 있습니다.

실제로 읽으면서 질문을 남기는 방식이 편한지, 기존 ChatGPT의 선택/인용 방식과 비교해 불편한 부분이 무엇인지 피드백을 받고 싶습니다.

GitHub: https://github.com/choiys1200/AskMarker

[실사용 GIF 링크 추가]

## Reddit r/SideProject — English draft

**Title:** I built Qubble to save questions *while* reading long ChatGPT replies

I kept running into the same problem: a long AI answer would contain a claim I wanted to challenge or clarify, but stopping to ask immediately broke my reading flow. Waiting until the end meant losing the exact context.

Qubble is a Chromium extension that lets you highlight a passage, leave a question in a bubble right beneath it, keep reading, and then choose which saved question–quote pairs to put into one follow-up prompt.

The core notes are stored locally, no API key is needed, and it does not send your message for you. ChatGPT has the dedicated integration; other AI pages use more limited/general adapters. Installation currently requires loading an unpacked extension.

I'd appreciate feedback from people who read technical or research-heavy AI replies: would this improve your workflow, and what feels awkward?

GitHub: https://github.com/choiys1200/AskMarker

[Add real demo recording link]

Check the community's current self-promotion rules before posting. Do not solicit vote exchanges.

## Hacker News — author notes, not a ready-to-publish AI-written post

Hacker News asks Show HN authors to personally explain what they made, how/why, and be available to respond. HN guidelines prohibit AI-generated comments/posts. Draft the final submission yourself.

Possible factual title seed: `Show HN: Qubble – leave inline questions while reading ChatGPT answers`

Points to describe in your own words: original personal frustration; difference from instant quote-to-composer; inline notes remain while reading; how the anchor and local storage work; current installation friction; which live platforms you actually tested.

Official Show HN guidance: https://news.ycombinator.com/showhn.html
Posting guidelines: https://news.ycombinator.com/newsguidelines.html

## OpenAI — product feedback proposal

**Suggested subject:** Native inline questions for long ChatGPT answers — working Qubble prototype

When reading a long ChatGPT answer, I often encounter a sentence I want to clarify or challenge. Asking immediately interrupts the reading experience; waiting until the end makes it hard to remember the precise passage.

I built Qubble, a browser extension that experiments with a different reading workflow: select a passage, attach an inline question beneath it, continue reading, and later select multiple saved questions to assemble a contextual follow-up prompt. The extension preserves the original quotes and requires the user to review and send the final message.

I believe a native version could improve long-form research, learning and technical review. I would welcome the product team's evaluation of the interaction rather than an assumption that the extension itself should be integrated.

Working repository: https://github.com/choiys1200/AskMarker

[Insert real demo link and verified feedback/usage data]

Related existing community request: https://community.openai.com/t/feature-request-inline-anchored-annotations-and-contextual-threads-for-chatgpt-responses/1390620

**Routes:** Discuss constructively in the existing feature request or submit through https://help.openai.com (bottom-right support chat). Neither guarantees a product-team review, implementation or compensation. Do not claim official OpenAI involvement.

## Metrics and decision points

Capture before/after publication by date/channel:
- GitHub Stars, unique views and referrers (Insights → Traffic)
- release downloads if reliably measurable
- install/test reports, issues, retention from voluntary beta testers
- feedback specifically about *reading continuity*, inline bubbles and prompt reassembly

Suggested first target: 10 real testers and 3 substantive usability reports; 100 Stars is an aspirational milestone, not a forecast. If visitors rise but installation/use does not, focus on install friction and demos; if use begins but retention is low, focus on the question workflow.

## Publishing sequence

1. Finish the live-site smoke test and real 25-second recording.
2. Merge README improvements and update repository metadata.
3. Publish to GeekNews Show GN, reply to actual questions, record feedback.
4. Fix blocking issues and add English-language demo/UX where needed.
5. Publish to r/SideProject; then a self-authored Show HN submission if it is easy to try.
6. Submit OpenAI feedback with the working demo and **observed** user feedback.

No posts, support requests or external promotions are submitted by this document.
