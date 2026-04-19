# BUNKER-2026-04-19-002 — 문서 [↻ 처음으로] 초기화 버튼 기획서·QA 명세

---
- **태스크 ID**: BUNKER-2026-04-19-002
- **지시일**: 2026-04-19
- **담당팀**: 🏴 벙커(BUNKER) — 기획·명세
- **수임팀**: 🤵 자비스(JARVIS) — 구현
- **검수팀**: 🕵️ 김감사 QA — 본 문서를 QA 체크리스트로 사용
- **담당자**: 🧠 송PO (기획)
- **상태**: 🔄 기획 완료 / 자비스 구현 대기
- **승인**: ✅ 대표 승인 (2026-04-19, "추천방식으로 할거야")
- **문서 종류**: PRD + AC (Acceptance Criteria) 통합
---

## 1. 지시 원문
> 1~3차시 바이브코딩 문서(예시포함) 학생이 문서 텍스트 수정을하다
> 문서를 초기화 할 경우를 생각해서 초기화 버튼이 필요할거 같아
> [선택] 추천 방식 (A 도구바 위치 + A3 인라인 확인)

---

## 2. 배경 및 목적

### 2.1 배경
- 학생이 편집기에서 문서를 자유롭게 수정 가능 (현재 동작)
- 실수로 핵심 줄 삭제·잘못 수정 시 **복구 수단 없음**
- 학생이 다시 차시를 클릭해도 lessonCache 가 원본을 보관하고 있어 *기술적으로는* 원본 복원이 가능하나, **UI 가 없어 학생이 인지·실행 불가**

### 2.2 목적
- 학생이 안심하고 자유롭게 실험할 수 있는 **"되돌리기" 안전망** 제공
- "처음으로 → 다시 시도" 의 학습 사이클 강화
- 어린 학생이 직관적으로 발견·사용할 수 있는 UI

### 2.3 비목적 (Out of Scope)
- 무한 undo/redo (한 단계만 = 처음 예시로)
- 캐릭터/배경/음악 적용 상태 초기화 (별도 UI 존재)
- 차시 간 작품 백업·복원 (Supabase 연동 후 별도 기능)

---

## 3. 사용자 시나리오

### 3.1 행복 경로 (Happy Path)
1. 학생이 1차시 → 별 받기 변형 선택
2. 편집기에서 "주인공: ㅋㅋ" → "주인공: 슈퍼맨" 으로 수정
3. "어, 너무 멀리 갔다" 라고 후회
4. 도구바 **[↻ 처음으로]** 버튼 발견
5. 클릭 → 작은 확인 popover "정말 처음 예시로 되돌릴까요?"
6. **[네, 처음으로]** 클릭
7. 편집기가 즉시 별 받기 원본 markdown 으로 복원
8. 토스트: "📜 처음 예시로 되돌렸어요!"

### 3.2 실수 방지 (Cancel Path)
1. 학생이 [↻ 처음으로] 를 실수로 클릭
2. confirm popover 등장
3. **[아니에요]** 클릭 또는 popover 외부 클릭 → 닫힘
4. 편집기 변경 없음

### 3.3 자동 닫힘 (Timeout)
1. confirm popover 노출 후 5초간 미응답
2. popover 자동 닫힘 (안전 기본값 = 취소)

---

## 4. 기능 요구사항 (FR)

| ID | 항목 | 명세 |
|----|------|------|
| FR-1 | 버튼 위치 | 도구바 row-2 좌측 끝 ([예시] 또는 [캐릭터] 좌측) |
| FR-2 | 버튼 라벨 | `↻ 처음으로` (한국어, 어린 학생 어휘) |
| FR-3 | 버튼 노출 조건 | `state.currentLesson` 가 설정된 후부터 (초기 빈 상태 X) |
| FR-4 | 클릭 → confirm 노출 | 인라인 popover (modal X, blocking X) |
| FR-5 | confirm 본문 | 두 개의 `<p>` 단락 — 1행: "정말 처음 예시로 되돌릴까요?" / 2행: "지금까지 바꾼 내용은 사라져요!" |
| FR-6 | confirm 버튼 | `[✓ 네, 처음으로]` (primary) + `[✗ 아니에요]` (ghost) — 라벨·아이콘 정확 |
| FR-7 | "예" 동작 | editor.value = lessonCache.get(현재 file) |
| FR-8 | 현재 file 결정 | variants 있으면 currentVariantKey 의 file, 없으면 lesson.file |
| FR-9 | "예" 후 토스트 | `📜 처음 예시로 되돌렸어요!` (game-status 영역) |
| FR-10 | "예" 후 attention | `clearStartButtonAttention()` 호출 (변경 사항 0) |
| FR-11 | "아니오" 동작 | popover 닫기만, 편집기 변경 없음 |
| FR-12 | popover 외부 클릭 | "아니오" 와 동일 (닫기만) |
| FR-13 | 자동 닫힘 | 5초 미응답 시 popover 자동 닫힘 (**5초 절대 시간 — hover 무관**, 송PO 의도된 단순화) |
| FR-14 | 음악 적용 상태 | **유지** (state.appliedToGame 변경 X) |
| FR-15 | 캐릭터/배경 popover | **유지** (별도 패널) |
| FR-16 | cache miss fallback (v1.1 신설) | lessonCache.get(file) 가 undefined 면 → 자동 fetch 재시도 → 그래도 실패 시 §6.3 실패 토스트 |

---

## 5. 비기능 요구사항 (NFR)

| ID | 항목 | 명세 |
|----|------|------|
| NFR-1 | 접근성 | 버튼: aria-label="문서 처음으로 되돌리기"; popover: role="dialog", aria-modal="false", aria-live="polite" |
| NFR-2 | 키보드 | 버튼 Tab 도달 가능, Enter 시 confirm 노출 |
| NFR-3 | 성능 | 버튼 클릭 → editor 갱신까지 100ms 이내 (fetch 없이 cache 사용) |
| NFR-4 | 시각 | 캐릭터/배경 popover 패턴 재활용 (디자인 일관성) |
| NFR-5 | 한국어 | 모든 문구 초등 5~6 어휘 |
| NFR-6 | 모바일 | tap target 최소 40×40px, popover 화면 폭 초과 X |

---

## 6. UI 와이어 (텍스트 명세)

### 6.1 도구바 (변경)
```
[ ↻ 처음으로 ] [ 🎮 예시 ] [ 👤 캐릭터 ] [ 🎨 배경 ] [ 🎵 음악 ]
   ↑ 신규
```

### 6.2 confirm popover (신규)
```
┌──────────────────────────────────────┐
│ ↻ 정말 처음으로 되돌릴까요?            │  ← <p class="reset-confirm-title">
│                                      │
│ 지금까지 바꾼 내용은 사라져요!         │  ← <p class="reset-confirm-desc">
│                                      │
│  [✓ 네, 처음으로]  [✗ 아니에요]       │  ← <div class="reset-confirm-actions">
└──────────────────────────────────────┘
        ↑ 도구바 [↻ 처음으로] 버튼 아래 떠 있음

HTML 구조 (FR-5 명시):
<div id="reset-confirm-popover" role="dialog" aria-live="polite" hidden>
  <p class="reset-confirm-title">↻ 정말 처음으로 되돌릴까요?</p>
  <p class="reset-confirm-desc">지금까지 바꾼 내용은 사라져요!</p>
  <div class="reset-confirm-actions">
    <button class="btn btn-primary" id="btn-reset-yes">✓ 네, 처음으로</button>
    <button class="btn btn-ghost"   id="btn-reset-no">✗ 아니에요</button>
  </div>
</div>
```

### 6.3 토스트 (game-status 영역)
- 성공: `📜 처음 예시로 되돌렸어요!`
- 실패 (cache 없음, fetch 실패): `⚠️ 처음 예시를 불러오지 못했어요. 다시 시도해볼래요?`

---

## 7. 데이터 흐름

```
[학생] 클릭 [↻ 처음으로]
    ↓
[app.js] showResetConfirm()
    ↓
[학생] [✓ 네, 처음으로] 클릭
    ↓
[app.js] resetCurrentLesson()
    ├── 현재 file 결정: variants ? variants[currentVariantKey].file : lesson.file
    ├── editor.value = lessonCache.get(file)
    ├── game-status 토스트 갱신
    ├── clearStartButtonAttention()
    └── popover 닫기
```

---

## 8. 수용 기준 (Acceptance Criteria) — 🕵️ 김감사 QA 체크리스트

### 8.1 기능 (FR 검증)
- [ ] **AC-FR-1**: 1차시 우주 슈팅(default) 에서 [↻ 처음으로] → editor 가 `lesson1.md` 원문과 100% 동일
- [ ] **AC-FR-2**: 1차시 별 받기 변형에서 [↻ 처음으로] → editor 가 `lesson1_catch.md` 원문과 동일
- [ ] **AC-FR-3**: 1차시 점프 회피 변형에서 [↻ 처음으로] → editor 가 `lesson1_jump.md` 원문과 동일
- [ ] **AC-FR-4**: 2차시에서 [↻ 처음으로] → editor 가 `lesson2.md` 원문과 동일
- [ ] **AC-FR-5**: 3차시에서 [↻ 처음으로] → editor 가 `lesson3.md` 원문과 동일
- [ ] **AC-FR-6**: 4·5차시에서도 동일하게 동작 (variants 없는 차시 모두 호환)
- [ ] **AC-FR-7**: 차시 미선택 상태에서 [↻ 처음으로] → "먼저 차시를 골라주세요" 안내
- [ ] **AC-FR-8**: confirm popover 가 **인라인(모달 아님)** 으로 표시 — 페이지 다른 영역 클릭 가능, 배경 dim 없음
- [ ] **AC-FR-9** (v1.1 신설): 도구바 버튼 라벨이 정확히 `↻ 처음으로` 표기
- [ ] **AC-FR-10** (v1.1 신설): confirm 의 두 버튼 라벨이 정확히 `✓ 네, 처음으로` / `✗ 아니에요`

### 8.2 UX (확인 절차)
- [ ] **AC-UX-1**: 버튼 클릭 1회로 즉시 초기화되지 **않음** (반드시 confirm 단계 거침)
- [ ] **AC-UX-2**: confirm 의 [✗ 아니에요] 클릭 시 → ① editor.value 변경 0 + ② confirm popover 닫힘 (둘 다 검증)
- [ ] **AC-UX-3**: confirm popover 외부 클릭 시 닫힘 (취소 동일)
- [ ] **AC-UX-4**: confirm 노출 후 5초 미응답 시 자동 닫힘 (**5초 절대 시간 — hover 무관**)
- [ ] **AC-UX-5**: 성공 시 토스트 "📜 처음 예시로 되돌렸어요!" 표시
- [ ] **AC-UX-6**: 성공 시 [시작] 버튼 attention(펄스+빨간점) 해제됨

### 8.3 상태 보존 (회귀 테스트)
- [ ] **AC-회귀-1**: 초기화 후 BGM 적용 상태(state.appliedToGame) 유지
- [ ] **AC-회귀-2**: 초기화 후 [캐릭터], [배경], [음악], [예시] popover 정상 동작
- [ ] **AC-회귀-3**: 초기화 후 [시작] 클릭 시 게임 정상 생성
- [ ] **AC-회귀-4**: 초기화 직후 캐릭터 변경 시 정상 동작 (편집기에 새 주인공 줄 삽입)
- [ ] **AC-회귀-5** (v1.1 강화): [예시] 로 변형 변경 → 학생이 일부 수정 → [↻ 처음으로]
       → **마지막으로 선택한 variant** 의 원본으로 복원 (다른 variant 또는 lesson.file 가 나오면 ❌)
- [ ] **AC-회귀-6**: 차시 전환 → [↻ 처음으로] 버튼이 새 차시에서도 동작

### 8.4 접근성 (NFR 검증)
- [ ] **AC-A11y-1**: 버튼 aria-label = "문서 처음으로 되돌리기"
- [ ] **AC-A11y-2**: confirm popover 에 role="dialog", aria-live="polite"
- [ ] **AC-A11y-3**: Tab 키로 [↻ 처음으로] 도달 가능, Enter 로 confirm 노출
- [ ] **AC-A11y-4**: confirm 내 [네/아니오] 버튼 모두 키보드 포커스 가능

### 8.5 시각·일관성
- [ ] **AC-Visual-1**: 버튼 스타일이 다른 도구바 버튼(.toolbar-btn)과 일관
- [ ] **AC-Visual-2**: confirm popover 가 다른 popover(.character-popover) 와 디자인 일관
- [ ] **AC-Visual-3**: 모바일(< 768px) 폭에서 popover 화면 밖으로 넘치지 않음

### 8.6 성능
- [ ] **AC-Perf-1** (v1.1 강화): 버튼 클릭 → editor 갱신까지 **감각적으로 즉시**
       (검증법: 사용자 테스트 10명 중 9명이 "딜레이 없음" 응답. 자동 측정 강제 X)
- [ ] **AC-Perf-2**: 추가 네트워크 요청 0건 (cache hit 시) / cache miss 시는 fetch 1회 허용 (FR-16)

### 8.7 엣지 케이스 (v1.1 신설 — 김감사 QA-003 반영)
- [ ] **AC-Edge-1**: [캐릭터] / [배경] / [예시] / [음악] popover 가 열린 상태에서 [↻] 클릭
       → 기존 popover 자동 닫힘 + confirm popover 노출 (단일 popover 활성 패턴 유지)
- [ ] **AC-Edge-2**: confirm popover 노출 중 학생이 차시 트리에서 다른 차시 클릭
       → confirm 자동 닫힘 + 차시 전환 정상 진행
- [ ] **AC-Edge-3**: confirm popover 노출 중 학생이 [▶ 시작] 클릭
       → confirm 무시 + [시작] 정상 진행 (현재 editor.value 그대로 = 미수정 상태)
- [ ] **AC-Edge-4** (송PO 단순화): confirm popover 노출 중 [↻] 재클릭
       → 토글 X, **timer 만 reset** (5초 새로 카운트). 학생 헷갈림 방지
- [ ] **AC-Edge-5** (cache miss): 캐시가 비어있는 file 에 대해 [↻ 처음으로] 클릭
       → 자동 fetch 재시도 → 성공 시 정상 동작 / 실패 시 §6.3 실패 토스트 + editor 변경 0

### 김감사 QA 판정 기준 (v1.1)
- **CRITICAL 0건** + **AC 전체 ≥ 90%** 통과 시 ✅ 승인
- AC-FR-1~10 중 1건이라도 실패 시 즉시 ❌ 반려 (핵심 기능)
- AC-회귀-1~6 중 1건이라도 실패 시 ❌ 반려 (기존 기능 영향)
- AC-Edge-1~5 는 MAJOR 처리 (1건 실패당 -10점, 누적 -30 시 반려)

---

## 9. 자비스 구현 가이드

### 9.1 변경 대상 파일
| 파일 | 변경 종류 | 비고 |
|------|----------|------|
| `index.html` | 추가 | `#btn-reset` 도구바 버튼 + `#reset-confirm-popover` |
| `공용_public/js_스크립트/app.js` | 추가 | `resetCurrentLesson()`, `initResetPanel()`, popover 토글 |
| `공용_public/css_스타일/components.css` | 추가 | `.reset-confirm-card`, `.reset-confirm-actions` |

### 9.2 구현 힌트 (송PO 권고, 강제 X)
- 버튼은 `<button id="btn-reset" class="toolbar-btn">` 으로 캐릭터/배경 패턴과 동일
- popover 는 setupPopover 헬퍼 재활용 가능 (이미 캐릭터/배경/예시 popover 가 사용 중)
- popover 본문 HTML 은 정적이므로 index.html 에 미리 작성 가능
- 자동 닫힘 timer 는 setTimeout(..., 5000) + popover 토글 시 cleanup
- 현재 file 결정 로직:
  ```js
  const lesson = state.manifest.lessons.find(l => l.no === state.currentLesson);
  const variant = lesson?.variants?.find(v => v.key === state.currentVariantKey);
  const file = variant?.file || lesson?.file;
  ```

### 9.3 헤더 갱신
- app.js: v1.4.0 → v1.5.0
- @features 항목: `[추가] 문서 초기화 버튼 + 인라인 confirm + cache miss fallback`
- @change-summary: AS-IS / TO-BE 명시

### 9.4 송PO 의도된 단순화 (자비스 자율 판단 금지 사항)
김감사 QA-003 에서 권고된 항목 중 **송PO 가 의도적으로 거절**한 2건. 자비스가 "선의로" 추가하지 말 것.
- ❌ **hover 시 timer 일시정지 X** — 5초는 절대 시간. hover 무관.
       이유: "팝업이 안 닫혀!" 라는 새 버그 가능성 + 어린 학생은 hover 거의 안 함
- ❌ **flashEditor 시각 효과 추가 X** — 토스트만.
       이유: 편집기 텍스트 전체 교체 자체가 가장 큰 시각 신호 + 추가 효과는 노이즈

만약 자비스 구현 중 "이게 더 나을 것 같다" 판단 시 → 송PO 에게 사전 협의, 자율 추가 금지.

---

## 10. 위임 안내 🔀

### 자비스 PO 핸드오프
```
──────────────────────────
🔀 업무 위임 안내
──────────────────────────
발견 내용: 학생 문서 수정 후 복구 수단 부재 → 안전망 부족
이 작업의 담당 팀: 🤵 자비스 PO → 👧 클로이 FE (구현)
권장 조치: 본 문서(BUNKER-2026-04-19-002) §4 FR + §6 UI + §9 구현 가이드 참조
관련 파일:
  - 앱_app/index.html (도구바 row-2 + popover)
  - 앱_app/공용_public/js_스크립트/app.js (resetCurrentLesson)
  - 앱_app/공용_public/css_스타일/components.css (.reset-confirm-*)
우선순위: 보통 (학생 자유 실험 안전망)
예상 작업량: ~60줄, 30~40분
──────────────────────────
```

### 김감사 QA 핸드오프 (구현 완료 후)
```
──────────────────────────
🕵️ QA 의뢰
──────────────────────────
대상: 자비스 구현 결과 (BUNKER-2026-04-19-002)
QA 체크리스트: 본 문서 §8 (Acceptance Criteria 30+ 항목)
판정 기준: §8.6 김감사 QA 판정 기준 참조
재현 환경: https://gongdo-ai-game.vercel.app (배포 후)
──────────────────────────
```

### 박DC (within-team)
- 본 기획서의 한국어 톤·문구 검수 (선택)

---

## 11. 변경 이력

| 버전 | 날짜 | 변경 내용 | 변경자 |
|------|------|----------|--------|
| v1.1 | 2026-04-19 | 김감사 QA-003 반영 — FR-16 추가, AC-FR-9/10 추가, AC-Edge-1~5 신설, AC-회귀-5 강화, AC-Perf-1 정성 기준화, FR-5 HTML 구조 명시, FR-13 5초 절대 시간 명시 / **거절 2건 (hover timer reset, flashEditor) 사유 §9.4 명시** | 🧠 송PO |
| v1.0 | 2026-04-19 | 최초 생성 — 추천 방식(A+A3) 기반 PRD + AC 통합 문서 | 🧠 송PO |
