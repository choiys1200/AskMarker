# 0.10.0 변경 내역

## 기준 확인 / 2026-10-19 KST

- 실제 로컬 저장소: `outputs/askmark`, remote `choiys1200/AskMarker`.
- 시작 시 Git 추적 파일의 diff 없음. 이전 release ZIP/폴더의 untracked 항목은 보존.
- GitHub main: `24fdf8b0a9a0c3bbabc6e1cc6d71ea0110b379f3`, tree `8f61582cd4be19182f2003f772a21cefa284adb0`. 조회된 브랜치는 main 하나.
- runtime/source/test/build 관련 55개 파일의 원격 Git blob SHA와 로컬 실제 바이트가 모두 일치. 버전 번호만으로 판단하지 않음.
- 별도 v0.9.2는 작업 폴더·Downloads·Documents/Codex에서 찾지 못했고, 사용자가 Git 최신 기준으로 진행하도록 지시함. 임의 reset/checkout/pull/merge 없이 수정.
- GitHub push, 스토어 제출, OAuth 승인, 실제 credential 생성, 가입, 서버 배포는 수행하지 않음.

## 표현 및 호환성

- 한국어/영어 UI·툴팁·도움말을 Mark·코멘트 중심으로 변경. `모아서 입력` 유지.
- 생성 프롬프트는 `Mark N → 선택한 내용 → 내 코멘트`, 전체 지시는 마지막 한 번. 원문/사용자 입력은 다시 쓰지 않음.
- 기존 `qb:note:`, `question`, JSON v3/v4의 `questions` 스키마를 유지. 기존 형식으로 이미 삽입된 프롬프트도 중복 검사.
- 프롬프트 삽입은 기존 글 뒤에 추가. 사용자가 검토·수정하고 직접 전송. 성공한 삽입의 체크 해제 유지.

## 독립 아카이브

- 공개 DOM adapter, 선택적 capture/local journal, 순수 Markdown projection, trusted extension preview, durable job/receipt, NotionProvider, GoogleDriveProvider, OAuth broker 분리.
- 아카이브 기본 OFF. 계정 연결과 업로드 승인을 분리. 자동 저장/양방향 동기화 없음.
- 사용자 선택 Mark/요청 묶음만 저장. 생성/삽입/확인된 전송/화면 답변을 분리하고 부분 수집·확인 불가를 표시.
- Drive 사전 ID, Notion UUID 표식·본문 접두 대조로 응답 유실을 복구. 불확실한 Notion 쓰기는 무조건 재생성/append 하지 않음.
- 세션 전용 토큰, 스냅샷 승인 무효화, OFF/삭제/연결 해제 후 후속 요청 차단.
- 설치 ZIP은 미설정 상태. 실제 서비스 운영에는 별도 설정·승인·Notion 인증 서버가 필요.

제한과 실행 방법은 [아카이브 설정](ARCHIVE-SETUP.md), 데이터 범위는 [개인정보 안내](PRIVACY.md), 검증 결과는 [VALIDATION](VALIDATION.md)에 구분했습니다.
