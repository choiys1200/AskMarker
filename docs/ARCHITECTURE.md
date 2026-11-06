# Qubble 아키텍처

현재 기준: v0.12.0. Qubble은 AI 답변의 원문과 질문·코멘트를 연결해 로컬에 보관하고, 사용자가 선택한 Q들을 후속 프롬프트로 만드는 Chrome/Edge 확장입니다.

## 모듈 경계

| 영역 | 책임 | 경계 |
|---|---|---|
| `src/domain/notes.js`, `prompt.js`, `backup.js` | 질문 유효성·저장 키, 정확한 프롬프트 쌍, 백업 투영 | 화면 좌표와 외부 전송을 소유하지 않음 |
| `src/domain/appearance.js`, `colors.js`, `theme.js` | 글꼴/크기·팔레트·대비 색상 값 | 질문·선택 상태를 읽거나 쓰지 않음 |
| `src/storage/queue.js`, `prompt-choices.js` | 쓰기 순서, 프롬프트 포함 상태, 여러 탭 동기화 | 원문 DOM을 변경하지 않음 |
| `src/platform/source.js`, `selectors.js` | 선택 허용, 원문 식별·복원, 본문 아래 배치 | 화면 설정을 저장하지 않음 |
| `src/platform/composer.js`, `composer-sites.js` | 서비스별 입력창 인식, 기존 글 보존, 중복 방지, 삽입 확인 | 메시지 자동 전송 없음 |
| `src/ui/shell.html`, `shell.js`, `base.css`, `panel.css` | 정적인 패널 구조·스타일 | 핵심 데이터 처리 없음 |
| `src/ui/panel.js`, `motion.js`, `dock.js` | 열기/접기/숨기기, 전환·포커스, 작은 메뉴 이동 | 질문·초안의 소유권을 바꾸지 않음 |
| `src/ui/cards.js`, `appearance.js`, `language.js`, `theme.js` | 카드와 사용자 동작 콜백, 표시 설정·언어 적용 | 카드가 저장소에 직접 질문을 쓰지 않음 |
| `src/app.js` | 모듈 조립, 작성·저장·취소, 읽기 모드, 화면 간 동기화 | 각 모듈의 공개 API로 연결 |

## 현재 화면과 동작

메인 패널은 읽기 모드 → 프롬프트 만들기/모아서 입력/복사 → 질문 목록 순서입니다. 설정·기록 관리·도움말과 각 Q의 색상 팔레트는 기본으로 접힙니다. 드래그 후 작은 **코멘트 추가** 버튼을 눌러야 작성창이 열립니다.

`motion.js`는 160ms 전환과 접이식 영역만 관리합니다. 닫기 시작 즉시 `inert`/`aria-hidden`을 적용하고 전환 후 `hidden`을 적용합니다. 다시 열면 이전 닫기 타이머를 취소합니다. 접이식 영역은 CSS grid 높이/투명도를 전환하며 Escape로 닫고 버튼에 포커스를 돌립니다. `prefers-reduced-motion`은 애니메이션을 생략합니다.

읽기 모드·패널 표시·초안·저장 기록·활성 색상 대상·프롬프트 포함 여부는 별도 상태입니다. 빈 초안을 취소하면 그 초안의 표시만 제거합니다. 모드 OFF나 패널 접기는 기록을 삭제하지 않습니다. 입력 어댑터가 실제 삽입 결과를 확인한 뒤 전달된 묶음만 선택 해제하며 복사·취소·실패에서는 선택을 유지합니다.

## 원문 연결과 표시 설정

원문은 화면 좌표 대신 메시지 식별 정보·정확한 텍스트·오프셋으로 찾습니다. 근거가 부족하면 목록에 남기고 다른 문장에 임의 연결하지 않습니다. 말풍선은 문서 흐름 안에 두며, 코드나 편집 가능한 답변 박스에서는 박스 아래에 배치해 원래 편집기 내용을 오염시키지 않습니다.

글꼴은 로컬/시스템 글꼴만 사용하며 코드 글꼴을 유지합니다. UI 크기는 시스템/브라우저 기본이 기본값이고 Custom은 80–160%입니다. 포인터는 클릭을 가로채지 않는 반투명 방사형 표시입니다. 전체 테마는 마지막 선택 색상을 사용하고 각 Q는 독립된 저장 색상을 유지합니다. 새 Q의 기본색은 보라색이며 색이 없는 오래된 기록의 노랑 fallback은 보존합니다.

한국어가 기본이며 영어를 선택할 수 있습니다. 언어 변경은 제품 UI 라벨에만 적용하고 원문·질문·사용자가 편집한 프롬프트는 번역하거나 다시 쓰지 않습니다.

## 선택적 아카이브

| 모듈 | 책임 |
|---|---|
| `src/archive/adapters.js`, `capture.js` | 서비스별 공개 DOM과 대화 범위, 생성/삽입/전송 증거·답변 관찰 |
| `src/archive/document.js` | 승인할 스냅샷의 Markdown 변환 |
| `src/archive/page.js`, `archive.html/css` | 별도 확장 화면의 항목 선택·미리보기·대상·승인 |
| `src/archive/worker.js` | 발신자 검증, 사용자 시작 OAuth, worker 전용 세션 토큰 |
| `src/archive/jobs.js` | 고정 스냅샷·원격 식별자, 중복 방지, 취소 세대, 수동 재시도 |
| `src/archive/google-drive-provider.js`, `notion-provider.js` | 각 서비스 API와 응답 유실 시 원격 결과 대조 |
| `src/archive/http.js` | 본문·토큰을 노출하지 않는 오류 분류 |
| `backend/notion-auth/server.cjs` | 서버 secret을 사용한 단회 인증 교환; 대화 본문을 받지 않음 |

기본 OFF입니다. 계정 연결과 업로드 승인은 별도이고, 콘텐츠 스크립트는 OAuth/외부 저장 명령을 실행할 수 없습니다. 외부 저장은 `archive.html`에서 사용자가 선택한 스냅샷을 승인한 경우에만 진행합니다. 전체 과거 대화를 순회하지 않으며, 부분 관찰을 전체 대화로 표시하지 않습니다. [연결 설정](ARCHIVE-SETUP.md)과 [개인정보·권한](PRIVACY.md)을 참고하세요.

## 저장 호환성과 빌드

저장 키·백업 형식·기존 원문 인덱스·아카이브 중복 방지 식별자는 유지합니다. 구체적인 예외는 [호환성 식별자](COMPATIBILITY.md)에 정리했습니다. 표시 전용 모듈의 수정이 데이터 마이그레이션을 일으키지 않습니다.

```sh
node scripts/build.cjs
node scripts/build.cjs --check
npm test
python scripts/package.py
```

`content.js`, `background.js`, `archive.js`는 `src/`에서 만든 배포 번들이며 직접 편집하지 않습니다. CSP는 로컬 번들을 실행합니다. 핵심 로컬 기능은 외부 서버가 필요하지 않고 선택적 아카이브만 별도의 인증/API를 사용합니다. 설치·소스 ZIP과 SHA-256을 `releases/`에 만듭니다.

[현재 검증](VALIDATION.md) · [과거 구조 변경 이력](history/ARCHITECTURE-THROUGH-0.11.3.md)
