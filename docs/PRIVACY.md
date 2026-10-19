# 개인정보·권한 / Privacy and permissions — 0.10.0

## 로컬 기본 기능

선택한 원문, 작성한 코멘트, 색, 원문 복원 정보, 대화 주소·제목, 생성/수정 시각, 프롬프트 선택 상태, 화면 설정을 `chrome.storage.local`에 저장합니다. 기존 `qb:note:` 키와 `question` 필드는 호환성을 위해 유지합니다. 이 데이터는 평문 로컬 저장이며 기기 관리자와 같은 Chrome 프로필 사용자는 접근할 수 있습니다. 시스템 글꼴을 사용하고 원격 폰트를 받지 않습니다.

로컬 JSON 백업은 사용자가 요청한 파일 다운로드입니다. 기존 Mark 기록·선택·설정이 포함되고 인증 토큰, 아카이브 전송 대기 본문은 포함하지 않습니다. 파일을 공유하면 원문과 코멘트도 공유됩니다. 기존 가져오기 형식은 유지합니다.

## 선택적 아카이브

기본 OFF이며 OFF 상태에서 아카이브 OAuth/API 전송은 시작하지 않습니다. ON은 **로컬 관찰 허용**이며 업로드 동의가 아닙니다. 이후 생성·삽입한 요청과 그 요청에 연결되는 화면상의 사용자 메시지·AI 답변을 별도 로컬 영역에 기록합니다. AI 계정 전체의 과거 대화를 순회하지 않으며 쿠키·세션 토큰·비공개 API에 접근하지 않습니다.

현재 페이지의 렌더링된 공개 DOM만 읽습니다. 화면에서 접힌/가상화된 메시지, 다른 분기, 첨부 파일 본문, 이미지/OCR, 서버 시각은 복원하지 않습니다. URL의 대화 ID와 제목을 확인할 수 없으면 확인 불가로 남깁니다. 입력창 비움은 전송 증거가 아닙니다. 실제 전송 동작과 새로운 사용자 메시지의 일치를 확인할 때만 전송 확인을 기록합니다. 답변은 요청 묶음에 연결하며 Mark별 답변을 만들어내지 않습니다. 완료 신호를 입증하지 못한 답변은 완료 미확인/부분 관찰로 표시합니다.

외부 전송 전 별도 확장 화면에서 서비스·부모 페이지/폴더·포함 기록·미리보기를 확인하고 **해당 스냅샷 업로드를 승인**해야 합니다. 자동 저장·자동 재시도·양방향 동기화는 없습니다. 회사·민감한 대화는 소속 조직 정책과 해당 AI/외부 저장 서비스의 조건을 확인하세요.

## 외부 저장과 인증

- **Drive**: 선택한 문서 본문과 제목·스냅샷 식별 정보가 Google API로 직접 전송됩니다. 권한은 `drive.file`만 사용합니다. 앱에 허용된 폴더 또는 사용자가 승인한 새 폴더에 Markdown 파일을 만듭니다.
- **Notion**: 선택한 본문·제목·스냅샷 표식을 Notion API로 직접 전송합니다. 공유된 상위 페이지를 사용자가 고릅니다. OAuth 브로커는 인증 코드·토큰만 일시 처리하고 대화 본문은 받지 않습니다.
- 액세스 토큰은 **서비스 워커에서만 쓰는 `chrome.storage.session`**에 보관합니다. 콘텐츠 스크립트, 페이지 DOM, URL, 로그, JSON 백업으로 보내지 않습니다. 확장 UI에도 토큰을 반환하지 않습니다. 브라우저 재시작 후 연결 상태가 사라질 수 있습니다.
- OAuth 취소/거부, 401 만료, 403 권한, 429 제한, 오프라인/서버 오류는 저장 성공과 구분합니다. 서버 오류의 본문은 사용자 화면이나 로그로 노출하지 않습니다.

## 삭제·연결 해제

Mark 삭제는 기존 목록·형광펜·말풍선을 함께 제거하며 관련 아카이브 로컬 기록과 대기 승인을 무효화합니다. **로컬 아카이브 기록 삭제**는 관찰 기록·대기 본문을 지우고, 중복 재시도를 차단하는 최소 취소 표식은 남깁니다. 연결 해제는 세션 토큰을 제거하고 대기 승인을 취소합니다. 이미 다른 서비스에 내보낸 문서는 자동 삭제하지 않습니다.

아카이브 OFF 또는 취소 시 이미 진행 중이던 네트워크 쓰기가 서버에 반영됐을 가능성은 있습니다. 이후 요청을 중단하고 무조건 다시 생성하지 않습니다. 이미 내보낸 문서 삭제와 서비스의 앱 권한 철회는 해당 서비스에서 직접 수행하세요.

## 확장 권한 설명

| 권한 | 실제 사용 |
|---|---|
| `activeTab`, `scripting` | 사용자가 아이콘을 클릭한 AI 페이지에 로컬 도구 주입 |
| `storage` | 기존 Mark·설정 및 선택적 관찰 기록·승인 스냅샷·저장 결과 |
| `clipboardWrite` | 사용자 버튼 동작에 따른 프롬프트 복사 |
| `identity` | 사용자가 연결을 시작할 때만 Google OAuth / Notion 인증 창 |
| ChatGPT content script | 기존처럼 ChatGPT에서 자동 실행되는 로컬 선택 도구 |
| 선택적 `www.googleapis.com`, `api.notion.com` | 연결 버튼에서 사용자 허가 후 해당 서비스 API 호출 |
| 배포 설정의 브로커 origin (선택적) | Notion OAuth 교환. 기본 빌드에는 미설정 |

계정 이메일·브라우저 전체 기록·쿠키 권한은 요구하지 않습니다. 광고·분석·추적 SDK가 없습니다. 공개 서버에 본문을 중계하는 기능은 없습니다.

## English

Local annotations are stored in plaintext Chrome local extension storage. Legacy note keys and JSON backups remain compatible. The optional archive defaults OFF. Enabling permits local observation of newly generated/inserted request batches and their verifiable rendered messages; it is not upload consent. Only the selected current-chat records are exported after preview, destination selection and explicit snapshot approval. No account-wide crawling, cookies, private AI APIs, automatic save or two-way sync.

Drive uses `drive.file` and receives Markdown directly. Notion receives content directly; its separate OAuth broker handles only temporary authentication data. Worker-only session tokens are excluded from content scripts, DOM, URLs, logs and backups. Disconnect/delete revoke pending approvals and stale previews, but do not remove external documents. Writes already received by a provider may finish despite cancellation. Revoke provider permissions and delete exported documents in that provider’s settings.

Collection is partial rendered DOM, never labeled the complete conversation. Generated, inserted and observed-sent messages are separate. Uncertain IDs/times/relationships remain unavailable. Streaming and completion-unverified replies stay marked partial and associated with the request batch, not fabricated per-Mark answers. Check your organization’s policy before exporting work or sensitive chats.
