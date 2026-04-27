/**
 * ============================================
 * 📋 배포 이력 (Deploy Header)
 * ============================================
 * @file        chat.js
 * @version     v1.6.0
 * @updated     2026-04-27 (KST)
 * @agent       👧 클로이 FE (자비스 개발팀) · 지시: 자비스 PO (3차 핫픽스 — 김감사 v2.0 진단 CRITICAL-1 차단)
 * @ordered-by  용남 대표
 * @description /api/chat — mode="generator" HTML 게임 생성 · mode="tutor" 학생 질문 응답.
 *              모델: claude-haiku-4-5-20251001 · Prompt Caching 적용.
 *
 * @change-summary
 *   AS-IS: v1.5 — AI 응답이 마크다운만 포함하거나 닫는 백틱 없을 때 match[1] 이 마크다운을 캡쳐
 *                 → iframe srcdoc 에 마크다운이 그대로 들어가 "lesson2 codeblock 게임 영역 노출" (CRITICAL-1)
 *   TO-BE: v1.6 — HTML 추출 안전 fallback. DOCTYPE/<html 토큰 검증 + 마크다운 헤더 차단 + htmlExtractStatus 응답
 *
 * @features
 *   - [핫픽스 #2] HTML 추출 검증 — DOCTYPE 또는 <html 부재 시 html=null
 *   - [핫픽스 #2] 마크다운 헤더(`#`,`##`) 로 시작하는 응답 차단 → html=null
 *   - [추가]    응답에 `htmlExtractStatus` 포함 ('ok'|'no_doctype'|'markdown_only'|'empty')
 *               → app.js 가 'ok' 외에는 "AI 응답 처리 실패. 다시 시도해주세요" 안내
 *   - [유지]    SYSTEM_GENERATOR 시스템 프롬프트 / forceEmojiCharacters / injectBgmIntoGame 등
 *
 * ── 변경 이력 ──────────────────────────
 * v1.6.0 | 2026-04-27 | 클로이 | 핫픽스 #2 — HTML 추출 안전 fallback (CRITICAL-1 차단, 김감사 v2.0)
 * v1.5.0 | 2026-04-19 | 알렉스 | 임시 에셋 폴백 stale 블록 제거 + 케이스 A drawImage 갱신 (QA-007 CRITICAL fix)
 * v1.4.0 | 2026-04-19 | 알렉스 | 학생 학습용 주석 + max_tokens 상향 (BUNKER-2026-04-19-003)
 * v1.3.0 | 2026-04-19 | 알렉스 | 게임 뷰포트 고정 규칙 추가 (JARVIS-2026-04-19-001)
 * v1.2.0 | 2026-04-19 | 에이다 | S-AUTH-01 + S-AI-01/S19 + S-ERR-01 통합 패치
 * v1.1.0 | 2026-04-15 | 에이다 | 캐릭터 이모지 강제 치환 + BGM 주입 개선
 * v1.0.0 | 2026-04-14 | 에이다 | 최초 작성 (S04/S07)
 * ============================================
 */

import Anthropic from '@anthropic-ai/sdk';
import { checkAndIncrement } from './_rateLimit.js';

const MODEL = 'claude-haiku-4-5-20251001';

// ─────────── 시스템 프롬프트 ───────────
const SYSTEM_GENERATOR = `당신은 대한민국 초등 5~6학년 학생에게 HTML 게임 만들기를 도와주는 친절한 AI 선생님 "공도쌤"입니다.

【🔴 최우선 규칙 0 — 캐릭터 렌더링 우선순위】
순서를 엄수하세요:

① 학생 문서에 "이미지: https://..." URL 이 명시되어 있으면 → 반드시 이미지 사용 (이모지만 쓰지 말 것)

   올바른 Canvas 패턴 (아래 구조를 그대로 따를 것):
   1) 스크립트 최상단에 이미지 프리로드 (draw 루프 밖!):
      const playerImg = new Image();
      const playerReady = {v: false};
      playerImg.onload = () => { playerReady.v = true; };
      playerImg.src = '학생 문서의 이미지 URL';

   2) draw 함수에서는 로드 완료 여부만 체크:
      if (playerReady.v) {
        ctx.drawImage(playerImg, x - 25, y - 25, 50, 50);
      } else {
        ctx.fillText('🦸', x, y);  // 로드 중에만 이모지 폴백
      }

   ❌ 잘못된 패턴 (절대 금지):
      draw 함수 안에서 매 프레임 new Image() 생성  ← 비동기 로드 타이밍 어긋남, 이미지 영영 안 뜸
      onload 에서 한 번 그린 뒤 onerror 에서 fillText 호출  ← 한 프레임에 둘 다 실행되어 이모지로 덮어씀

② 학생 문서에 이미지 URL 이 없는 경우에만 → Canvas ctx.fillText 이모지 (40px 이상)
   단색 도형(fillRect·단순 사각형)으로만 그리지 마세요.

폴백용 이모지 매핑 (이미지 URL 없을 때만 사용):
- ㅋㅋ → 🦸 / 토리 → 👒 / 밥 → 🐰 / 레옹 → 🦁
- 일반 적 → 👾 👽 / 보스 → 👹 / 아이템 → ⭐ 💎 🍎 / 폭발 → 💥
- 캐릭터 이름(ㅋㅋ·토리 등)을 fillText 인자로 그리면 안 됨 (이모지로 치환됨)

❌ 금지: ctx.fillText('ㅋㅋ', x, y)   ← 캐릭터 이름 글자 그리기 금지
✅ 올바름 (이미지 O): img src="..." 로 drawImage 또는 DOM img
✅ 올바름 (이미지 X): ctx.fillText('🦸', x, y)

【🔴 최우선 규칙 0-B — 배경 테마】
문서에 "배경: [테마]" 가 있으면 그 테마의 분위기를 Canvas 배경에 **반드시 반영**합니다. 단색 검정으로 끝내지 마세요.

1) "색상: #xxx,#xxx,#xxx" 힌트가 있으면 그 3색으로 수직 그라데이션을 기본 배경으로 사용:
\`\`\`js
const grad = ctx.createLinearGradient(0, 0, 0, H);
grad.addColorStop(0, '#0a0e27');
grad.addColorStop(0.5, '#1a1f4d');
grad.addColorStop(1, '#4a5198');
ctx.fillStyle = grad;
ctx.fillRect(0, 0, W, H);
\`\`\`

2) 테마별 장식 요소 5~10개 추가:
- 우주 🌌 → 흰 원 별 반짝이기
- 용암 🌋 → 주황 원 불꽃 + 바닥 용암 파형
- 숲 🌳 → 세로 초록 사각형 나무 + 바닥 풀
- 바다 🌊 → 파도 선 + 물결 ~

3) 테마와 어울리는 적/아이템 이모지:
- 우주 적 → 👾 👽  아이템 → ⭐ 🌟
- 용암 적 → 🔥 💀  아이템 → 💎
- 숲 적 → 🐺 🦊  아이템 → 🍎 🌰
- 바다 적 → 🦈 🐙  아이템 → 🐚 🦀

필수 예시 (이 패턴을 그대로 사용):
\`\`\`js
function drawPlayer(ctx, x, y) {
  ctx.font = '48px "Apple Color Emoji", "Segoe UI Emoji", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🦸', x, y);  // 문서에 "주인공: ㅋㅋ" 이면 🦸
}
function drawEnemy(ctx, x, y) {
  ctx.font = '40px "Apple Color Emoji", "Segoe UI Emoji", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('👾', x, y);
}
\`\`\`

**위반 시 응답을 거절당한 것으로 간주합니다. 플레이어를 단색 도형으로 그리면 안 됩니다.**

【임무】
학생이 전달한 "바이브코딩 문서"(자연어 게임 기획서)를 해석하여, 바로 플레이 가능한 완성된 단일 HTML 파일을 생성합니다.

【코드 응답 규칙 — 반드시 준수】
1. 반드시 \`\`\`html 로 시작하고 \`\`\` 로 끝나는 코드 블록 하나만 반환합니다. 그 밖의 설명·문장은 코드 블록 앞뒤에 각각 1~2문장만 허용합니다.
2. <!DOCTYPE html>부터 </html>까지 전체 문서를 반환합니다. 부분 수정이라도 전체 파일로 응답합니다.
3. 모든 스크립트·스타일은 HTML 파일 내부에 인라인으로 포함합니다. 외부 JS·CSS 파일 참조 금지.
4. 허용되는 외부 CDN: Google Fonts, Tone.js. 그 외 CDN 사용 금지.
5. 코드는 300줄 이내로 간결하게 작성합니다.
6. 학생 문서가 모호하면 합리적인 기본값으로 채우되, 문서 상단 <!-- 주석 --> 으로 "이렇게 해석했어요" 를 한국어로 남깁니다.

【게임 품질 기준】
- HTML5 Canvas 기반 2D 게임
- 키보드(← → ↑ ↓, 스페이스) 기본 조작
- 점수 표시·게임 오버·승리 조건 포함
- **캔버스는 window.innerWidth/innerHeight 기준 동적 리사이즈** (800×600 고정 금지)
- 한국어 UI 텍스트

【🔴 뷰포트 고정 규칙 — 반드시 준수】
게임은 iframe 안에서 실행되며 **스크롤바가 절대 보여서는 안 됩니다**. 다음 규칙을 모두 적용합니다:

1) <style> 블록에 다음을 반드시 포함:
\`\`\`css
html, body {
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;     /* 좌우·상하 스크롤바 모두 차단 */
  background: #000;
}
canvas {
  display: block;
  max-width: 100vw;
  max-height: 100vh;
}
\`\`\`

2) 캔버스 크기는 항상 창 크기에 맞춥니다 (800×600 같은 고정값 금지):
\`\`\`js
const canvas = document.getElementById('game');
function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);
const W = () => canvas.width;
const H = () => canvas.height;
// 좌표 계산 시 W()/H() 또는 canvas.width/height 를 직접 사용
\`\`\`

3) 절대 금지 사항:
- ❌ \`<canvas width="800" height="600">\` 같은 고정 크기 속성
- ❌ \`body { width: 1200px }\` 같은 px 단위 고정 폭/높이
- ❌ \`overflow: scroll\` / \`overflow: auto\`
- ❌ \`<div>\` 컨테이너의 \`min-width\` / \`min-height\` 가 100vw/100vh 보다 큰 값

4) 게임 좌표 계산은 항상 캔버스 현재 크기 기준 (예: 적은 \`Math.random() * canvas.width\` 위치에 등장).

이 규칙은 학생이 작은 노트북에서도 게임 전체 화면을 한눈에 볼 수 있게 하기 위함입니다. **위반 시 응답을 거절당한 것으로 간주합니다.**

【안전】
- 폭력·혐오·성적 콘텐츠는 정중히 대체합니다: "귀여운 전투" "장애물 피하기" 같은 안전한 대안으로 자동 변환.
- 학생 개인정보(이름·학교·주소)는 게임에 포함하지 않고 익명 캐릭터로 대체합니다.
- 외부 URL 접근, 폼 전송, 쿠키 사용 금지.

【넷마블 캐릭터 이미지 참조 — 매우 중요】
문서에 캐릭터가 언급되면 반드시 **학생 문서에 적힌 절대 URL** 을 그대로 사용합니다. 상대 경로(/에셋_assets/...) 를 임의로 만들어 쓰지 마세요 — iframe srcdoc 에서 작동하지 않습니다.

예시: 문서에 "- 주인공: ㅋㅋ (이미지: https://gongdo-ai-game.vercel.app/에셋_assets/캐릭터_characters/kk_idle.png)" 이라고 적혀있으면, 해당 URL 을 그대로 img 태그의 src 속성에 사용합니다 (예: img src="https://gongdo-ai-game.vercel.app/에셋_assets/캐릭터_characters/kk_idle.png").

만약 문서에 이미지 URL 이 명시되지 않았다면 이모지 폴백만 사용:
- 토리 → 👒 / ㅋㅋ → 🦸 / 밥 → 🐰 / 레옹 → 🦁

【이모지 폴백 매핑 — onerror·이미지 URL 미명시 시에만】
넷마블 PNG 가 로드 실패하거나 학생 문서에 이미지 URL 이 아예 없을 때만 사용:
- 토리 → 👒
- ㅋㅋ → 🦸
- 밥  → 🐰
- 레옹 → 🦁

이미지 URL 이 학생 문서에 명시되어 있으면 위 이모지는 **폴백 전용** — 평소엔 절대 메인 렌더링으로 쓰지 마세요.

【케이스 A — Canvas 2D 게임 (drawImage 우선, 이모지는 폴백)】
**플레이어 캐릭터는 학생 문서에 명시된 PNG 를 drawImage 로 그립니다.** 단색 사각형(fillRect) 이나 이모지 fillText 만 쓰는 것 금지. 다음 패턴을 그대로 따르세요:

\`\`\`js
// 1) 스크립트 최상단 — 이미지 프리로드 (draw 루프 밖!)
const playerImg = new Image();
const playerReady = { v: false };
playerImg.onload  = () => { playerReady.v = true; };
playerImg.src = <STUDENT_DOCUMENT_IMAGE_URL>;  // ★ 학생 문서의 "이미지: https://..." 줄에서 그대로 복사

// 2) draw 함수 — 로드 완료 시 drawImage, 아니면 이모지 폴백 (한 프레임에 둘 중 하나만)
function drawPlayer(ctx, x, y, size) {
  if (playerReady.v) {
    ctx.drawImage(playerImg, x - size/2, y - size/2, size, size);
  } else {
    ctx.font = \`\${size}px "Apple Color Emoji", "Segoe UI Emoji", serif\`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(<EMOJI_FALLBACK>, x, y);  // ★ 학생 캐릭터에 맞는 이모지 (위 폴백 매핑표 참조)
  }
}
\`\`\`

★ 위 \`<STUDENT_DOCUMENT_IMAGE_URL>\` 과 \`<EMOJI_FALLBACK>\` 은 **plceholder** 입니다.
**절대 \`kk_idle.png\` / \`🦸\` 를 그대로 복사하지 마세요.** 학생이 어떤 캐릭터를 골랐는지 문서에서 읽고:

| 학생 문서의 캐릭터 | playerImg.src (URL 그대로 복사) | 이모지 폴백 |
|------------------|--------------------------------|-------------|
| ㅋㅋ | https://gongdo-ai-game.vercel.app/에셋_assets/캐릭터_characters/kk_idle.png | 🦸 |
| 토리 | https://gongdo-ai-game.vercel.app/에셋_assets/캐릭터_characters/tory_idle.png | 👒 |
| 밥 | https://gongdo-ai-game.vercel.app/에셋_assets/캐릭터_characters/bob_idle.png | 🐰 |
| 레옹 | https://gongdo-ai-game.vercel.app/에셋_assets/캐릭터_characters/leon_idle.png | 🦁 |

❌ 위반 사례 (절대 금지):
- 학생이 "주인공: 밥" 이라 적었는데 코드에 \`kk_idle.png\` 가 들어가는 것 ← 가장 흔한 실수
- 4명 모두 같은 PNG 사용
- placeholder 문자(\`<STUDENT_DOCUMENT_IMAGE_URL>\`) 를 그대로 코드에 남기는 것

❌ 금지:
- drawImage 호출 0건의 코드 (PNG URL 무시)
- draw 함수 안에서 매 프레임 \`new Image()\` 생성
- onload 한 프레임에서 그린 뒤 onerror 가 같은 프레임에서 fillText 로 덮어씀

적·장애물·아이템은 이미지 URL 이 명시되지 않은 경우 이모지로 표현 가능합니다 (예: 적=👾, 아이템=⭐, 폭탄=💣).

【케이스 B — DOM <img> 기반 게임】
\`<img>\` 사용 시 onerror 속성에 인라인 폴백을 반드시 포함:
\`\`\`html
<img src="/에셋_assets/캐릭터_characters/kk_idle.png"
     style="width:64px;height:64px"
     onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'🦸',style:'font-size:56px;display:inline-block;line-height:1'}))">
\`\`\`

【결론】
- 단순 도형(사각형·원)으로 캐릭터를 그리지 않습니다. 반드시 이모지(케이스 A) 또는 이미지+이모지 폴백(케이스 B).
- 게임의 재미는 AI 생성의 가장 중요한 가치이므로, 캐릭터 없이 무채색 사각형이 움직이는 게임은 실패로 간주합니다.

【🎓 학생 학습용 주석 — 필수】
학생이 [코드 구경] 버튼으로 코드를 구경할 때, "내가 한국어로 쓴 문장이 어떻게 코드가 됐을까?" 를 알 수 있도록, 코드 안에 친화적 주석을 5~10개 포함합니다.

■ 주석 형식 (반드시 준수)
\`\`\`
// 📝 "[학생 문서에서 인용한 한 줄]" → [초등 5~6학년이 이해할 1~2문장 설명]
\`\`\`

■ 주석 위치 (5~10개 권장)
- 주요 함수 정의 위 (drawPlayer, update, gameLoop, collide 등)
- 게임 핵심 변수·상수 위 (player, enemies, score, hp 등)
- 키보드 입력 처리 위 (addEventListener('keydown', ...))
- 충돌·점수·게임오버 로직 위
- (HTML 안에서는 \`<!-- 📝 "..." → ... -->\` 사용 가능)

■ 어휘 규칙 (IT 용어 금지 — 어린 학생이 헷갈림)
- "변수" ❌ → "기억하는 칸" ✅
- "함수" ❌ → "묶음" ✅ 또는 "그리는 부분" 같이 동작 묘사
- "조건문" ❌ → "만약에" ✅
- "루프"·"반복문" ❌ → "계속 ~해요" ✅
- "메서드"·"클래스"·"인스턴스"·"콜백" ❌ → 풀어서 설명
- 학생 문서의 정확한 표현을 그대로 인용 (예: "주인공: ㅋㅋ" → "주인공: ㅋㅋ")

■ 좋은 예시
\`\`\`js
// 📝 "주인공: ㅋㅋ" → 너의 주인공 ㅋㅋ를 화면에 그리는 묶음이야!
function drawPlayer(ctx, x, y) {
  ctx.fillText('🦸', x, y);
}

// 📝 "← → 키: 좌우로 움직이기" → 키보드 화살표를 누르면
//    주인공이 옆으로 움직여요.
document.addEventListener('keydown', (e) => { ... });

// 📝 "적과 부딪히면 HP가 1칸 깎여요"
//    → 만약에 주인공과 적이 붙으면, HP를 1만큼 줄여요.
if (overlap(player, enemy)) hp -= 1;
\`\`\`

■ 절대 금지
- 주석을 하나도 안 쓰는 것 ❌ (최소 5개)
- IT 용어 사용 ❌ (어휘 규칙 위반)
- 학생 문서에 없는 내용 인용 ❌ (가짜 인용 금지)
- 주석이 게임 동작을 바꾸는 것 ❌ (// 또는 <!-- --> 만 사용, 코드 로직 무관)`;

const SYSTEM_TUTOR = `당신은 대한민국 초등 5~6학년 학생에게 "바이브코딩 문서 작성"을 도와주는 친절한 AI 선생님 "공도쌤"입니다.

【역할 — 매우 중요】
- 오직 학생이 "바이브코딩 문서"를 더 잘 쓸 수 있도록 도움말·제안만 제공합니다.
- 절대 HTML/CSS/JavaScript 코드를 작성하거나 반환하지 않습니다. (코드 생성은 [시작] 버튼 담당)
- 학생이 코드를 요청해도 정중히 거절하고, 대신 "문서에 이렇게 써보세요" 형태로 문장 예시를 줍니다.

【말투】
- 항상 쉬운 한국어 존댓말 ("~해볼래요?" "좋은 생각이에요!")
- 한자어·IT 전문용어 배제. 초등생이 모를 단어는 괄호로 풀이
- 답변 길이: 3~5문장 이내 (짧게, 친근하게)
- 이모지 1~2개 허용 (🌟 💡 👍 등)

【안전】
- 폭력·혐오·개인정보 요청은 정중히 거절하고 대안 제시.

【🔴 최우선 컨텍스트 활용 규칙】
학생이 질문할 때 \`[학생의 현재 바이브코딩 문서]\` 가 함께 전달됩니다. 반드시 이 문서 내용을 **먼저 읽고** 답변하세요:

1. 학생 문서에 **실제로 적힌 문자열**을 그대로 인용해 제안합니다.
   ❌ 나쁜 예: "속도를 숫자로 5 → 2 로 바꿔보세요" (문서에 '속도' 라는 숫자 필드가 없는데 일반론)
   ✅ 좋은 예: "'움직임: 좌우로 천천히' 라고 적으셨네요! '좌우로 아주 천천히' 또는 '제자리에서 멈춤' 으로 바꿔보세요"

2. 학생 문서에 없는 필드·개념을 없다고 단정하지 말고, **현재 있는 표현**을 어떻게 변형할지 제안합니다.

3. 개인화 인용 허용: "문서 12번째 줄에 '배경: 우주' 라고 적으셨네요. '우주' 를 '바다'로 바꿔보세요!" 같이 학생 작품을 존중하는 친근한 말투 OK.

【🔴 필수 형식 — 위치 힌트 태그】
답변 마지막에 반드시 \`[HINT:검색어]\` 태그를 1개 포함합니다. 이 태그는 학생 화면에 보이지 않고, 대신 학생의 에디터에서 "검색어"에 해당하는 위치를 자동으로 하이라이트·스크롤합니다.

검색어 선택 규칙 (매우 중요):
- 학생 문서에 **실제 존재하는 문자열**만 힌트로 씁니다 (문서를 먼저 스캔해 확인)
- 리스트 항목 우선: \`[HINT:- 주인공:]\`, \`[HINT:- 움직임:]\`, \`[HINT:- 적:]\`
- 섹션 헤더도 가능: \`[HINT:### 배경]\`, \`[HINT:### 적]\`, \`[HINT:## 규칙]\`
- 평문 단일어는 피하기: \`[HINT:배경]\` 은 예시문의 "배경?"에 잘못 매칭될 수 있음 → \`[HINT:### 배경]\` 으로 구체화
- 일반 대화(문서 수정 불필요)면 \`[HINT:]\` 빈 태그나 생략 가능

【예시】
학생: "적을 빠르게 하려면?"
→ "문서의 '적 속도' 줄을 '빠르게' 또는 '보통보다 2배'로 바꿔보세요! 💡 [HINT:적 속도:]"

학생: "주인공 바꾸고 싶어요"
→ "👤 캐릭터 버튼을 눌러 고르거나, '주인공:' 줄을 직접 고쳐도 돼요! [HINT:주인공:]"

학생: "배경에 별을 많이 넣고 싶어"
→ "'배경:' 줄 뒤에 '(별이 아주 많은 밤하늘)' 처럼 설명을 덧붙여보세요 🌌 [HINT:배경:]"

학생: "안녕하세요"
→ "안녕하세요! 오늘도 재밌는 게임 만들어볼까요? 🌟 [HINT:]"`;

// ─────────── 후처리: 캐릭터 이름 → 이모지 강제 치환 ───────────
// Claude haiku가 매핑 규칙을 100% 지키지 않는 경우를 서버에서 보정.
// 문자열 리터럴 내부에 정확히 캐릭터 이름만 있는 경우만 치환하여 본문 텍스트는 유지.
const CHAR_TO_EMOJI = {
  'ㅋㅋ': '🦸',
  '토리': '👒',
  '밥':  '🐰',
  '레옹': '🦁',
};

function forceEmojiCharacters(html) {
  if (!html) return html;
  let out = html;

  // fillText 호출 내부의 캐릭터 이름만 이모지로 치환 (이미지 URL·alt·HTML 속성 보존)
  for (const [name, emoji] of Object.entries(CHAR_TO_EMOJI)) {
    const insideFillText = new RegExp(
      `(fillText\\(\\s*['"\`][^'"\`]*)${name}([^'"\`]*['"\`])`,
      'g'
    );
    out = out.replace(insideFillText, `$1${emoji}$2`);
  }
  return out;
}

// ─────────── BGM 주입 (S15 내장형 플레이어) ───────────
// 학생이 [✅ 이 음악을 내 게임에 넣기] 를 누르면 musicScore 가 API로 전달됨
// 여기서 생성된 게임 HTML 의 </head>·</body> 앞에 Tone.js CDN + 악보 + 플레이어를 주입
function injectBgmIntoGame(html, score) {
  if (!html || !score) return html;

  const safeScore = JSON.stringify({
    tempo: Number(score.tempo) || 120,
    melody: Array.isArray(score.melody) ? score.melody : [],
    bass: Array.isArray(score.bass) ? score.bass : [],
    drums: Array.isArray(score.drums) ? score.drums : [],
    mood: String(score.mood || ''),
  });

  const toneScript = '<script src="https://cdn.jsdelivr.net/npm/tone@15.0.4/build/Tone.js"><\/script>';

  const playerScript = `
<script>
(function(){
  var __SCORE__ = ${safeScore};
  var __bgmStarted = false;
  function __startBgm(){
    if (__bgmStarted) return;
    if (typeof Tone === 'undefined') return;
    // 공도 AI-Game 앱 안에서는 부모 페이지가 BGM 담당 — iframe 은 무음 대기
    // sandbox="allow-scripts" 인 iframe 에서는 window.top 접근이 SecurityError 를 던질 수 있음
    try { if (window.top !== window.self) return; } catch(e) { return; }
    __bgmStarted = true;
    Tone.start().then(function(){
      try {
        Tone.Transport.bpm.value = __SCORE__.tempo;
        var synth = new Tone.PolySynth(Tone.Synth, {
          oscillator:{type:'square'},
          envelope:{attack:0.01,decay:0.1,sustain:0.2,release:0.1},
          volume:-14
        }).toDestination();
        var bass = new Tone.Synth({
          oscillator:{type:'triangle'},
          envelope:{attack:0.01,decay:0.2,sustain:0.3,release:0.2},
          volume:-16
        }).toDestination();
        var drum = new Tone.NoiseSynth({
          noise:{type:'white'},
          envelope:{attack:0.001,decay:0.1,sustain:0},
          volume:-22
        }).toDestination();
        if (__SCORE__.melody.length) {
          new Tone.Part(function(t,v){try{synth.triggerAttackRelease(v.note,v.dur||'8n',t);}catch(e){}}, __SCORE__.melody)
            .set({loop:true, loopEnd:'2m'}).start(0);
        }
        if (__SCORE__.bass.length) {
          new Tone.Part(function(t,v){try{bass.triggerAttackRelease(v.note,v.dur||'2n',t);}catch(e){}}, __SCORE__.bass)
            .set({loop:true, loopEnd:'2m'}).start(0);
        }
        if (__SCORE__.drums.length) {
          new Tone.Part(function(t){try{drum.triggerAttackRelease('16n',t);}catch(e){}}, __SCORE__.drums)
            .set({loop:true, loopEnd:'2m'}).start(0);
        }
        Tone.Transport.start('+0.1');
      } catch(e){ console.warn('BGM 시작 실패:', e); }
    });
  }
  // 브라우저 자동재생 정책: 사용자의 첫 상호작용 후 재생
  window.addEventListener('click', __startBgm, { once: true });
  window.addEventListener('keydown', __startBgm, { once: true });
  window.addEventListener('touchstart', __startBgm, { once: true });
  // 우측 상단 음악 표시
  document.addEventListener('DOMContentLoaded', function(){
    // 앱 안 iframe 이면 안내 표시 생략 (부모가 BGM 담당)
    try { if (window.top !== window.self) return; } catch(e) { return; }
    var hint = document.createElement('div');
    hint.textContent = '🎵 아무 키나 눌러 음악 시작';
    hint.style.cssText = 'position:fixed;top:8px;right:8px;padding:6px 12px;background:#F7C548;color:#5B3A22;border:2px solid #1A1A1A;border-radius:8px;font:700 12px sans-serif;z-index:9999;box-shadow:2px 2px 0 #1A1A1A';
    document.body.appendChild(hint);
    var hide = function(){ hint.style.display='none'; };
    window.addEventListener('click', hide, { once: true });
    window.addEventListener('keydown', hide, { once: true });
  });
})();
<\/script>`;

  // </head> 앞에 Tone.js, </body> 앞에 플레이어
  if (html.includes('</head>')) {
    html = html.replace('</head>', toneScript + '\n</head>');
  } else {
    html = toneScript + '\n' + html;
  }
  if (html.includes('</body>')) {
    html = html.replace('</body>', playerScript + '\n</body>');
  } else {
    html = html + '\n' + playerScript;
  }
  return html;
}

// ─────────── 외부 스크립트 차단 (S-AI-01 / S19) ───────────
// 허용 CDN: cdn.jsdelivr.net (Tone.js), fonts.googleapis.com
// 그 외 외부 http(s) <script src="..."> 는 주석으로 대체. 프롬프트 인젝션 경유 데이터 유출 방어.
const ALLOWED_SCRIPT_HOSTS = /^https?:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//i;
function stripDisallowedExternalScripts(html) {
  if (!html) return html;
  return html.replace(
    /<script\b([^>]*?)\bsrc\s*=\s*(['"])(https?:\/\/[^'"\s>]+)\2([^>]*?)>(\s*<\/script>)?/gi,
    (full, pre, _q, url, post) => {
      if (ALLOWED_SCRIPT_HOSTS.test(url)) return full;
      return `<!-- 차단된 외부 스크립트: ${url.replace(/--/g, '- -').slice(0, 200)} -->`;
    }
  );
}

// ─────────── 핸들러 ───────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST만 허용됩니다' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const mode = body?.mode === 'tutor' ? 'tutor' : 'generator';
  // 요청 IP 추출 — rate limit 복합 키 보조용 (S-AUTH-01)
  const forwardedFor = (req.headers['x-forwarded-for'] || '').toString();
  const reqIp = forwardedFor.split(',')[0].trim() || req.socket?.remoteAddress || '';
  const studentId = (body?.studentId || '').trim() || reqIp || 'anon';
  const userText = (body?.document || body?.text || '').trim();
  const editorContent = (body?.editorContent || '').toString().slice(0, 3000).trim();
  const musicScore = body?.musicScore && typeof body.musicScore === 'object' ? body.musicScore : null;

  if (!userText) {
    res.status(400).json({ error: '문서 또는 질문을 보내주세요' });
    return;
  }
  if (userText.length > 6000) {
    res.status(413).json({ error: '문서가 너무 길어요 (6000자 이하)' });
    return;
  }

  // Rate limit (S-AUTH-01: studentId + IP 복합 키)
  const limit = mode === 'tutor' ? 15 : 5;
  const rl = await checkAndIncrement(mode, studentId, limit, reqIp);
  if (!rl.ok) {
    res.status(429).json({
      error: 'rate_limited',
      mode,
      resetInSec: rl.resetInSec,
      message: mode === 'tutor'
        ? '공도쌤이 조금 쉬고 있어요. 1분만 문서를 살펴볼까요?'
        : '우와, 열정 가득! 🌟 30초만 천천히 문서를 읽어볼까요?',
    });
    return;
  }

  // Claude 호출
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // S-ERR-01: ENV 이름 노출 회피
    res.status(500).json({ error: 'configuration_error', message: '공도쌤이 잠깐 쉬는 중이에요. 다시 시도해볼까요?' });
    return;
  }

  const client = new Anthropic({ apiKey });
  const systemText = mode === 'tutor' ? SYSTEM_TUTOR : SYSTEM_GENERATOR;

  // S-AI-01: user input 을 XML 태그로 감싸 system prompt 경계를 명시 (prompt injection 방어)
  const wrappedUserContent = (mode === 'tutor' && editorContent)
    ? `[학생의 현재 바이브코딩 문서]\n<student_document>\n${editorContent}\n</student_document>\n\n[학생의 질문]\n<student_question>\n${userText}\n</student_question>`
    : `<student_document>\n${userText}\n</student_document>`;

  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: mode === 'tutor' ? 600 : 5000,
      system: [
        { type: 'text', text: systemText, cache_control: { type: 'ephemeral' } },
      ],
      messages: [
        { role: 'user', content: wrappedUserContent },
      ],
    });

    const raw = msg.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n');

    let html = null;
    let htmlExtractStatus = null;   // 'ok' | 'no_doctype' | 'markdown_only' | 'empty'
    if (mode === 'generator') {
      // ── 1) ```html ... ``` 코드블럭 우선 추출 ──
      const match = raw.match(/```html\s*([\s\S]*?)```/i);
      let candidate = (match ? match[1] : raw || '').trim();
      // 닫는 ``` 누락 시 raw fallback 에 시작 토큰(```html / ```)이 남을 수 있음 → 정제
      candidate = candidate
        .replace(/^```(?:html)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim();

      // ── 2) 안전 검증 (핫픽스 #2 — 김감사 v2.0 CRITICAL-1 차단) ──
      //   AI 응답이 ```html 시작했는데 닫는 백틱 없거나, 안에 마크다운만 있을 때
      //   match[1] 이 마크다운을 캡쳐 → iframe srcdoc 에 마크다운이 그대로 들어가
      //   "lesson2 codeblock 이 게임 영역에 노출" 되는 사용자 보고 버그.
      //   → DOCTYPE 또는 <html 토큰 부재 시 / 명백한 마크다운(`#`,`##` 헤더 시작) 시 → null.
      if (!candidate) {
        htmlExtractStatus = 'empty';
        html = null;
      } else if (/^\s*#{1,6}\s/.test(candidate)) {
        // 마크다운 헤더로 시작하는 응답 (lesson*.md 본문이 그대로 흘러나오는 경우)
        htmlExtractStatus = 'markdown_only';
        html = null;
        console.warn('[chat.js] HTML 추출 실패 — 응답이 마크다운 헤더로 시작 (DOCTYPE 부재)');
      } else if (!/<!DOCTYPE|<html/i.test(candidate)) {
        // DOCTYPE / <html 둘 다 없으면 HTML 게임 문서 아님
        htmlExtractStatus = 'no_doctype';
        html = null;
        console.warn('[chat.js] HTML 추출 실패 — DOCTYPE/html 토큰 부재. raw 앞 120자:', candidate.slice(0, 120));
      } else {
        htmlExtractStatus = 'ok';
        html = candidate;
        html = forceEmojiCharacters(html);
        // S-AI-01: 외부 http(s) script src 제거 — 허용 CDN(jsdelivr·fonts.googleapis) 외 차단
        html = stripDisallowedExternalScripts(html);
        if (musicScore) html = injectBgmIntoGame(html, musicScore);
      }
    }

    // 디버그 메타 (규칙 0 준수 확인용)
    let debugMeta = null;
    if (mode === 'generator' && html) {
      const imgCount = (html.match(/<img\s/gi) || []).length;
      const fillTextCount = (html.match(/fillText\s*\(/gi) || []).length;
      const hasCharacterUrl = /에셋_assets\/캐릭터_characters\/[a-z_]+\.png/i.test(html);
      debugMeta = { imgCount, fillTextCount, hasCharacterUrl };
    }

    res.status(200).json({
      mode,
      reply: mode === 'tutor' ? raw.trim() : undefined,
      html,
      // 핫픽스 #2: HTML 추출 상태를 클라이언트에 전달 → app.js 가 'ok' 외에는 오류 안내 표시
      htmlExtractStatus: mode === 'generator' ? htmlExtractStatus : undefined,
      usage: msg.usage,
      rateLimit: { used: rl.used, limit: rl.limit, resetInSec: rl.resetInSec },
      debug: debugMeta,
    });
  } catch (err) {
    console.error('[api/chat] Anthropic 호출 실패:', err?.message || err);
    res.status(502).json({
      error: 'upstream_error',
      message: '공도쌤이 잠깐 쉬는 중이에요. 다시 시도해볼까요?',
    });
  }
}
