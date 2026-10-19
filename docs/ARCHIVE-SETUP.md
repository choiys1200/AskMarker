# AskMarker 0.10.0 아카이브 설정 / Archive setup

배포 ZIP의 OAuth 설정은 비어 있습니다. 로컬 Mark·코멘트·프롬프트·JSON 백업은 그대로 사용할 수 있습니다. **실제 OAuth 승인, 자격증명 발급, 서버 배포는 수행하지 않았습니다.** 연결 버튼은 미설정 상태를 성공으로 표시하지 않습니다.

## 사용 흐름

1. 원래 AI 대화의 오른쪽 패널에서 **이 대화 내보내기**를 엽니다.
2. 처음에는 **아카이브 OFF**입니다. 켜면 이후 생성·삽입한 요청과 연결 가능한 화면 메시지를 로컬에 기록합니다. 이미 지나간 전송은 추정하지 않습니다. 기록을 활성화한 뒤 원래 대화로 돌아가 코멘트를 모아 입력하고 직접 전송하세요.
3. 다시 내보내기를 열어 포함할 Mark와 요청 묶음을 선택합니다. 요청 묶음은 기본 미선택입니다. 묶음에는 생성 프롬프트·삽입·확인된 사용자 메시지·관찰한 답변이 함께 들어갑니다.
4. Notion / Drive 선택 → 계정 연결 → 저장 대상 불러오기 → 대상 선택. **연결만으로 본문은 전송되지 않습니다.**
5. 제목과 시각·연결 관계 설명을 보완할 수 있습니다. 보완한 정보는 사용자 입력으로 구분하며 전송 증거로 취급하지 않습니다.
6. 미리보기를 만든 뒤 본문·대상을 확인하고 승인 체크 → 저장. 저장 결과가 확인되면 문서 링크를 표시합니다.
7. 오류는 자동 재시도하지 않습니다. **시도 기록 불러오기**에서 같은 스냅샷을 선택하고 재승인하면 먼저 원격 결과를 확인합니다. 브라우저 재시작 후에는 계정을 다시 연결해야 할 수 있습니다.

미리보기의 Markdown 본문은 읽기 전용입니다. Mark 코멘트는 원래 패널에서 수정하고 내보내기를 다시 여세요. 한 스냅샷의 선택 내용과 대상은 승인 이후 고정됩니다. 새 미리보기는 별도 문서가 되는 새 스냅샷입니다.

## Google Drive

개발자 또는 운영자가 다음 준비를 해야 합니다. 이 저장소에는 실제 client ID가 없습니다.

1. Google Cloud 프로젝트에서 Drive API와 OAuth 동의 화면을 설정합니다. 필요하다면 테스트 사용자를 등록합니다.
2. 설치된 확장 ID에 대응하는 **Chrome extension 유형 OAuth client ID**를 만듭니다. 확장 ID가 달라지면 이 설정도 달라집니다.
3. 범위는 `https://www.googleapis.com/auth/drive.file` **하나만** 사용합니다. 전체 Drive / Drive 읽기 권한은 요청하지 않습니다.
4. 소스 루트에서 다음을 실행한 뒤 빌드합니다. 값은 예시이며 secret이 아닙니다.

```powershell
node scripts/configure-archive.cjs "YOUR_PUBLIC_CLIENT_ID.apps.googleusercontent.com" ""
node scripts/build.cjs
```

5. 같은 설치 폴더의 확장을 새로고침하고, 사용자가 **계정 연결**을 눌러 권한과 OAuth를 승인합니다. Chrome Identity `getAuthToken`을 사용합니다.

### 폴더 선택과 MV3

이 버전은 번들된 네이티브 선택 목록을 사용합니다. `drive.file`로 **이미 앱에 허용된 폴더만** 표시합니다. 다른 폴더가 없으면 **내 Drive에 새 AskMarker 폴더 만들기**를 선택할 수 있습니다. 이 폴더도 본문 저장을 승인할 때만 생성됩니다. 다음번에는 만들어진 폴더를 목록에서 고를 수 있습니다.

임의의 기존 Drive 폴더 전체를 탐색하거나 폴더 ID 입력만으로 접근 권한을 얻지는 않습니다. 기존 폴더를 Picker로 새로 허용하는 별도 웹 연동은 이번 버전에 넣지 않았습니다. Google Picker의 원격 JS를 확장 페이지에 삽입하는 방식은 MV3의 번들 코드/CSP 제한과 맞지 않으므로 사용하지 않습니다. 이 제한을 없애려고 전체 Drive 권한을 추가하지 마세요.

문서는 선택 폴더 아래 `text/markdown` 파일로 저장합니다. Drive ID를 쓰기 전에 발급·저장하여 응답 유실 시 같은 ID를 조회/재사용합니다. 서버는 필요 없으며 본문은 확장 서비스 워커에서 Google API로 직접 갑니다.

## Notion

공개 OAuth의 client secret은 **확장에 포함할 수 없습니다.** `backend/notion-auth/server.cjs`에 최소 인증 브로커를 제공합니다. 실제 서버는 배포하지 않았습니다.

1. Notion에서 public connection을 만들고 필요한 페이지 콘텐츠 읽기·삽입 권한을 설정합니다. 실제 계정에 필요한 권한은 운영자가 확인해야 합니다.
2. redirect URI를 `https://YOUR-BROKER.example/callback`으로 등록합니다.
3. Node.js 22 이상 서버 환경에 다음 값을 설정합니다. secret은 서버의 비밀 관리 기능으로 전달하고 Git/ZIP/확장에 넣지 마세요.

```text
NOTION_CLIENT_ID=public-notion-client-id
NOTION_CLIENT_SECRET=server-only-secret
PUBLIC_ORIGIN=https://YOUR-BROKER.example
EXTENSION_ID=32-character-chrome-extension-id
PORT=8787
```

4. `node backend/notion-auth/server.cjs`는 `127.0.0.1:8787`에만 바인딩합니다. 운영자는 HTTPS reverse proxy를 구성해야 합니다. **콜백·교환 URL/본문/Authorization 헤더의 프록시·APM·접근 로그를 끄거나 완전히 마스킹하세요.** 이 코드 자체는 요청/토큰/본문을 로그로 남기지 않습니다.
5. 정확한 HTTPS origin을 확장에 공개 설정으로 넣고 빌드합니다.

```powershell
node scripts/configure-archive.cjs "YOUR_PUBLIC_CLIENT_ID.apps.googleusercontent.com" "https://YOUR-BROKER.example"
node scripts/build.cjs
```

Drive를 설정하지 않을 경우 첫 번째 인수를 빈 문자열로 줍니다. 설정 명령은 두 서비스 설정을 함께 지정하는 방식입니다. 기존 값을 유지하려면 둘 다 전달하세요.

6. 사용자가 확장의 **계정 연결**을 눌러 브로커 호스트 권한과 OAuth를 승인합니다. Notion 승인에서 공유한 페이지 중 저장할 상위 페이지를 목록에서 명시적으로 고릅니다.

### 브로커의 데이터 경로

브로커는 OAuth authorization code → Notion access token 교환만 합니다. **대화 제목·원문·코멘트·프롬프트·답변은 이 서버를 통과하거나 저장되지 않습니다.** 콘텐츠 API는 서비스 워커가 Notion에 직접 호출합니다.

state는 최대 10분, 교환할 access token과 단회 handoff는 최대 60초 동안 프로세스 메모리에만 존재합니다. 검증된 verifier로 한 번 교환한 즉시 삭제합니다. 브로커는 secret을 서버 환경에서 읽고, access token을 확장에 응답 본문으로 반환합니다. URL에는 access token을 넣지 않습니다. 리다이렉트에는 짧게 유효한 단회 교환 코드만 들어갑니다.

단일 프로세스용 구현입니다. 재시작 시 진행 중 인증은 실패하며 다시 연결해야 합니다. 다중 인스턴스·운영 모니터링·TLS·보안 운영은 별도 배포 작업입니다. 만료된 토큰은 자동 갱신하지 않으며 연결 해제 후 사용자 동작으로 재연결합니다. 이 서버는 conversation API나 본문 저장 기능을 제공하지 않습니다.

## 저장 결과·취소의 의미

- Notion은 스냅샷 UUID가 포함된 페이지 제목과 본문 표식을 사용합니다. 긴 내용은 Unicode 안전 조각으로 여러 번 이어 씁니다.
- 생성 응답이 유실되면 선택한 부모의 자식 페이지를 확인합니다. 확인할 수 없으면 **결과 확인 불가**로 멈추며 다시 만들지 않습니다.
- 본문 append 응답 유실도 실제 원격 블록과 정확한 접두 내용을 대조합니다. 부분/불확실한 결과는 수동 확인 상태로 남깁니다.
- OFF, 연결 해제, 로컬 삭제는 승인 세대를 바꾸고 진행 중 후속 요청을 취소합니다. 다른 탭의 예전 미리보기도 사용할 수 없습니다. 원래 대화에서 다시 열어 승인해야 합니다.
- 이미 서버가 받은 쓰기는 취소 직전에 반영됐을 수 있습니다. 취소는 원격 문서를 되돌리거나 삭제하지 않습니다. 외부 문서 삭제는 해당 서비스에서 직접 해야 합니다.
- 연결 해제는 이 확장의 세션 토큰을 제거합니다. 제공자 계정 자체의 앱 승인은 Notion/Google 계정 설정에서 별도로 철회할 수 있습니다.

## English operational summary

The distributed build has no real OAuth client configuration. Local annotations remain usable. Enable the archive explicitly; connect separately; select included Marks/request batches and a destination; review; approve that immutable snapshot; then save. No scheduled upload or two-way sync exists.

Drive uses Chrome Identity with `drive.file` only. Its bundled folder selector shows app-authorized folders and offers creation of a new AskMarker folder upon approved save. It does not embed Google Picker remote scripts or browse arbitrary Drive folders. Markdown goes directly to Google.

Notion requires the supplied Node 22+ HTTPS OAuth broker, public connection configuration and a server-only client secret. The broker exchanges authentication data only, never conversation content. Disable/redact proxy access and request-body logs. Its state/handoff storage is ephemeral, single-process and single-use. Content goes directly from the extension worker to Notion. Restart/expiry may require user-initiated reconnection.

Retries require the same approved snapshot and reconcile a durable remote ID or exact Notion marker/prefix. Unknown writes do not blindly create or append again. OFF/disconnect/local deletion revoke stale previews. Already-exported documents are not deleted. Live OAuth and live provider writes have not been validated in this delivery.

## 공식 문서

- [Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [Chrome Identity](https://developer.chrome.com/docs/extensions/reference/api/identity)
- [Drive pre-generated IDs](https://developers.google.com/workspace/drive/api/guides/create-file)
- [MV3 remote hosted code](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code)
- [Notion authorization](https://developers.notion.com/guides/get-started/authorization)
- [Notion create page](https://developers.notion.com/reference/post-page)
- [Notion search shared pages](https://developers.notion.com/reference/post-search)
