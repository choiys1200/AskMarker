# AskMarker 0.11.3 검증

2026-10-23 Asia/Seoul. selection-action 검증 모음 통과.

- 밝은/어두운 화면과 hover에서 불투명 버튼 배경·그림자·기존 높이·원문 아래 6px 간격 확인.
- 10회 드래그와 10회 추가/취소/재선택, 클릭·키보드 열기, Esc·바깥 클릭, 초안 보존, 패널 접기, 스크롤·크기 변경·대화 전환 확인.
- 버튼 CSS/배치 소스를 v0.11.1 배포 소스와 대조해 일치를 확인했습니다. 차분한 작성 말풍선·테마 소스도 v0.11.1과 일치합니다.

실제 unpacked MV3 + 격리 Chromium + 합성 AI HTML 검증입니다. 사용자 Chrome과 실제 AI 서비스 화면은 미검증입니다.

[실행 결과](validation/v0.11.3/summary.json) · [변경 내역](CHANGES-0.11.3.md)

아래는 이전 버전의 검증 이력입니다.

# AskMarker 0.11.2 검증

2026-10-23 Asia/Seoul. 이번 변경과 관련된 selection-action, theme-q 2개 검증 모음 통과.

- 코멘트 추가 버튼: 밝은/어두운 화면 및 마우스 hover에서 배경 알파 0, 그림자/흐림 없음, 글자 opacity 1 확인. 버튼은 더 작아지고 선택 영역 아래 간격은 2px입니다.
- 10회 드래그·선택 유지와 10회 추가·취소·재선택, 클릭/Enter로 작성창 열기, Esc/바깥 클릭 해제, 스크롤·창 크기·대화 전환·초안 독립성 확인.
- 8색 테마와 차분한 작성 말풍선, Q 표기·프롬프트·기존 기록/백업 호환 검증 유지.

실제 unpacked MV3를 격리 Chromium에서 실행했으며 페이지는 합성 HTML입니다. 사용자의 실제 Chrome과 실제 ChatGPT/Gemini/Grok 사이트는 확인하지 않았습니다. 화면 캡처는 로컬 work 폴더에만 저장합니다.

[실행 결과와 runtime SHA-256](validation/v0.11.2/summary.json) · [변경 내역](CHANGES-0.11.2.md)

```powershell
node scripts/build.cjs --check
node scripts/test.cjs selection-action theme-q
```

아래는 이전 버전의 검증 이력입니다.

# AskMarker 0.11.1 검증

2026-10-23 Asia/Seoul. 변경에 관련된 6개 모음 통과: theme-q, appearance-delivery, selection-action, reading-mode, backup, module-contract.

- 8색 × 밝은/어두운 화면에서 3px 원색 테두리, 색조를 낮춘 배경, 본체와 동일한 말풍선 꼬리, 1px 입력란 경계 확인.
- 본문·입력·설명·placeholder 색 대비 4.5:1 이상, 카드와 입력 글자 opacity 1. 브라우저 다크 모드와 페이지 테마 class 모두 확인.
- 색상 변경 중 초안 내용·원문 연결 유지. 전역 UI가 파랑이어도 저장된 핑크 Q의 수정 화면은 핑크 색조 유지. 목록과 본문 아래 편집을 각각 확인.
- 10회 반복 드래그/취소/재선택, 초안 모드 전환, 저장·삭제·스크롤·크기 변경·재렌더·새로고침, 기존 프롬프트 보존·중복 방지·선택 해제, 구 JSON 백업 호환 확인.
- 설치 ZIP을 새 폴더에 풀어 theme-q를 재실행하여 통과했고 최종 실행 파일과 바이트 일치를 확인했습니다.
- v0.11.0 전체 26개 결과는 아래 과거 이력입니다. 이번 0.11.1에서 전체 26개를 재실행한 것으로 표시하지 않습니다.

격리 Chromium에 실제 unpacked MV3 확장을 로드했으며 AI 페이지는 합성 HTML입니다. 실제 사용자 Chrome·실제 ChatGPT/Gemini/Grok 사이트·OAuth/API 업로드는 확인하지 않았습니다. 스크린샷은 로컬 work 폴더에만 보관합니다.

[실행 결과와 runtime SHA-256](validation/v0.11.1/summary.json) · [변경 내역](CHANGES-0.11.1.md)

```powershell
node scripts/build.cjs --check
node scripts/test.cjs theme-q appearance-delivery selection-action reading-mode backup module-contract
```

아래는 이전 버전의 검증 이력입니다.

# AskMarker 0.11.0 검증

2026-10-20 Asia/Seoul. **전체 26개 검증 모음 통과.** 마지막 브라우저 다크 모드 CSS 보완 후 `theme-q`와 `appearance-delivery`를 다시 통과했습니다. 기존 0.10.1의 입력 후 안내 위치·1.5초 표시도 유지합니다.

## 이번 변경 확인

- 8색 × 밝은/어두운 화면에서 주요 버튼·읽기 스위치·체크·포커스·배경·안내 테마 적용.
- 작성 카드 3px 선택 색상 테두리, 배경 알파 0.9, 카드/입력 글자 opacity 1. 투명 입력란으로 배경 알파 중첩 방지.
- 8색의 밝은/어두운 배경에서 본문 글자 대비 최소 4.5:1. 사이트 테마 class가 없는 브라우저 다크 모드도 확인.
- 색 변경 중 초안 DOM·입력 내용·원문 연결 유지. 다른 Q 선택 시 전역 테마 유지, 항목별 저장 색 독립.
- 새로고침 후 테마 복원, 내보내기 창에서 같은 테마 동기화.
- 한국어·영어 목록/프롬프트/마지막 지시문/내보내기 문서가 Q1·Q2 사용. 코멘트 추가·내 코멘트·모아서 입력 유지.
- 실제 사용자 데이터에 포함된 `Mark 1` 문자열은 다시 쓰지 않음. 기존 원문·question/markIds 키·JSON questions 구조와 구 프롬프트 중복 인식 유지.
- 반복 드래그/취소, 코드·메일 박스, 저장/수정/삭제, 입력 보존·선택 해제, 백업 v3/v4, 아카이브 취소/재시도 등 기존 검증 모두 통과.

## 환경과 한계

실제 unpacked Manifest V3를 **격리 Chromium 프로필과 합성 AI HTML**에 로드했습니다. API·OAuth upstream은 모의 응답입니다. **사용자의 실제 Chrome·실제 ChatGPT/Gemini/Grok 화면·실제 OAuth/API 저장은 이번에 확인하지 않았습니다.** 로컬 스크린샷은 QA 폴더에만 보관하며 Git/ZIP에는 넣지 않습니다.

색상/대비 계산은 순수 모듈, CSS 토큰 적용은 표시 전용 모듈로 분리합니다. 외부 권한·인증 서버·로컬 저장 형식은 추가 변경하지 않았습니다.

[26개 모음 결과·runtime SHA-256](validation/v0.11.0/summary.json) · [색상/Q 검증](validation/v0.11.0/theme-q-test.json)

```powershell
node scripts/build.cjs --check
node scripts/test.cjs
node scripts/test.cjs theme-q appearance-delivery
```

설치 ZIP을 새 폴더에 풀어 `theme-q`, `backup` 2개 모음도 통과했습니다. 최종 패키지는 이 실행 파일의 SHA-256과 대조했습니다. 실제 서비스 검증을 의미하지 않습니다.

아래는 이전 버전의 검증 이력입니다.

# AskMarker 0.10.1 검증

2026-10-20: 안내 위치·1.5초 표시·클릭 통과를 포함한 appearance-delivery, language, archive-browser 3개 모음 통과. 합성 HTML + 실제 unpacked MV3 + 격리 Chromium 검증이며 실제 AI 사이트는 미검증입니다. [실행 결과와 SHA-256](validation/v0.10.1/summary.json).

아래는 0.10.0의 이전 검증 이력입니다.

# AskMarker 0.10.0 검증 보고서

검증 날짜: 2026-10-19, Asia/Seoul. **기존 22개 + 신규 아카이브 3개 = 25개 검증 모음 통과.** 전체 실행 후 업로드 중 OFF, 저장 취소 경합, 세션 토큰 경합을 보완하고 아카이브 3개 모음을 다시 통과했습니다. 설치·소스 ZIP의 실행 파일은 이 최종 빌드와 바이트 단위로 대조합니다.

## 검증 환경 구분

| 구분 | 수행 내용 | 실제 서비스 여부 |
|---|---|---|
| 순수 Node | Mark/프롬프트, 백업, job state, 오류·응답 유실·중복·재시작 | 모의 API/저장소 |
| Chromium + 합성 DOM | 실제 unpacked MV3, 마우스/키보드, storage, 파일 다운로드·가져오기, 확장 미리보기 화면 | 실제 AI 페이지 아님 |
| 아카이브 UI | 실제 확장 페이지·서비스 워커, 선택/승인/결과 링크, OFF, token 경계 | worker fetch를 테스트 응답으로 대체 |
| 인증 브로커 | 실제 로컬 HTTP 요청, state/verifier/redirect/단회 handoff | Notion upstream은 테스트 응답 |
| 사용자 Chrome + 실제 AI | 수행 안 함 | 미검증 |
| Google/Notion OAuth·원격 문서 | 자격증명 없음, 승인·업로드 수행 안 함 | 미검증 |

테스트 화면의 ‘저장 확인됨’과 문서 링크는 **시뮬레이션 API 응답**에 대한 UI 검증입니다. 실제 클라우드 저장 성공 증거가 아닙니다. 스크린샷은 로컬 QA 폴더에만 보관하며 Git/배포 ZIP에 넣지 않았습니다.

## 확인한 항목

- 한국어·영어 Mark/코멘트 명칭, 원문 그대로 보존, 맨 앞 안내 제거·마지막 한 번만 전체 지시, 빈 항목 제외.
- 반복 드래그/취소/재선택, 여러 초안의 원문 소유권, 본문 아래 말풍선, 코드·메일 박스, 색/폰트/배율·접기·숨기기·재렌더링.
- 원래 입력 보존, 삽입 후 선택 해제, 중복 삽입 방지, 실제 자동 전송 없음.
- 구 v0.2 note와 JSON v3/v4 호환, 백업 왕복, 기록·체크·설정 유지, 확장 업데이트 시 ID/데이터 보존.
- 아카이브 OFF/미설정, 사용자가 선택한 Mark/요청 묶음 미리보기, 제목·불확실 정보 보완, 별도 승인, 대상·결과 링크.
- 생성/삽입/실제 화면 메시지를 구분. 입력창 비움만으로 전송을 기록하지 않음. 삽입 후 수정된 실제 메시지와 관찰한 답변 연결.
- 대화 전환·분기 query·중첩 서비스 DOM·숨김·가상화된 사용자 메시지·답변 변형·스트리밍 표시. 불명확한 답변은 Mark별로 분해하지 않음.
- 긴 Unicode 원문, Markdown 구조 위장 방지, Notion 청크.
- 인증 취소/미설정 경로, 오류 상태 401/403/429/5xx/오프라인 분리, 응답 본문/토큰을 오류에 노출하지 않음.
- 동시 클릭·동일 snapshot 재시도·worker 상태 재생성에서 중복 생성 방지.
- Drive 생성 응답 유실 → 사전 ID 조회, Notion 생성/append 유실 → 표식/정확한 접두 내용 대조. 확인 불가 시 새 쓰기 차단.
- OFF/연결 해제/로컬 삭제 이후 승인 세대 무효화. 예전 미리보기 거부. 업로드 중에도 OFF 사용 가능·요청 abort.
- 로컬 브로커의 잘못된 verifier/재사용 거부, 고정 redirect, 본문 API 없음.

## 남은 검증 / 제한

- 실제 서비스 DOM은 바뀔 수 있습니다. ChatGPT/Gemini/Grok/Claude adapter는 이번에 합성 구조에서 확인했으며 운영 화면 호환을 보장하지 않습니다. 인식되지 않으면 확인 불가로 남깁니다.
- tab reload 이후 이미 진행 중이던 응답 수집은 자동 복구하지 않습니다. 이전 관찰 journal만 남으며 새로운 요청부터 다시 관찰합니다.
- 대화 ID가 없는 주소는 전송 확인을 하지 않습니다. 숨긴 메시지·서버 시각·첨부/OCR·숨은 분기·전체 과거 이력은 수집하지 않습니다.
- 로컬 관찰 journal은 약 2 MB까지 새 관찰을 보존합니다. 넘으면 원문을 잘라 저장하지 않고 이후 수집 누락을 알립니다. 내보내기 snapshot은 2 MB를 넘으면 거부합니다. 일반 Chrome 저장 용량 한계도 적용됩니다.
- Drive UI는 앱에 허용된 폴더 목록/새 폴더만 지원합니다. Google Picker로 임의 기존 폴더를 허용하는 기능은 포함하지 않습니다.
- Notion/Drive 권한·OAuth client·조직 정책·실제 API 필드/쿼터·재인증·최종 문서 렌더링은 실제 계정 설정 후 추가 확인이 필요합니다.
- Notion 브로커는 단일 프로세스 인증 교환 구현입니다. 배포·TLS·프록시 로그 차단·운영 보안 검토는 수행하지 않았습니다.
- 이미 원격 서버에 도착한 쓰기는 취소 직후 반영될 수 있습니다. 취소는 외부 문서 삭제가 아닙니다.

## 실행

```powershell
node scripts/build.cjs
node scripts/test.cjs
node scripts/test.cjs archive-browser archive-contract archive-adapters
```

`QA_BROWSER`는 Chromium 1243, Node는 Codex bundled runtime, `QA_PYTHON`은 bundled Python을 사용했습니다. 테스트는 임시 프로필/모의 데이터로 실행했으며 사용자 Chrome 프로필을 변경하지 않았습니다.

## 결과 파일

[25개 모음 요약·실행 파일 SHA-256](validation/v0.10.0/summary.json)

- [appearance-delivery-test](validation/v0.10.0/appearance-delivery-test.json)
- [archive-adapters-test](validation/v0.10.0/archive-adapters-test.json)
- [archive-browser-test](validation/v0.10.0/archive-browser-test.json)
- [archive-contract-test](validation/v0.10.0/archive-contract-test.json)
- [automation-test](validation/v0.10.0/automation-test.json)
- [backup-test](validation/v0.10.0/backup-test.json)
- [boxed-content-test](validation/v0.10.0/boxed-content-test.json)
- [bubble-flow-test](validation/v0.10.0/bubble-flow-test.json)
- [cross-site-composer-test](validation/v0.10.0/cross-site-composer-test.json)
- [dock-text-size-test](validation/v0.10.0/dock-text-size-test.json)
- [edge-test](validation/v0.10.0/edge-test.json)
- [extension-test](validation/v0.10.0/extension-test.json)
- [generic-sites-test](validation/v0.10.0/generic-sites-test.json)
- [icon-upgrade-test](validation/v0.10.0/icon-upgrade-test.json)
- [interaction-test](validation/v0.10.0/interaction-test.json)
- [language-test](validation/v0.10.0/language-test.json)
- [menu-visibility-test](validation/v0.10.0/menu-visibility-test.json)
- [mock-test](validation/v0.10.0/mock-test.json)
- [modern-chatgpt-test](validation/v0.10.0/modern-chatgpt-test.json)
- [module-contract-test](validation/v0.10.0/module-contract-test.json)
- [prompt-selection-test](validation/v0.10.0/prompt-selection-test.json)
- [reading-mode-test](validation/v0.10.0/reading-mode-test.json)
- [root-host-test](validation/v0.10.0/root-host-test.json)
- [selection-action-test](validation/v0.10.0/selection-action-test.json)
- [selection-compatibility-test](validation/v0.10.0/selection-compatibility-test.json)

## 설치 ZIP 검증

설치 ZIP을 새 폴더에 풀어 최종 runtime SHA-256을 대조한 뒤 archive-adapters, archive-browser, archive-contract, backup, language 5개 모음을 추가 통과했습니다. 마지막 초기화 경합 보완까지 포함한 설치 파일을 검증했습니다. 이후 결과 문서만 갱신해 다시 포장했으며 실행 파일은 동일합니다. OAuth 취소/거부 및 untrusted sender 차단·worker-only token 검증도 별도 통과했습니다.
