# BUNKER-2026-04-19-004 — [🔍 코드 구경] 분할 뷰 (마크다운+코드) + tokenize 버그 fix

---
- **태스크 ID**: BUNKER-2026-04-19-004
- **지시일**: 2026-04-19
- **담당팀**: 🏴 벙커(BUNKER) — 기획·명세
- **수임팀**: 🤵 자비스(JARVIS) — UI 구현 + 버그 fix
- **검수팀**: 🕵️ 김감사 QA — 본 문서를 QA 체크리스트로 사용
- **담당자**: 🧠 송PO (기획)
- **상태**: 🔄 기획 완료 / 자비스 구현 대기
- **승인**: ✅ 대표 승인 (2026-04-19, 4축 추천 컨펌 + "1번으로 진행")
- **선행 작업**:
  - BUNKER-2026-04-19-003 ([🔍 코드 구경] v1.6.0 배포 완료)
  - 본 PR 에서 BUNKER-003 의 tokenize 버그 (`class` 키워드 충돌) 함께 fix
- **문서 종류**: PRD + AC 통합
---

## 1. 지시 원문
> 바이브코딩 작성된 문서가 상단 노출되어 실제 바이브코딩 문서[Image #7] 상단,
> 바로 아래 [Image #8] 코드와 //주석 내용 색상이 들어간 하일라이트 표시
> → 교사와 학생 모두 시각적으로 한번에 확인 가능하게 하려고해
> [선택] 1번 (4축 추천 + 버그 fix 동시)

---

## 2. 배경 및 목적

### 2.1 배경
- 현재 v1.6.0 [🔍 코드 구경] = **코드만** 노출
- 학생이 "내 문장이 어디로 갔지?" 다시 확인하려면 ✕ 닫고 편집기 봐야 함
- 교사 시연 시 두 화면 토글 필요 → 흐름 깨짐

### 2.2 목적
- **한 화면에 위=내 문서 / 아래=내 코드 동시 노출**
- 교실 시연 — 교사가 "이 문장 → 이 코드" 한눈에 가리킬 수 있음
- 학생 자율 학습 — "내가 쓴 게 진짜 코드가 됐다!" 즉시 확인

### 2.3 비목적 (Out of Scope)
- 마크다운 → 코드 hover 매핑 (BUNKER-003 §9.4 거절 그대로)
- 학생이 마크다운/코드 직접 수정 (read-only 유지)
- 외부 markdown 파서 라이브러리 (NFR-8 의존성 0 유지)

### 2.4 동시 처리 — 잠재 버그 fix
- v1.6.0 tokenize() 의 `class` keyword 정규식이 자기 자신이 만든 span 의 `class` 속성을 매칭
- 결과: `<span class="code-tag-comment">` 일부 시각적 깨짐 가능
- **본 PR 에서 root-cause fix** (FR-14~17 참조)

---

## 3. 사용자 시나리오

### 3.1 행복 경로 (Happy Path)
1. 학생이 1차시 → [▶ 시작] → 게임 생성
2. [🔍 코드 구경] 클릭
3. 오버레이 노출 — 위 40% 마크다운 / 아래 60% 코드
4. 학생이 마크다운에서 "주인공: 파란 우주선" 발견
5. 아래 코드에서 `// 📝 "주인공: 파란 우주선" → ...` 주석과 매칭됨을 시각적 확인
6. 교사: "여기 한국어로 쓴 게 → 여기 코드가 됐어요!" 칠판처럼 가리킴
7. ✕ 닫기 → 편집기 보존

### 3.2 교사 시연 (Classroom Demo)
1. 교사가 화면 공유로 [🔍 코드 구경] 노출
2. 위 마크다운 영역에서 "주인공" 부분 가리킴
3. 아래 코드에서 대응 함수·주석 가리킴
4. "한국어 → 코드" 변환 과정 학생들에게 일시에 설명

### 3.3 변경 후 (Stale Sync)
1. 게임 생성 → 마크다운 + 코드 모두 표시
2. ✕ 닫고 편집기 수정
3. [🔍 코드 구경] 다시 → **마크다운 영역도 옛날 시점, 코드도 옛날 시점** (둘 다 일치)
4. 노란 안내 배지: "📝 문서를 바꿨어요! [▶ 시작]을 다시 눌러야 새 코드가 보여요"
5. 교사 학습 효과 보존 — 마크다운과 코드의 1:1 매핑 유지

### 3.4 버그 fix 시나리오
1. 게임 생성 후 [🔍 코드 구경] → 코드 영역에 깨진 `class="code-tag-comment">` 텍스트 노출 0건
2. JS 키워드 (function, const, let 등) 색상 정상

---

## 4. 기능 요구사항 (FR)

### 4.1 레이아웃 (FR-1~3)
| ID | 항목 | 명세 |
|----|------|------|
| FR-1 | 수직 분할 | 오버레이 본문 = 위 마크다운 영역 + 아래 코드 영역 (수평 분할 X) |
| FR-2 | 비율 | 마크다운 40% / 코드 60% (height) — 두 영역 가로는 100% |
| FR-3 | 독립 스크롤 | 마크다운·코드 각 영역 `overflow:auto` — 한쪽 스크롤이 다른 영역 영향 X |

### 4.2 마크다운 영역 (FR-4~5)
| ID | 항목 | 명세 |
|----|------|------|
| FR-4 | 영역 헤더 | "📝 내 바이브코딩 문서" + 한 줄 설명 "내가 한국어로 쓴 거예요" |
| FR-5 | 콘텐츠 출처 | `state.lastGeneratedHtmlSnapshot.sourceText` (게임 생성 시점 editor.value) — 코드와 1:1 일치 보장 |

### 4.3 코드 영역 (FR-6~7)
| ID | 항목 | 명세 |
|----|------|------|
| FR-6 | 영역 헤더 | "💻 진짜 코드" + 한 줄 설명 "AI 가 만든 진짜 코드예요" |
| FR-7 | 콘텐츠 | 기존 v1.6.0 그대로 — `state.lastGeneratedHtml` + tokenize 색상 |

### 4.4 시각 구분 (FR-8~9)
| ID | 항목 | 명세 |
|----|------|------|
| FR-8 | 가로 구분선 | 마크다운 영역과 코드 영역 사이 `border-top: 2px solid var(--color-black)` |
| FR-9 | 영역별 배경 차별화 | 마크다운 = `var(--color-cream)` / 코드 = `var(--color-cream-deep)` |

### 4.5 동기화 + 변경 안내 (FR-10~13)
| ID | 항목 | 명세 |
|----|------|------|
| FR-10 | 게임 미생성 시 | 두 영역 모두 안내 (기존 v1.6.0 안내 그대로 본문 영역에) |
| FR-11 | 변경 감지 | `editor.value !== snapshot.sourceText` 시 노란 안내 배지 (기존 v1.6.0 그대로) |
| FR-12 | 마크다운+코드 동기성 | 둘 다 snapshot 시점 → 항상 1:1 일치 (변경 후엔 안내 배지로 stale 알림) |
| FR-13 (v1.1 명확화, 옵션 B 채택) | 캐시 게임 (구버전) | snapshot 가 없는 구버전 게임 → 코드 영역은 정상 표시. 마크다운 영역은 `editor.value` fallback. **추가로 노란 안내 배지 노출**: "🕰️ 옛날 게임이에요. 새로 [▶ 시작]을 눌러야 정확히 보여요!" |

### 4.6 마크다운 가벼운 렌더링 (FR-14~17, v1.6.0 신규)
| ID | 항목 | 명세 |
|----|------|------|
| FR-14 | 헤딩 | `^## ` → 큰 글씨 (font-size 1.1em + bold + 색상 brown) |
| FR-15 | 헤딩 | `^### ` → 중간 글씨 (font-weight 800) |
| FR-16 | 리스트 | `^- ` → 들여쓰기 + 점(•) (HTML li 가 아닌 텍스트로 처리, 단순) |
| FR-17 | 일반 텍스트 + 구분선 + 빈 줄 (v1.1 보강) | 그대로 표시. **풀 markdown 파서 사용 X** (외부 라이브러리 0). 추가: `^---$` → `<hr>`, 빈 줄 → `<br>` |

### 4.7 tokenize 버그 fix (FR-18~20)
| ID | 항목 | 명세 |
|----|------|------|
| FR-18 | 마커 변경 | tokenize span 의 `class` 속성 → 커스텀 element `<x-c>` (comment) / `<x-k>` (keyword) 로 교체 |
| FR-19 | CSS 갱신 | `.code-tag-comment` / `.code-tag-keyword` 셀렉터 → `x-c` / `x-k` 셀렉터로 교체 (색상·italic·bold 동일 유지) |
| FR-20 | keyword 목록 보존 | function/const/let/var/if/else/return/new/for/while/class/this/null/true/false 그대로 (커스텀 element 가 마커라 `class` 충돌 없음) |

---

## 5. 비기능 요구사항 (NFR)

| ID | 항목 | 명세 |
|----|------|------|
| NFR-1 | 접근성 | 두 영역 모두 role="region", aria-label="내 바이브코딩 문서"/"진짜 코드" |
| NFR-2 | 키보드 | Tab 으로 마크다운→코드 영역 순차 도달 가능 |
| NFR-3 | 성능 | 마크다운 미니 렌더 + tokenize 합산 ≤ 100ms (감각적 즉시) |
| NFR-4 | 추가 LLM 호출 0 | 본 PR 은 chat.js 변경 없음 (BUNKER-003 의 학생용 주석 그대로) |
| NFR-5 | 한국어 | 영역 헤더·설명 모두 초등 5~6 친화 |
| NFR-6 | 모바일 | 폭 < 768px 에서 두 영역 비율 30/70 (마크다운 작게) |
| NFR-7 | ✕ 버튼 | tap target 44×44 유지 (BUNKER-003 NFR-7 그대로) |
| NFR-8 | 의존성 | 외부 라이브러리 0 (마크다운 파서 라이브러리 사용 X — FR-14~17 자작 정규식만) |

---

## 6. UI 와이어 (텍스트 명세)

### 6.1 오버레이 전체 (변경)
```
┌──────────────────────────────────────────────────┐
│ 🔍 내 게임의 진짜 코드        👀 보기만 해요!  ✕ │  ← 헤더 (기존)
├──────────────────────────────────────────────────┤
│ [📝 문서를 바꿨어요! [▶ 시작] 다시!]              │  ← 변경 시 (기존)
├──────────────────────────────────────────────────┤
│ 📝 내 바이브코딩 문서                              │  ← FR-4 영역 헤더
│ 내가 한국어로 쓴 거예요                            │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤  높이 40%
│ ## 🎮 내가 만들 게임                              │
│ ### 장르                                          │  ← 마크다운 영역
│ 우주 슈팅 게임                                    │  (FR-5: snapshot.sourceText)
│ ### 주인공                                        │  스크롤 ↕
│ - 주인공: 파란 우주선                             │
│ ...                                              │
├══════════════════════════════════════════════════┤  ← FR-8 구분선
│ 💻 진짜 코드                                      │  ← FR-6 영역 헤더
│ AI 가 만든 진짜 코드예요                          │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤  높이 60%
│ <!DOCTYPE html>                                  │
│ <html>                                           │  ← 코드 영역
│ ...                                              │  (FR-7: tokenize)
│ // 📝 "주인공: 파란 우주선" → 너의 주인공을...     │  스크롤 ↕
│ function drawPlayer(ctx, x, y) { ... }           │
│ ...                                              │
└──────────────────────────────────────────────────┘
```

### 6.2 마크다운 영역 미니 렌더 예시 (FR-14~17)
```
입력 (markdown):
## 🎮 내가 만들 게임
### 주인공
- 주인공: ㅋㅋ
- 크기: 보통

출력 (HTML, plain styling):
<h-2>🎮 내가 만들 게임</h-2>      ← x-h2 또는 div with style
<h-3>주인공</h-3>
  • 주인공: ㅋㅋ
  • 크기: 보통
```

### 6.3 tokenize fix — span vs 커스텀 element (FR-18~19)
```
AS-IS (v1.6.0, 버그 가능):
<span class="code-tag-comment">// 📝 ...</span>
                ↑
       'class' 키워드 정규식이 매칭 → 깨짐 가능

TO-BE (v1.7.0):
<x-c>// 📝 ...</x-c>
<x-k>function</x-k>
                ↑
   커스텀 element = 키워드 충돌 X, CSS 로 스타일링
```

---

## 7. 데이터 흐름

```
[학생] [▶ 시작] → 게임 생성
    ↓
[app.js] state.lastGeneratedHtmlSnapshot = { html, sourceText }
    ↓
[학생] [🔍 코드 구경] 클릭
    ↓
[app.js] openCodeView()
    ├── updateCodeView()
    │   ├── 마크다운 영역: renderMarkdownLite(snap.sourceText) → HTML
    │   ├── 코드 영역: tokenizeCode(snap.html) → HTML (커스텀 element)
    │   └── 변경 감지 배지 (FR-11)
    └── 오버레이 표시
```

---

## 8. 수용 기준 (AC) — 🕵️ 김감사 QA 체크리스트

### 8.1 레이아웃 (FR-1~3 검증)
- [ ] **AC-FR-1**: 오버레이 본문이 수직 분할 (위/아래) 구조 — `flex-direction: column`
- [ ] **AC-FR-2**: 마크다운 영역 높이 40% / 코드 영역 60% (`getBoundingClientRect()` 측정 ±5%)
- [ ] **AC-FR-3a**: 마크다운 영역 단독 스크롤 가능 (overflow:auto)
- [ ] **AC-FR-3b** (v1.1 측정법 명시): 코드 영역 단독 스크롤, 한쪽이 다른 영역 영향 0
       — 측정: 마크다운 `scrollTop = 100` 설정 후 코드 `scrollTop === 0` 검증

### 8.2 마크다운 영역 (FR-4~5 검증)
- [ ] **AC-FR-4a**: 영역 헤더 "📝 내 바이브코딩 문서" 표시
- [ ] **AC-FR-4b**: 한 줄 설명 "내가 한국어로 쓴 거예요" 표시
- [ ] **AC-FR-5**: 콘텐츠가 `state.lastGeneratedHtmlSnapshot.sourceText` 와 동일 (편집기 현재값이 아닌 게임 생성 시점값)

### 8.3 코드 영역 (FR-6~7 검증)
- [ ] **AC-FR-6a**: 영역 헤더 "💻 진짜 코드" 표시
- [ ] **AC-FR-6b**: 한 줄 설명 "AI 가 만든 진짜 코드예요" 표시
- [ ] **AC-FR-7**: 코드가 `state.lastGeneratedHtml` 과 동일 (tokenize 적용)

### 8.4 시각 구분 + 동기화 (FR-8~13 검증)
- [ ] **AC-FR-8**: 마크다운/코드 사이 가로 구분선 (`border-top: 2px`) 노출
- [ ] **AC-FR-9**: 두 영역 배경색 차별화 (cream vs cream-deep)
- [ ] **AC-FR-10**: 게임 미생성 시 → 두 영역 모두 안내 (또는 하나의 통합 안내)
- [ ] **AC-FR-11**: 편집기 수정 후 [코드 구경] → 노란 안내 배지 노출 (BUNKER-003 회귀)
- [ ] **AC-FR-12** (v1.1 측정법 명시): 마크다운 영역 `innerText` ≈ `state.lastGeneratedHtmlSnapshot.sourceText`
       (escape·미니렌더 차이 감안 — 텍스트 컨텐츠 동일성)
- [ ] **AC-FR-13a** (v1.1 옵션 B 채택): snapshot 없는 구버전 게임 → 코드 영역 정상 + 마크다운 영역 `editor.value` fallback
- [ ] **AC-FR-13b** (v1.1 신설): 구버전 게임 시 추가 노란 배지 노출:
       "🕰️ 옛날 게임이에요. 새로 [▶ 시작]을 눌러야 정확히 보여요!"

### 8.5 마크다운 미니 렌더 (FR-14~17 검증)
- [ ] **AC-FR-14**: `## 헤딩` → 큰 글씨 + bold + brown 색상
- [ ] **AC-FR-15**: `### 헤딩` → 중간 글씨 + 800
- [ ] **AC-FR-16**: `- 항목` → 들여쓰기 + 점(•) 또는 그에 준하는 시각
- [ ] **AC-FR-17a**: 일반 텍스트 그대로 표시
- [ ] **AC-FR-17b**: package.json·CDN 에 markdown 파서 라이브러리 추가 0건 (`grep -E "marked|remark|markdown-it"` 결과 0)

### 8.6 tokenize 버그 fix (FR-18~20 검증) — root-cause
- [ ] **AC-FR-18a**: tokenize 결과 HTML 에 `class="code-tag-` 문자열 0건 (`(html.match(/class="code-tag-/g) || []).length === 0`)
- [ ] **AC-FR-18b**: 결과 HTML 에 `<x-c>` 와 `<x-k>` 마커 존재
- [ ] **AC-FR-19**: CSS 의 `.code-tag-comment` / `.code-tag-keyword` 클래스 셀렉터는 더 이상 필요 X (제거 또는 무영향)
- [ ] **AC-FR-20**: 코드 안 `class` 키워드 (예: `class GameObj {}`) 가 정상 색상 강조

### 8.7 NFR (검증)
- [ ] **AC-NFR-1**: 두 영역에 role="region" + aria-label 정확
- [ ] **AC-NFR-2**: Tab 으로 마크다운 → 코드 영역 순차 포커스
- [ ] **AC-NFR-3**: 클릭 → 두 영역 표시까지 100ms 이내 (감각적 즉시)
- [ ] **AC-NFR-4**: 코드 구경으로 추가 LLM 호출 0건 (Network 탭)
- [ ] **AC-NFR-5** (v1.1 신설): UI 노출 문구 (영역 헤더·설명·배지) 에 IT 용어 0건
       — 검증 대상: "내 바이브코딩 문서", "내가 한국어로 쓴 거예요", "진짜 코드", "AI 가 만든 진짜 코드예요", "옛날 게임이에요"
       — IT 용어 금지 목록: 변수·함수·조건문·루프·메서드·클래스·인스턴스·콜백
- [ ] **AC-NFR-6**: 모바일 (Chrome DevTools 375×667) 비율 30/70 또는 동등
- [ ] **AC-NFR-7**: ✕ 버튼 ≥ 44×44 유지 (BUNKER-003 회귀)
- [ ] **AC-NFR-8**: 외부 라이브러리 추가 0건

### 8.8 엣지 케이스 (Edge)
- [ ] **AC-Edge-1**: 마크다운 영역의 마크다운이 매우 길면 (예: 10000자) 단독 스크롤만 발생, 오버레이 자체 스크롤 X
- [ ] **AC-Edge-2**: 코드 영역의 코드가 매우 길면 (예: 8000줄) 가로/세로 단독 스크롤
- [ ] **AC-Edge-3**: 마크다운에 `## ` 가 0개여도 일반 텍스트로 정상 표시
- [ ] **AC-Edge-4**: 코드에 `class` 키워드가 등장해도 시각 깨짐 0건 (FR-20 root cause fix 검증)
- [ ] **AC-Edge-5**: snapshot 의 sourceText 가 빈 문자열이면 "내용 없음" 안내 또는 빈 영역 (깨짐 X)
- [ ] **AC-Edge-6** (v1.1 신설, XSS 안전): 마크다운에 `<script>alert(1)</script>` 또는 `<img onerror>` 입력 시
       → 마크다운 영역에 escape 된 텍스트로 표시 (`&lt;script&gt;` 형태)
       → script 실행 0건 (Console: alert/confirm 호출 0)
- [ ] **AC-Edge-7** (v1.1 신설, inline 스타일링): 마크다운에 `**bold**` / `*italic*` 입력 시
       → 별표 포함 텍스트로 그대로 표시 (HTML `<b>`/`<i>` 변환되지 X)
- [ ] **AC-Edge-8** (v1.1 신설, --- 구분선): 마크다운에 `---` 줄 입력 시
       → 가로 구분선(`<hr>`)으로 표시. 빈 줄은 줄바꿈(`<br>`) 또는 시각 공간으로 표시
- [ ] **AC-Edge-9** (v1.1 신설, 구버전 게임 안내): snapshot 없는 캐시 게임에서 [코드 구경]
       → 노란 배지 "🕰️ 옛날 게임이에요. 새로 [▶ 시작]을 눌러야 정확히 보여요!" 노출
       → 마크다운 영역 비어있지 않음 (editor.value fallback 동작)

### 8.9 회귀 (기존 기능 영향)
- [ ] **AC-회귀-1**: BUNKER-003 [코드 구경] 기본 동작 정상 (열기/닫기/Escape/외부클릭)
- [ ] **AC-회귀-2**: 학생용 주석 (// 📝 ...) 색상 정상 (커스텀 element x-c)
- [ ] **AC-회귀-3**: BUNKER-003 변경 안내 배지 정상
- [ ] **AC-회귀-4**: BUNKER-002 [↻ 처음으로] 정상
- [ ] **AC-회귀-5**: BUNKER-001 [🎮 예시] variants 토글 정상
- [ ] **AC-회귀-6**: 캐릭터·배경·음악 popover 정상
- [ ] **AC-회귀-7**: [▶ 시작] 게임 생성 정상

### 김감사 QA 판정 기준
- **CRITICAL 0건** + **AC 전체 ≥ 90%** 통과 시 ✅ 승인
- AC-FR-1~13 중 1건이라도 실패 시 ❌ 즉시 반려 (핵심 레이아웃)
- AC-FR-18a (class 마커 0건) 실패 시 ❌ 즉시 반려 (root cause fix)
- AC-회귀-1~7 중 1건이라도 실패 시 ❌ 반려
- AC-Edge-1~5 는 MAJOR (1건 실패당 -10점, -30 누적 시 반려)

---

## 9. 자비스 구현 가이드

### 9.1 변경 대상 파일
| 파일 | 변경 종류 | 비고 |
|------|----------|------|
| `index.html` | 수정 | 오버레이 본문 구조 — 마크다운 섹션 + 코드 섹션 추가 |
| `공용_public/js_스크립트/app.js` | 수정 | renderMarkdownLite() 신설 + tokenizeCode 마커 변경 (FR-18) + updateCodeView 분할 렌더 |
| `공용_public/css_스타일/components.css` | 수정 | 분할 레이아웃 + 영역 헤더 + 구분선 + x-c/x-k 셀렉터 |

### 9.2 구현 힌트 (송PO 권고)

#### 9.2.1 마크다운 미니 렌더 (FR-14~17)
```js
function renderMarkdownLite(md) {
  const escaped = escapeHtml(md);  // 기존 escapeHtml 재사용
  return escaped.split('\n').map((line) => {
    if (line.startsWith('## '))  return `<div class="md-h2">${line.slice(3)}</div>`;
    if (line.startsWith('### ')) return `<div class="md-h3">${line.slice(4)}</div>`;
    if (line.match(/^- /))       return `<div class="md-li">• ${line.slice(2)}</div>`;
    if (line.trim() === '---')   return `<hr class="md-hr">`;
    if (line.trim() === '')      return `<br>`;
    return `<div class="md-p">${line}</div>`;
  }).join('');
}
```

#### 9.2.2 tokenize 마커 변경 (FR-18~20, root cause fix)
```js
function tokenizeCode(rawCode) {
  let html = escapeHtml(rawCode);
  // HTML comments
  html = html.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<x-c>$1</x-c>');
  // JS line comments
  html = html.replace(/(\/\/[^\n]*)/g, '<x-c>$1</x-c>');
  // 키워드 (class 포함 — 커스텀 element 가 마커라 충돌 X)
  html = html.replace(/\b(function|const|let|var|if|else|return|new|for|while|class|this|null|true|false)\b/g, '<x-k>$1</x-k>');
  return html;
}
```

#### 9.2.3 updateCodeView 분할 렌더
```js
function updateCodeView() {
  const mdArea = $('#code-view-md');
  const codeEl = $('#code-view-content');
  const warn   = $('#code-view-warn');
  const snap   = state.lastGeneratedHtmlSnapshot;

  if (!state.lastGeneratedHtml) { /* 미생성 안내 (기존) */ return; }

  // 마크다운: snapshot 우선, 없으면 editor.value fallback (FR-13)
  const mdSource = snap?.sourceText || $('#editor-textarea').value || '';
  mdArea.innerHTML = renderMarkdownLite(mdSource);

  // 코드: tokenize (기존, 마커만 변경)
  codeEl.innerHTML = tokenizeCode(state.lastGeneratedHtml);

  // 변경 안내 배지
  warn.hidden = !(snap && $('#editor-textarea').value !== snap.sourceText);
}
```

#### 9.2.4 CSS — 색상 토큰 마이그레이션
```css
/* AS-IS (v1.1: 완전 제거 권장 — dead code 회피, 단 회귀 검증 후) */
/* .code-tag-comment { ... }   ← 제거 */
/* .code-tag-keyword { ... }   ← 제거 */

/* TO-BE */
x-c { color: var(--color-brown-soft); font-style: italic; }
x-k { color: var(--color-brown); font-weight: 800; }

/* 마크다운 미니 렌더 */
.md-h2 { font-size: 1.1em; font-weight: 800; color: var(--color-brown); margin: 8px 0 4px; }
.md-h3 { font-weight: 800; color: var(--color-brown); margin: 6px 0 2px; }
.md-li { padding-left: 12px; color: var(--color-brown); }
.md-p  { color: var(--color-brown); }
.md-hr { border: 0; border-top: 1px dashed var(--color-brown-soft); margin: 8px 0; }
```

### 9.3 헤더 갱신
- app.js: v1.6.0 → v1.7.0
- @features 항목: `[추가] 분할 뷰 (마크다운+코드) + tokenize 마커 root-cause fix`

### 9.4 송PO 의도된 단순화 (자비스 자율 추가 금지)
- ❌ **마크다운 → 코드 hover 매핑** (BUNKER-003 §9.4 와 일관)
- ❌ **외부 markdown 파서 라이브러리** (NFR-8)
- ❌ **마크다운/코드 영역 학생 직접 수정 기능** (read-only 유지)
- ❌ **마크다운 영역 inline 스타일링** (`**bold**`, `*italic*` 등) — 자작 파서 부담 ↑
  → 헤딩·리스트·구분선·빈 줄만 처리 (FR-14~17). 일반 텍스트는 그대로

### 9.5 송PO 결정 — 김감사 권고와 다른 선택 (v1.1 신설)
김감사 QA-005 MAJOR-3 (FR-12 동기성 vs FR-13 fallback 충돌)에 대해 김감사는 **옵션 A (구버전 게임 → 마크다운 영역에 안내만)** 권장. 송PO 는 **옵션 B (fallback + 노란 안내 배지)** 채택.

이유:
1. **학생 좌절 회피 우선** — 옵션 A 는 마크다운 빈 안내 → "왜 안 보이지?" 좌절. 옵션 B 는 마크다운 노출 + "옛날 게임이에요" 명시 → 인지 + 학습 가능
2. **시연 가능성** — 교사가 "이 옛날 게임의 마크다운은 이랬어요" 시연 가능 (옵션 B)
3. **mismatch 인지** — 노란 배지로 학생이 mismatch 인지 → 학습 효과 부분 보존

자비스가 "옵션 A 가 더 깔끔" 이라 자율 변경 금지.

---

## 10. 위임 안내 🔀

### 자비스 PO 핸드오프
```
──────────────────────────
🔀 업무 위임 안내
──────────────────────────
발견 내용: 코드만 노출 → 자연어 ↔ 코드 동시 비교 불가. 추가로 v1.6.0 tokenize 버그 잠재.
이 작업의 담당 팀:
  🥇 1차: 🤵 자비스 PO → 👧 클로이 FE (UI 분할 + 마크다운 렌더 + tokenize fix)
  🥈 2차: 🎨 벨라 UX (영역 헤더·구분선 시각)

권장 조치: 본 문서 §4 FR + §6 UI + §9 구현 가이드 참조
관련 파일:
  - 앱_app/index.html (오버레이 본문 구조)
  - 앱_app/공용_public/js_스크립트/app.js (renderMarkdownLite + tokenize fix + updateCodeView)
  - 앱_app/공용_public/css_스타일/components.css (분할 레이아웃 + x-c/x-k + .md-*)
우선순위: 보통 (학습 깊이 강화 + 잠재 버그 fix)
예상 작업량: 60분
──────────────────────────
```

### 김감사 QA 핸드오프 (구현 완료 후)
```
──────────────────────────
🕵️ QA 의뢰
──────────────────────────
대상: 자비스 구현 결과 (BUNKER-2026-04-19-004)
QA 체크리스트: 본 문서 §8 (Acceptance Criteria 35+ 항목)
판정 기준: §8 김감사 QA 판정 기준
재현 환경: https://gongdo-ai-game.vercel.app (배포 후)
──────────────────────────
```

---

## 11. 변경 이력

| 버전 | 날짜 | 변경 내용 | 변경자 |
|------|------|----------|--------|
| v1.1 | 2026-04-19 | 김감사 QA-005 반영 — 7건 중 6건 100% 수용 / 1건 부분 수용 (MAJOR-3 옵션 B 채택, 김감사 옵션 A 거절). AC 9건 신설/강화 (AC-NFR-5 한국어, AC-Edge-6 XSS, AC-Edge-7 inline, AC-Edge-8 ---, AC-Edge-9 구버전 안내, AC-FR-3b/12 측정법, AC-FR-13a/b 재구성). FR-13 옵션 B + 노란 배지, FR-17 hr/br 보강, §9.2.4 셀렉터 완전 제거 권장, §9.5 신설 (송PO 옵션 B 결정 사유) | 🧠 송PO |
| v1.0 | 2026-04-19 | 최초 생성 — 4축 추천 (수직 40/60 + 가벼운 마크다운 렌더 + 헤더/구분선 + tokenize root-cause fix) 통합 PRD | 🧠 송PO |
