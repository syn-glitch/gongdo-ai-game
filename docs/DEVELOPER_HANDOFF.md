<!--
 ============================================
 📋 문서 배포 이력 (Deploy Header)
 ============================================
 @file        DEVELOPER_HANDOFF.md
 @version     v1.0.1
 @updated     2026-04-27 (KST)
 @agent       📝 꼼꼼이 (Docs Team Lead)
 @ordered-by  용남 대표
 @description 외부 개발자 핸드오프 문서 — 이슈 발생 시 사용자(바이브코더) 가 자체 해결 못 하면 개발자가 본 문서만 보고 진단·해결하기 위한 단일 진실 원천.
 @audience    문유나 / 김민석 (외부 개발자)
 @scope       gongdo-ai-game (https://gongdo-ai-game.vercel.app/) v0.4.0-pilot 기준

 ── 변경 이력 ──────────────────────────
 v1.0.1 | 2026-04-27 | 꼼꼼이 (송PO 직접 patch) | 김감사 QA Overall 84.5 보강 — line 번호 7곳 정정 + 'ok' 분기 후속 호출 보강 + 검증 매트릭스 #6 + commit 폐기 명시
 v1.0.0 | 2026-04-27 | 꼼꼼이 | 최초 작성 — BUNKER-2026-04-27-001 사이클 산출물 통합
 ============================================
-->

# 🎮 공도 AI-Game — 개발자 핸드오프 문서

> **이 문서 한 페이지로 시스템 구조·코드 위치·트러블슈팅·롤백을 모두 처리할 수 있도록 설계되었습니다.**
>
> **대상 독자**: 외부 개발자. 사용자(바이브코더)가 이슈를 자가 해결하지 못할 때 진입.
>
> **현재 안정 버전**: `v0.4.0-pilot` (2026-04-27 commit `ad24a31`)

---

## 📑 목차

1. [빠른 시작](#1-빠른-시작)
2. [5분 진단 가이드](#2-5분-진단-가이드)
3. [시스템 아키텍처](#3-시스템-아키텍처)
4. [핵심 기능 명세](#4-핵심-기능-명세)
5. [코드 가이드](#5-코드-가이드)
6. [개발 환경 셋업](#6-개발-환경-셋업)
7. [배포 절차](#7-배포-절차)
8. [롤백 절차](#8-롤백-절차)
9. [알려진 이슈·해결 사례](#9-알려진-이슈해결-사례)
10. [운영 주의사항](#10-운영-주의사항)
11. [변경 이력 요약](#11-변경-이력-요약)
12. [연락처·역할](#12-연락처역할)

---

## 1. 빠른 시작

| 항목 | 값 |
|---|---|
| **프로젝트** | 공도 AI-Game (TRACK 01 바이브코딩 실습환경) |
| **라이브 URL** | https://gongdo-ai-game.vercel.app/ |
| **GitHub (운영)** | https://github.com/syn-glitch/gongdo-ai-game (`origin`) |
| **GitHub (조직 fork)** | https://github.com/GongDo-Inc/gongdo-ai-game (`moon`, **push 금지**) |
| **안정 tag** | [`v0.4.0-pilot`](https://github.com/syn-glitch/gongdo-ai-game/releases/tag/v0.4.0-pilot) |
| **Vercel 프로젝트** | `gongdo-ai-game` (팀: `syn-7532s-projects`) |
| **로컬 클론 권장 위치** | `/Users/syn/Documents/dev/gongdo-ai-game/` |
| **수업 운영 단계** | S17 파일럿 (manifest.json `version: v0.4.0`) |

### 핵심 학습 흐름

학생이 4 차시 수업을 진행:
1. **1차시** 바이브코딩 시작 — `### 장르 / 주인공 / 적 / 배경 ...` 명세 → [▶ 시작] → AI 가 게임 HTML 생성 → iframe 노출
2. **2차시** 캐릭터 꾸미기 — **캐릭터 활성화 게이트** ("ㅋㅋ도와줘" 키워드) → IP 4종 (ㅋㅋ/토리/밥/레옹) 셀 클릭 → "- 주인공:" 라인만 in-place patch → [▶ 시작]
3. **3차시** 효과음·BGM
4. **4차시** 발표 자료 만들기

---

## 2. 5분 진단 가이드

이슈 발생 시 **위에서 아래로** 체크. 80% 이슈가 아래 5건 중 하나입니다.

### 🚨 진단 1 — 게임 영역에 마크다운/lesson 본문이 그대로 노출
- **증상**: [▶ 시작] 누르면 게임 대신 \`\`\`html ... # 1단계 ...\`\`\` 같은 마크다운이 codeblock 으로 표시됨
- **원인**: chat.js 의 HTML 추출 정규식이 fallback 못 함. `htmlExtractStatus` 검증 로직 문제 (chat.js v1.6.0 이후) 또는 회귀
- **확인**: chat.js `line 572~609` 의 `htmlExtractStatus` 분기 정상 동작 여부
- **해결**: [9. 알려진 이슈](#9-알려진-이슈해결-사례)의 CRITICAL-1 참조

### 🚨 진단 2 — IP 캐릭터 셀 클릭 후 [▶ 시작] 시 게임에 캐릭터 안 나옴
- **증상**: 캐릭터 활성화 OK, 셀 클릭 OK, 자동 입력 OK, [▶ 시작] 후 "게임을 기다리고 있어요" stub 또는 우주선 그대로
- **원인**: IP_PROMPTS 의 URL 이 상대 경로로 회귀했거나, chat.js 매핑표(line 232~237) 와 정합 깨짐
- **확인**: `app.js:1408` 의 `IP_META` 가 절대 URL (`https://gongdo-ai-game.vercel.app/에셋_assets/...`) 인지
- **해결**: CRITICAL-3 참조

### 🚨 진단 3 — 캐릭터 활성화 모달이 안 열림 / 키워드 검증 실패
- **증상**: [🔓 캐릭터 활성화하기] 클릭해도 모달 X / "ㅋㅋ도와줘" 입력해도 활성화 X
- **원인**: 키워드 변경됨 (`CHAR_UNLOCK_KEYWORD`), 또는 IME compositionend 미처리, 또는 모달 마크업 변경
- **확인**: `app.js:1403` 의 `CHAR_UNLOCK_KEYWORD = 'ㅋㅋ도와줘'` / `app.js:1419` IME `compositionend` 핸들러
- **해결**: [10. 운영 주의사항](#10-운영-주의사항) 의 "키워드 단일 진실" 참조

### 🚨 진단 4 — IP 셀 클릭 시 lesson 본문이 통째로 사라짐
- **증상**: IP 셀 클릭 → textarea 가 "주인공을 ㅋㅋ로 바꿔줘..." 한 줄만 남고 적/배경/색상/효과 등 모두 유실
- **원인**: applyIpPrompt 가 in-place patch 가 아닌 전체 덮어쓰기로 회귀 (v1.11.0 이전 동작)
- **확인**: `app.js:1526` 의 `applyIpPrompt` 가 `editor.value = before.replace(HERO_LINE_PATTERN, replacement)` 패턴인지
- **해결**: 사이클 v1.11.0 이후 `editor.value = ...PROMPTS[charKey]` 같은 전체 덮어쓰기 절대 금지

### 🚨 진단 5 — 라이브 사이트가 갱신 안 됨
- **증상**: `git push origin main` 했는데 라이브가 그대로
- **원인**: **Vercel webhook 미복구** (알려진 운영 상태). git push 만으로는 자동 배포 X
- **확인**: 푸시 후 5분 기다려도 라이브 변화 없으면 webhook 미동작
- **해결**: 반드시 `cd 앱_app && vercel --prod --yes` 수동 실행. [7. 배포 절차](#7-배포-절차) 참조

---

## 3. 시스템 아키텍처

### 폴더 구조

```
gongdo-ai-game/                          ← Git repo root
├─ docs/
│   └─ DEVELOPER_HANDOFF.md              ← 본 문서
├─ README.md
├─ 기획_planning/
├─ 디자인_design/
├─ 태스크_tasks/
└─ 앱_app/                               ← Vercel 프로젝트 root (.vercel/ 도 여기)
    ├─ index.html                        ← UI 마크업
    ├─ vercel.json                       ← Vercel 라우팅 (api 함수 매핑)
    ├─ package.json                      ← 의존성 + npm scripts
    ├─ dev-server.js                     ← 정적 dev server (포트 3000)
    ├─ api/
    │   ├─ chat.js                       ← AI 게임 생성 endpoint (★ 핵심)
    │   ├─ play.js                       ← 학생 게임 보존
    │   ├─ music.js                      ← BGM 생성
    │   └─ upload-game.js                ← Supabase 업로드
    ├─ 차시_lessons/
    │   ├─ manifest.json                 ← lesson 메타 + variants
    │   ├─ lesson1.md / lesson1_catch.md / lesson1_jump.md
    │   ├─ lesson2.md (현재 v3.0.0)
    │   ├─ lesson3.md / lesson4.md / lesson5.md
    └─ 공용_public/
        ├─ js_스크립트/app.js             ← 메인 클라이언트 스크립트 (★ 핵심)
        ├─ css_스타일/components.css      ← 컴포넌트 CSS
        └─ 에셋_assets/캐릭터_characters/  ← IP PNG (kk_idle, tory_idle, bob_idle, leon_idle)
```

### 데이터 흐름 (학생이 [▶ 시작] 누를 때)

```
학생 textarea (#editor-textarea)
   ↓ (raw markdown content)
app.js handleStartClick()
   ↓ POST /api/chat { mode: 'generator', document: <text> }
chat.js (Vercel serverless function)
   ↓ system prompt + user document → Anthropic API
Anthropic Claude API
   ↓ raw 응답 (HTML 또는 마크다운)
chat.js HTML 추출
   ├─ DOCTYPE/html 토큰 검증 → htmlExtractStatus = 'ok'
   ├─ 마크다운 헤더 시작 → 'markdown_only' (CRITICAL-1 차단)
   ├─ 빈 응답 → 'empty'
   └─ DOCTYPE 부재 → 'no_doctype'
   ↓ JSON 응답 { html, htmlExtractStatus, ... }
app.js handleStartClick (continuation)
   ↓ html 이 null 이면 차별 안내 / 정상이면 iframe srcdoc 주입
#game-iframe (iframe srcdoc=...)
   ↓ 학생 게임 launch
```

### 핵심 컴포넌트 책임

| 파일 | 역할 |
|---|---|
| `index.html` | DOM 구조 (도구바, 사이드바, textarea, iframe, 모달) |
| `공용_public/js_스크립트/app.js` | 차시 로딩, 게임 iframe 주입, AI튜터, **캐릭터 활성화 게이트**, **IP 자동 입력**, **mirror highlight** |
| `공용_public/css_스타일/components.css` | 컴포넌트 스타일 (모달, 토스트, mirror div 등) |
| `api/chat.js` | AI 게임 생성 (mode='generator') + AI튜터 (mode='tutor'). system prompt 에 **IP 매핑표** 내장 |
| `차시_lessons/manifest.json` | 차시 목록 + variants. version 갱신 시 학생 화면 메타 변경 |
| `차시_lessons/lesson{N}.md` | 학생 textarea content. **반드시 "프롬프트 자료" 형식** ([10. 운영 주의사항](#10-운영-주의사항) 참조) |

---

## 4. 핵심 기능 명세

### 4.1 캐릭터 활성화 게이트 (모든 차시 글로벌)

**의도**: 학생이 텍스트로 자유롭게 캐릭터 시도 (예: "주인공을 무서운 호랑이로 바꿔줘") → AI 가 그림체 일관성 부족으로 어색한 결과 → 선생님이 "ㅋㅋ도와줘" 키워드 알려줌 → 학생이 모달에서 키워드 입력 → IP 4 종 (ㅋㅋ/토리/밥/레옹) 활용 가능.

**진입로 2개**:
1. 도구바의 [🔓 캐릭터 활성화하기] 버튼 클릭
2. 비활성 [👤 캐릭터] 버튼 직접 클릭 (wrapper 핸들러로 모달 자동 열림)

**키워드 검증** (`app.js:1485`):
```js
const normalized = (input.value || '').trim().replace(/\s+/g, '');
if (normalized === CHAR_UNLOCK_KEYWORD) { ... }
```
- 정규화: `trim` + 모든 공백 제거 후 정확 일치
- 통과: `ㅋㅋ도와줘`, `ㅋㅋ 도와줘`, `ㅋㅋ도와줘 ` (말미 공백)
- 실패: `ㅋㅋ 도와줄래`, 빈 문자열
- IME 조합 중 [확인] 버튼 disabled (`compositionstart` / `compositionend` 핸들러)

**영속성**: **in-memory 변수만** (`app.js:1422` `let _characterUnlocked = false`).
- F5 새로고침 = 모듈 리로드 = 자동 false → 키워드 재입력 요구
- SPA 차시 전환 (1↔2↔3↔4) = 페이지 이동 X = 활성 유지
- **`sessionStorage` / `localStorage` 절대 사용 금지** (학생 PC 공유 환경 누출 방지. 단 `localStorage.setItem('gongdo-student-id', ...)` 학생 ID 시스템은 별도 기능, 영향 없음)

### 4.2 IP 자동 입력 (in-place patch)

**의도**: IP 셀 클릭 → lesson 본문 안의 "- 주인공: ..." 라인**만** 바꿔치기 + 다른 본문(적/배경/색상/효과)은 유지.

**핵심 정규식** (`app.js:1419`):
```js
const HERO_LINE_PATTERN = /^(- 주인공:\s*)([^\n(]*?)(\s*\(이미지:[^)]*\))?\s*$/m;
```
- `$1` = `"- 주인공: "` 접두
- `$2` = 기존 캐릭터명 (덮어쓰기 대상)
- `$3` = 이전 patch 의 `(이미지: ...)` 옵션 (누적 방지 — 자동 덮어쓰기)
- `m` flag = multiline (라인 단위 매치)

**lesson1·2 모두 매치 검증**:
- lesson1.md: `- 주인공: 파란 우주선` ✅
- lesson2.md: `- 주인공: 토리` ✅
- lesson1_catch.md: `- 주인공: ㅋㅋ` ✅

**applyIpPrompt 흐름** (`app.js:1526`):
1. `IP_META[charKey]` 에서 `{name, url}` 추출
2. textarea content 가져옴
3. 정규식 미매치 시 토스트 안내 후 종료 (`"- 주인공: ..." 라인을 찾지 못했어요`)
4. `replace(HERO_LINE_PATTERN, ` `$1${meta.name} (이미지: ${meta.url})`)` 으로 in-place 변경
5. `setSelectionRange(start, end)` + `editor.focus()` → textarea native 자동 스크롤 + 노란 selection 강조 (CSS `::selection` = `var(--color-yellow)`)
6. `highlightHeroLine(editor)` → mirror div + `<mark>` 로 노란 배경 영구 유지 (selection 사라진 후에도)

### 4.3 mirror div + `<mark>` 하이라이트 (영구)

**기법**: textarea 위에 동일 스타일로 깔린 mirror div 가 hero line 만 `<mark class="editor-hero-mark">` 로 감싸 노란 배경. textarea 는 transparent 배경 + caret/입력 정상.

**핵심 함수** (`app.js`):
- `ensureEditorMirror(editor)` (line 1569) — wrapper 동적 생성 + scroll 동기 + input 이벤트 hook (학생 편집 시 mirror 자동 갱신)
- `renderHeroHighlight(editor)` (line 1602) — 정규식 매치 위치 기반 textNode + `<mark>` 분할
- `highlightHeroLine(editor)` (line 1633) — ensure + render
- `clearHeroHighlight()` (line 1640) — 차시 전환 시 호출 (`selectLesson` 안)

**CSS** (`components.css` 끝부분):
```css
.editor-textarea-wrapper { position: relative; display: flex; flex: 1; }
.editor-textarea-wrapper > .editor-textarea-with-mirror {
  background: transparent; z-index: 2;
}
.editor-textarea-wrapper > .editor-mirror {
  position: absolute; inset: 0;
  padding: var(--space-5);
  background: var(--color-cream);
  color: transparent;
  font: same as textarea (font-family: var(--font-code), font-size: var(--fs-md), line-height: 1.7);
  z-index: 1;
}
.editor-mirror .editor-hero-mark {
  background: var(--color-yellow);  /* #F7C548 */
  box-decoration-break: clone;
}
```

### 4.4 chat.js HTML 추출 안전 fallback

**의도**: AI 응답이 비정상 (마크다운만, 빈 응답, DOCTYPE 부재) 일 때 iframe srcdoc 에 잘못된 내용 주입 방지.

**로직** (`chat.js:572~609`):
```js
let htmlExtractStatus = null;  // 'ok' | 'no_doctype' | 'markdown_only' | 'empty'
if (mode === 'generator') {
  const match = raw.match(/```html\s*([\s\S]*?)```/i);
  let candidate = (match ? match[1] : raw || '').trim();
  candidate = candidate.replace(/^```(?:html)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

  if (!candidate) { htmlExtractStatus = 'empty'; html = null; }
  else if (/^\s*#{1,6}\s/.test(candidate)) { htmlExtractStatus = 'markdown_only'; html = null; }
  else if (!/<!DOCTYPE|<html/i.test(candidate)) { htmlExtractStatus = 'no_doctype'; html = null; }
  else {
    htmlExtractStatus = 'ok';
    html = candidate;
    // 'ok' 분기 후속 호출 (line 604~607) — 회귀 디버깅 시 추적 포인트
    html = forceEmojiCharacters(html);                  // chat.js:368 — IP 이모지 폴백 처리
    html = stripDisallowedExternalScripts(html);        // chat.js:482 — 외부 script 차단 (S-AI-01)
    if (musicScore) html = injectBgmIntoGame(html, musicScore);  // chat.js:386 — BGM 주입
  }
}
```

**클라이언트 분기** (`app.js handleStartClick`): `data.htmlExtractStatus` 별 차별 안내 메시지 표시.

### 4.5 lesson 자료 표준 + deploy_header stripping

**lesson{N}.md 본문 = 프롬프트 자료 형식** (필수):
```markdown
# 1차시 🚀 바이브코딩 시작
## 🎮 내가 만들 게임
### 장르
우주 슈팅 게임
### 주인공
- 주인공: 파란 우주선
- 크기: 보통
...
```
→ AI 가 게임 명세로 받아 HTML 게임 생성.

**lesson 본문 ≠ 페다고지 안내문** (절대 금지). 이전 사이클 (박DC v2.0) 에서 안내문 본문으로 작성 → AI 가 마크다운 codeblock 으로 응답 → CRITICAL-2 발생. 페다고지 흐름은 **자비스의 캐릭터 모달 + IP 셀 게이트** 같은 별도 영역에서 구현.

**deploy_header (HTML 주석)**: COMMON_RULES `<deploy_header>` 표준에 따라 lesson 파일에도 추가 가능. 단 학생 textarea 노출 X — `loadLessonFile` 이 자동 stripping (`app.js:266~277`, stripping 라인 = `app.js:273`):
```js
const stripped = raw.replace(/^\s*<!--[\s\S]*?-->\s*/, '');
```

---

## 5. 코드 가이드

### 5.1 핵심 위치 (file:line)

| 기능 | 위치 | 핵심 |
|---|---|---|
| 활성화 키워드 (단일 진실) | `app.js:1403` | `CHAR_UNLOCK_KEYWORD = 'ㅋㅋ도와줘'` |
| IP 메타 (4종 절대 URL) | `app.js:1408` | `IP_META = { kk: {name, url}, ... }` |
| Hero line 정규식 | `app.js:1419` | `HERO_LINE_PATTERN = /^(- 주인공:\s*)...$/m` |
| in-memory 영속성 | `app.js:1422` | `let _characterUnlocked = false` |
| 활성화 모달 검증 | `app.js:1479` | `handleCharacterUnlockConfirm()` (진입부) |
| applyIpPrompt | `app.js:1526` | in-place patch + selection + scroll |
| mirror div 생성 | `app.js:1569` | `ensureEditorMirror(editor)` |
| `<mark>` 렌더링 | `app.js:1602` | `renderHeroHighlight(editor)` |
| highlightHeroLine | `app.js:1633` | ensure + render |
| clearHeroHighlight | `app.js:1640` | 차시 전환 시 호출 |
| selectLesson | `app.js:226` | 차시 전환 시 `clearHeroHighlight` 호출 |
| loadLessonFile + stripping | `app.js:266~277` (stripping 라인 = 273) | deploy_header 정규식 제거 |
| chat.js HTML 추출 | `chat.js:572~609` | `htmlExtractStatus` 4종 |
| chat.js 'ok' 분기 후속 | `chat.js:604~607` | `forceEmojiCharacters` + `stripDisallowedExternalScripts` + `injectBgmIntoGame` |
| chat.js 매핑표 | `chat.js:232~237` | IP 4종 절대 URL (placeholder 매핑 가이드, 헤더+row) |
| 상대 경로 경고 | `chat.js:190` | "상대 경로 임의 사용 금지" |

### 5.2 IP_META (절대 URL)

```js
const IP_ASSET_BASE = 'https://gongdo-ai-game.vercel.app/에셋_assets/캐릭터_characters';
const IP_META = {
  kk:   { name: 'ㅋㅋ',  url: `${IP_ASSET_BASE}/kk_idle.png` },
  tory: { name: '토리',  url: `${IP_ASSET_BASE}/tory_idle.png` },
  bob:  { name: '밥',    url: `${IP_ASSET_BASE}/bob_idle.png` },
  leon: { name: '레옹',  url: `${IP_ASSET_BASE}/leon_idle.png` },
};
```

### 5.3 chat.js system prompt 매핑표 (요약)

`chat.js:232~237` 에 다음 매핑이 system prompt 안에 명시됨 (헤더 + 4 row):

| 학생 문서의 캐릭터 | playerImg.src 절대 URL | 이모지 폴백 |
|---|---|---|
| ㅋㅋ | `https://gongdo-ai-game.vercel.app/에셋_assets/캐릭터_characters/kk_idle.png` | 🦸 |
| 토리 | `https://gongdo-ai-game.vercel.app/에셋_assets/캐릭터_characters/tory_idle.png` | 👒 |
| 밥 | `https://gongdo-ai-game.vercel.app/에셋_assets/캐릭터_characters/bob_idle.png` | 🐰 |
| 레옹 | `https://gongdo-ai-game.vercel.app/에셋_assets/캐릭터_characters/leon_idle.png` | 🦁 |

→ **app.js `IP_META` 와 chat.js 매핑표는 글자 단위로 일치해야 함**. 둘 중 하나만 변경하면 회귀.

### 5.4 manifest.json 구조

```json
{
  "version": "v0.4.0",
  "updated": "2026-04-27",
  "lessons": [
    {
      "no": 1, "title": "바이브코딩 시작", "emoji": "🚀",
      "file": "lesson1.md", "subtitle": "...", "duration_min": 40,
      "goal": "...",
      "variants": [
        { "key": "space", "label": "🚀 우주 슈팅", "file": "lesson1.md", ... }
      ]
    },
    { "no": 2, "title": "캐릭터 꾸미기", ..., "goal": "IP 캐릭터 삽입 · 색상/배경 변경" },
    ...
  ],
  "myworks_folders": [...]
}
```

새 차시 추가 시: `lessons` 배열에 항목 추가 + `차시_lessons/lesson{N}.md` 파일 생성. lesson 본문은 프롬프트 자료 형식.

---

## 6. 개발 환경 셋업

### 6.1 Clone

```bash
gh repo clone syn-glitch/gongdo-ai-game
cd gongdo-ai-game
```

⚠️ `GongDo-Inc/gongdo-ai-game` 은 fork 입니다. **clone 은 `syn-glitch` 에서**.

### 6.2 의존성 (package.json)

```json
{
  "type": "module",
  "engines": { "node": ">=18" },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.68.0",
    "@supabase/supabase-js": "^2.103.0",
    "@vercel/kv": "^3.0.0"
  },
  "scripts": {
    "dev": "vercel dev --listen 3000",
    "start": "vercel dev --listen 3000",
    "serve:static": "npx serve . -l 3000"
  }
}
```

```bash
cd 앱_app
npm install
```

### 6.3 로컬 개발

#### 옵션 A — 정적 dev-server (UI 검증 only, API 미동작)

```bash
cd 앱_app
node dev-server.js
# → http://localhost:3000
```

UI / 캐릭터 게이트 / mirror highlight 등 검증 가능. **[▶ 시작] 게임 launch 는 chat.js 호출 필요해 동작 X**.

#### 옵션 B — Vercel dev (풀스택, API 포함)

```bash
cd 앱_app
npm run dev
# → http://localhost:3000 (chat.js / play.js / music.js 모두 작동)
```

⚠️ 환경 변수 필요 (Vercel 대시보드 또는 `vercel env pull`):
- `ANTHROPIC_API_KEY` (chat.js, music.js)
- `SUPABASE_URL` / `SUPABASE_KEY` (upload-game.js)
- 기타 `vercel env ls` 로 확인

### 6.4 라이브 검증 매트릭스

| # | 항목 | 기대 |
|---|---|---|
| 1 | 1차시 진입 → textarea 본문 노출 | `# 1차시 🚀 바이브코딩 시작` 부터 시작 |
| 2 | 2차시 진입 → textarea 본문 노출 | `# 2차시 🎭 캐릭터 꾸미기` 부터 (deploy_header 학생 노출 X) |
| 3 | [🔓 캐릭터 활성화하기] 클릭 → 모달 open | "선생님이 알려주신 키워드를 입력해보세요!" |
| 4 | 모달에 "ㅋㅋ도와줘" 입력 + [확인] | 토스트 "✨ 활성화 되었습니다" |
| 5 | [👤 캐릭터] 활성 → 클릭 → 4 IP 셀 노출 | 2x2 그리드 (ㅋㅋ/토리/밥/레옹) |
| 6 | 토리 셀 클릭 | "- 주인공: 토리" → "- 주인공: 토리 (이미지: https://...png)" + 노란 selection 강조 + 자동 스크롤 + **mirror highlight 영구 유지** (학생 클릭으로 selection 사라진 후에도 노란 배경 잔존) |
| 7 | [▶ 시작] | iframe 에 게임 launch + 토리 캐릭터 등장 + lesson 본문 명세 (적/배경) 모두 반영 |
| 8 | F5 새로고침 → [👤 캐릭터] | 다시 비활성 (🔒) → 키워드 재입력 요구 |
| 9 | 활성화 후 1차시→2차시 전환 | 활성 상태 유지 (in-memory 변수) |

---

## 7. 배포 절차

⚠️ **메모리 등재 운영 사실**: Vercel webhook 미복구. `git push origin main` 만으로는 자동 배포 X. **반드시 vercel CLI 수동 실행**.

### 7.1 Pre-Push 체크

```bash
cd /Users/syn/Documents/dev/gongdo-ai-game
git status
git diff --cached | grep -iE "(api[_-]?key|secret|token|password|bearer)"  # 보안 스캔
git remote -v   # origin = syn-glitch 확인
```

### 7.2 Commit + Push

```bash
git add <변경 파일>
git commit -m "..."
git push origin main          # ⚠️ moon 절대 금지
```

### 7.3 Vercel 수동 배포

```bash
cd /Users/syn/Documents/dev/gongdo-ai-game/앱_app
vercel --prod --yes
```

- Vercel 프로젝트 root = `앱_app/` (레포 root 아님). `.vercel/` 폴더가 `앱_app/` 안에 link 되어 있음.
- CLI 계정: `syn-7532` (팀: `syn-7532s-projects`)
- 빌드 평균 15초 (캐시 활용)
- 출력: `Production: https://gongdo-ai-game-XXX.vercel.app` + `Aliased: https://gongdo-ai-game.vercel.app`

### 7.4 라이브 검증

```bash
curl -sI https://gongdo-ai-game.vercel.app/ | head -5
# HTTP/2 200 + age: 0 (fresh) 확인
```

브라우저 검증: [6.4 라이브 검증 매트릭스](#64-라이브-검증-매트릭스)

---

## 8. 롤백 절차

3 가지 옵션. 위험도 낮은 순서.

### 8.1 옵션 A — Vercel 대시보드 (5초, 코드 변경 X)

가장 안전·빠름. 라이브만 즉시 이전 deployment 로 alias 변경.

1. https://vercel.com/syn-7532s-projects/gongdo-ai-game/deployments 진입
2. 안정 deployment 찾음 (예: `dpl_DLDgssJ9g34fQCZZE6wvB8t7mZek` = `v0.4.0-pilot` = `ad24a31`)
3. ⋯ 메뉴 → **"Promote to Production"** 클릭
4. alias `gongdo-ai-game.vercel.app` 가 그 deployment 로 즉시 변경

### 8.2 옵션 B — Git revert (안전, 5분)

히스토리 보존하며 변경 취소. 새 commit 생성.

```bash
cd /Users/syn/Documents/dev/gongdo-ai-game
git checkout main
git pull origin main
git revert HEAD                  # 또는 git revert <commit-hash>
git push origin main
cd 앱_app && vercel --prod --yes
```

### 8.3 옵션 C — Git reset --hard + force push (강력, 위험)

⚠️ 히스토리 자체를 되돌림. 다른 협업자 푸시 영향 가능. **최후 수단**.

```bash
cd /Users/syn/Documents/dev/gongdo-ai-game
git fetch --tags
git checkout main
git reset --hard v0.4.0-pilot    # 안정 tag 으로 리셋
git push --force origin main     # ⚠️ force push
cd 앱_app && vercel --prod --yes
```

### 8.4 안정 버전 매칭표

| Tag | Commit | Vercel deployment | 시점 |
|---|---|---|---|
| `v0.4.0-pilot` | `ad24a31` | `dpl_DLDgssJ9g34fQCZZE6wvB8t7mZek` | 2026-04-27 (S17 파일럿 안정 버전) |

추후 안정 버전마다 같은 매칭 (tag + commit + deployment ID) 을 GitHub Release 에 등재 권장.

---

## 9. 알려진 이슈·해결 사례

이전 사이클 (BUNKER-2026-04-27-001) 에서 발견·해결된 CRITICAL 4건. 회귀 시 같은 패턴 적용.

### 9.1 CRITICAL-1 — chat.js HTML 추출 약점 (마크다운 누출)

**증상**: [▶ 시작] → 게임 영역에 \`\`\`html ... 마크다운 ... \`\`\` 그대로 노출.

**원인**: 이전 chat.js v1.5.0 의 `match[1].trim()` 추출이 닫는 백틱 누락 또는 마크다운 응답 시 fallback 못 함.

**해결** (v1.6.0):
- DOCTYPE / `<html` 토큰 검증 추가
- 마크다운 헤더 (`^\s*#{1,6}\s`) 매치 시 즉시 fallback
- `htmlExtractStatus` 4종 응답 → 클라이언트 차별 안내

**위치**: `chat.js:572~609`. 회귀 발견 시 위 검증 로직 점검.

### 9.2 CRITICAL-2 — lesson2.md 본문이 게임에 노출

**증상**: 2차시 [▶ 시작] → lesson2 마크다운이 codeblock 으로 게임 영역에 표시.

**원인**: 이전 lesson2.md v2.0 이 "수업 안내 자료" 형식 (페다고지 안내문) 으로 작성됨 → chat.js 가 게임 명세로 변환 못 해 마크다운 응답.

**해결** (lesson2.md v3.0.0):
- 본문 = "프롬프트 자료" 형식 복원 (lesson1.md 와 동일 패턴)
- 페다고지 흐름은 자비스 캐릭터 게이트 코드로 위임

**예방**: 새 lesson 작성 시 [10.4](#104-lesson-자료-원칙) 참조.

### 9.3 CRITICAL-3 — IP 자동 입력 후 게임 미반응

**증상**: IP 셀 클릭 OK → [▶ 시작] → "LOVE stub" 또는 캐릭터 미적용.

**원인**: IP_PROMPTS 가 상대 경로 (`./에셋_assets/...png`) 사용 → chat.js system prompt (`line 190`) 의 명시적 경고 *"상대 경로 임의 사용 금지 — iframe srcdoc 작동 X"* 위반.

**해결** (app.js v1.10.0):
- IP_META 4 키 모두 절대 URL (`https://gongdo-ai-game.vercel.app/에셋_assets/...`)
- chat.js 매핑표 (line 234~239) 와 글자 단위 일치

**위치**: `app.js:1408`. 회귀 시 절대 URL 검증.

### 9.4 CRITICAL-4 — IP 셀 클릭 시 lesson 본문 유실

**증상**: IP 셀 클릭 → textarea 한 줄만 남고 다른 본문 모두 사라짐.

**원인**: 이전 applyIpPrompt 가 `editor.value = IP_PROMPTS[charKey]` 로 textarea 전체 덮어씀.

**해결** (v1.11.0):
- `applyIpPrompt` 재설계 = 정규식 in-place patch (`HERO_LINE_PATTERN`)
- "- 주인공:" 라인만 변경, 다른 본문 유지
- readonly 잠금 폐기 (학생 자유 편집)

**위치**: `app.js:1526`. 회귀 시 `editor.value = ...PROMPTS[charKey]` 패턴 절대 금지.

### 9.5 MINOR — mirror div 정렬 미세 어긋남

**증상**: 노란 하이라이트가 hero line 외 헤딩 (`### 주인공`) 까지 포함.

**원인**: textarea 와 mirror div 의 `word-break` / 자동 줄바꿈 알고리즘 미세 차이.

**현재 상태**: selection (textarea native ::selection) 으로 정확한 시각 강조 + mirror 는 보조 효과 영구 유지. 학생 학습 흐름 영향 X.

**개선 여지**: mirror padding/font 정확 일치 또는 mirror 폐기 후 selection-only 안내.

---

## 10. 운영 주의사항

### 10.1 GitHub 원격 — push 는 origin 만

```
origin → https://github.com/syn-glitch/gongdo-ai-game.git    ← 운영 (Vercel 연결)
moon   → https://github.com/GongDo-Inc/gongdo-ai-game.git    ← fork (백업/조직 미러)
```

⚠️ **`git push moon main` 절대 금지**. moon 으로 푸시 시 fork 분기 발생 + Vercel 미반영.

### 10.2 Vercel webhook 미복구

- `git push origin main` 만으로는 자동 배포 X
- 매번 `cd 앱_app && vercel --prod --yes` 수동 실행 필수
- 웹훅 복구는 별도 작업 (자비스 PO 위임 권장, 본 문서 범위 외)

### 10.3 키워드 단일 진실

`CHAR_UNLOCK_KEYWORD = 'ㅋㅋ도와줘'` 가 변경되면 **3 곳 동시 갱신**:
1. `app.js:1403` 상수
2. 선생님 PPT 안내 자료 (학교 측 보유)
3. 본 문서

### 10.4 lesson 자료 원칙

- **본문 = 프롬프트 자료** (`### 장르 / 주인공 / 적 / 배경 / 조작 / 규칙` 게임 명세)
- **본문 ≠ 페다고지 안내문** (수업 흐름 안내는 별도 영역)
- deploy_header (HTML 주석) 추가 가능 — `loadLessonFile` 자동 stripping
- 새 차시 추가 시 `manifest.json` lessons 배열 항목도 동시 추가

### 10.5 학생 ID localStorage (별개 기능)

`localStorage.setItem('gongdo-student-id', ...)` 는 **학생 식별 시스템**으로 캐릭터 활성화와 무관. 캐릭터 영속성에서는 `sessionStorage` / `localStorage` 절대 사용 금지이지만 학생 ID 는 손대지 말 것.

### 10.6 IP 매핑 정합성

`app.js IP_META` 와 `chat.js` 매핑표 (line 232~237) 는 **항상 글자 단위 일치**. 한쪽만 변경 시 회귀 (CRITICAL-3 재발).

---

## 11. 변경 이력 요약

본 문서 v1.0.0 기준 (안정 버전 `v0.4.0-pilot` = `ad24a31`).

### BUNKER-2026-04-27-001 사이클

| commit | 변경 |
|---|---|
| `fd76fe5` | feat(lesson2): 캐릭터 버튼 키워드 활성화 + IP 4종 자동 입력 + 페다고지 2단계 재구성 ⚠️ **lesson2.md "페다고지 2단계 재구성" 부분은 후속 commit (`ae03c33`) 에서 폐기 — 본문은 v3.0.0 (프롬프트 자료) 로 복원됨** |
| `ae03c33` | hotfix: CRITICAL-1/3 차단 (chat.js HTML 추출 안전 + IP_PROMPTS 절대 URL) + lesson2.md 본문 복원 (v3.0.0) |
| `ff9c0c5` | refactor(char): applyIpPrompt 재설계 — in-place hero patch + mirror highlight (대표 9차 A안) |
| `ad24a31` | fix(char): 라이브 검수 보강 3건 — 자동 스크롤·노란색·deploy_header stripping ← **현재 안정 (v0.4.0-pilot)** |

### 주요 산출물 위치 (운영 리포 외부, 개발 메타)

본 문서는 운영 리포에 있지만, 사이클 중 송PO/김감사/박DC/자비스 작업 로그는 별도 폴더:
- 주관 task: `Warren Buffett/bunker/tasks/2026-04/task_2차시_캐릭터버튼_2단계_재구성.md` (v1.4.0)
- 자비스 sub_task: `Warren Buffett/jarvis-dev/tasks/2026-04/sub_task_캐릭터버튼_활성화_UI.md`
- 김감사 QA 보고서: `Warren Buffett/kim-qa/reports/2026-04/QA-task-2026-04-27-001.md` (Phase A0) + `QA-2026-04-27-001.md` (Phase C v1·v2)
- 슈베이스 sub_task: `Warren Buffett/jarvis-dev/tasks/2026-04/sub_task_배포_Phase_D.md`

(외부 개발자에게 전달은 본 문서로 충분. 위 메타 자료는 운영 디버그용.)

---

## 12. 연락처·역할

본 프로젝트는 5 영역 분담 운영. 외부 개발자 (문유나/김민석) 가 이슈 진단 시 영역별로 다음을 참조.

| 영역 | 책임 | 본 문서 섹션 |
|---|---|---|
| **코드 (UI/JS/CSS)** | 자비스 개발팀 (FE 클로이) | [4](#4-핵심-기능-명세), [5](#5-코드-가이드), [9](#9-알려진-이슈해결-사례) |
| **lesson 자료** | 박DC (벙커 문서팀) | [4.5](#45-lesson-자료-표준--deploy_header-stripping), [10.4](#104-lesson-자료-원칙) |
| **QA** | 김감사 QA팀 | [9](#9-알려진-이슈해결-사례) (이슈 식별), [6.4](#64-라이브-검증-매트릭스) (검증 매트릭스) |
| **배포** | 슈베이스 DevOps | [7](#7-배포-절차), [8](#8-롤백-절차) |
| **기획·총괄** | 송PO (벙커 팀장) | 사이클 의사결정, 본 문서 [11](#11-변경-이력-요약) |
| **문서 표준** | 꼼꼼이 (Docs Team Lead) | 본 문서 작성·유지 |

### 외부 개발자 (문유나·김민석) 진입 시 권장 흐름

1. **이슈 보고 받음** (사용자 또는 라이브 모니터링)
2. [2. 5분 진단 가이드](#2-5분-진단-가이드) 로 1차 진단
3. 매칭되는 [9. 알려진 이슈](#9-알려진-이슈해결-사례) 사례 확인
4. [5. 코드 가이드](#5-코드-가이드) 로 정확한 file:line 진입
5. fix → [6.4 라이브 검증 매트릭스](#64-라이브-검증-매트릭스) 로 자체 검증
6. [7. 배포 절차](#7-배포-절차) 로 commit + push + vercel 배포
7. 라이브 검증 통과 → 송PO 또는 사용자에게 결과 공유
8. 심각한 변경 시 새 안정 tag 생성 (`v0.5.0-...` 등) + GitHub Release

### 응급 시 — 롤백 우선

확신 없는 변경보다 [8. 롤백 절차](#8-롤백-절차) 의 옵션 A (Vercel 대시보드 Promote) 가 5초 안에 안정 상태 복귀. 그 후 차분히 원인 분석.

---

## 부록 A — 자주 사용하는 명령어 모음

```bash
# 클론
gh repo clone syn-glitch/gongdo-ai-game

# 의존성 설치
cd gongdo-ai-game/앱_app && npm install

# 로컬 개발 (정적)
cd 앱_app && node dev-server.js
# → http://localhost:3000

# 로컬 개발 (풀스택, ANTHROPIC_API_KEY 필요)
cd 앱_app && npm run dev

# 배포
cd /Users/syn/Documents/dev/gongdo-ai-game
git add <파일>
git commit -m "..."
git push origin main
cd 앱_app && vercel --prod --yes

# 라이브 검증
curl -sI https://gongdo-ai-game.vercel.app/ | head -5

# 안정 버전 tag 확인
git tag -l "v*" -n1

# 안정 버전으로 롤백 준비
git fetch --tags
git log --oneline v0.4.0-pilot

# Vercel deployment 목록
vercel ls gongdo-ai-game

# Vercel 특정 deployment 정보
vercel inspect <deployment-id-or-url>
```

---

## 부록 B — 운영 메모 (꼼꼼이 등재)

다음 사항은 코드만 봐서는 알기 어려운 운영 컨텍스트:

- **Vercel webhook 미복구**: 매번 `vercel --prod --yes` 수동
- **GitHub 원격 2개**: `origin (syn-glitch)` 운영 / `moon (GongDo-Inc)` fork — push 절대 금지
- **Vercel 프로젝트 root**: `앱_app/` (레포 root 아님). `.vercel/` 도 `앱_app/` 안
- **Vercel CLI 계정**: `syn-7532` 팀 `syn-7532s-projects`
- **lesson 자료**: 본문 = 프롬프트 자료 / 페다고지 안내는 별도 영역 / deploy_header 자동 stripping
- **학생 ID 별도**: `localStorage.gongdo-student-id` 는 캐릭터 영속성과 무관, 손대지 말 것
- **IME 처리**: `compositionstart` / `compositionend` 모달 키워드 검증 필수 (한글 조합 중 [확인] disabled)
- **mirror highlight**: textarea 와 정렬 어긋남 가능 — selection 이 정확한 시각 강조 담당

---

**문서 끝.**
**버전**: v1.0.0 (2026-04-27, 꼼꼼이)
**다음 갱신 권장**: 다음 사이클 (`v0.5.0` 또는 새 안정 tag) 출시 시 본 문서 v1.1.0 갱신
