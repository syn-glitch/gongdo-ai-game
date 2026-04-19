# JARVIS-2026-04-19-002 — 캐릭터/배경/BGM 변경 시 자동 [시작] 트리거

---
- **태스크 ID**: JARVIS-2026-04-19-002
- **지시일**: 2026-04-19
- **위임 출처**: 김감사 QA-2026-04-19-002 (옵션 A 채택)
- **담당팀**: 자비스 개발팀
- **담당자**: 🤵 자비스 PO · 👧 클로이 FE · 👨‍💻 알렉스 TL
- **상태**: 🔄 진행 중
- **승인**: ✅ 대표 승인 (2026-04-19, "없음 진행해")
---

## 지시 원문 (대표 → 김감사 → 자비스)
> 정정 인정 → 자비스 호출해서 옵션 A 즉시 진행
> (옵션 A: 캐릭터/배경/BGM 변경 시 자동 [시작] 재생성)

## 작업 단계
- [x] STEP 1 이해 보고 (Fast-Track)
- [x] STEP 2 task.md 생성 (이 문서)
- [ ] STEP 3-1 app.js scheduleAutoStart() 헬퍼 신설 + insertCharacterIntoDoc/insertThemeIntoDoc hook
- [ ] STEP 3-2 bgm.js applyToGameWithFeedback() 에 scheduleAutoStart 호출 + 헤더 신규
- [ ] STEP 3-3 토스트 메시지 갱신 ("[시작]을 눌러봐요" → "새 게임을 만들고 있어요...")
- [ ] STEP 3-4 app.js 헤더 v1.1.0 → v1.2.0 갱신
- [ ] STEP 3-5 보안 스캔
- [ ] STEP 3-6 vercel --prod 배포 (webhook 끊겨 있어 수동)
- [ ] STEP 3-7 라이브 검증 (browse) → 김감사 재검수 의뢰

## 산출물
| 산출물 | 파일 경로 | 변경 |
|--------|----------|------|
| auto-start 로직 | `앱_app/공용_public/js_스크립트/app.js` | 수정 (v1.2.0) |
| BGM 적용 hook | `앱_app/공용_public/js_스크립트/bgm.js` | 수정 (헤더 신규) |
| 본 task.md | (이 파일) | ✅ 생성 |

## 핵심 설계
- **gate**: `state.lastGeneratedHtml` 존재 시에만 자동 트리거 (첫 게임은 학생 직접)
- **debounce**: 800ms — 캐릭터+배경 연속 변경 시 1회만 생성 (rate limit 보호)
- **isGenerating gate**: 이미 생성 중이면 skip
- **fallback**: rate limit 도달 시 친절한 토스트 ("내일 다시 만들 수 있어요!")
- **취소**: 새 변경 시 이전 debounce 타이머 취소

## 별도 위임 (이번 PR 제외)
- 알렉스 TL → rate limit 5→15 상향 검토 (별도 task)
- 슈베이스 → GitHub→Vercel webhook 재연결 (별도 task)
