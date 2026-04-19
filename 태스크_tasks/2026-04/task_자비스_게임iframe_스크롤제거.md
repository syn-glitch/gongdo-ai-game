# JARVIS-2026-04-19-001 — 게임 iframe 스크롤 제거 + 생성 프롬프트 보강

---
- **태스크 ID**: JARVIS-2026-04-19-001
- **지시일**: 2026-04-19
- **담당팀**: 자비스 개발팀 (Jarvis Dev)
- **담당자**: 🤵 자비스 PO · 👧 클로이 FE · 👨‍💻 알렉스 TL
- **상태**: 🔄 진행 중
- **승인**: ✅ 대표 승인 (2026-04-19, "2번 실행")
---

## 지시 원문

> [Image #1] 게임이 실행되면 화면에 좌/우, 위/아래 스크롤이 생기고 있는데
> 스크롤을 없애고 고정된 화면에서 게임을 할 수 있도록해줘

## 에이전트 이해 요약

- **핵심 요청**: "내 게임" iframe 내부에 발생하는 4방향 스크롤바 제거 → 고정 화면 플레이
- **작업 범위**:
  - [A] iframe 레벨 즉시 차단 — `app.js` 의 iframe 생성 로직 수정 (`scrolling="no"` + srcdoc CSS 자동 주입)
  - [B] 게임 생성 프롬프트 보강 — `chat.js` SYSTEM_GENERATOR 에 "뷰포트 100% 고정·overflow:hidden" 강제 규칙 추가
  - 두 파일 deploy header 갱신
  - **제외**: [C] ResizeObserver 캔버스 자동 스케일 (보류 — 대표 미승인)
- **완료 기준**:
  - 신규/캐시 게임 모두 iframe 내부 스크롤바 0
  - 800×600 캔버스가 패널 안에 정렬되어 잘림 없이 표시
  - AI튜터·문서 패널·resize-handle·BGM 등 회귀 없음

## 작업 단계

- [x] STEP 1 이해 보고 → 대표 승인
- [x] STEP 2 task.md 생성 (이 문서)
- [ ] STEP 3-1 [A] `app.js launchGame()` 수정 — iframe `scrolling="no"`, srcdoc 에 CSS prepend
- [ ] STEP 3-2 [A] `app.js` 상단 deploy header 신규 추가 (v1.1.0)
- [ ] STEP 3-3 [B] `chat.js SYSTEM_GENERATOR` 에 "뷰포트 고정" 블록 삽입
- [ ] STEP 3-4 [B] `chat.js` deploy header 갱신 (v1.2.0 → v1.3.0)
- [ ] STEP 3-5 보안 스캔 (grep — secret/key 노출 없음)
- [ ] STEP 4 완료 보고 (completion_report)

## 산출물

| 산출물 | 파일 경로 | 상태 |
|--------|----------|------|
| iframe 스크롤 차단 로직 | `앱_app/공용_public/js_스크립트/app.js` | ⬜ |
| 게임 생성 프롬프트 보강 | `앱_app/api/chat.js` | ⬜ |
| 본 task.md | `TRACK01_바이브코딩/태스크_tasks/2026-04/task_자비스_게임iframe_스크롤제거.md` | ✅ 생성 |

## 위임 사항

| 위임 대상 팀 | 전달 내용 | 상태 |
|-------------|----------|------|
| 🕵️ 김감사 QA팀 | 배포 후 4차시 게임 생성 → 스크롤바 0 검증 (선택) | 대기 |

## 변경 이력

| 날짜 | 변경 내용 | 변경자 |
|------|----------|--------|
| 2026-04-19 | 최초 생성 | 🤵 자비스 PO |
