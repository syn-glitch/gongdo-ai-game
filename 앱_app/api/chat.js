/**
 * ============================================
 * 📋 배포 이력 (Deploy Header)
 * ============================================
 * @file        chat.js
 * @version     v1.2.0
 * @updated     2026-04-19 (KST)
 * @agent       👩‍💻 에이다 (자비스 개발팀) · 지시: 자비스 PO
 * @ordered-by  용남 대표
 * @description /api/chat — mode="generator" HTML 게임 생성 · mode="tutor" 학생 질문 응답.
 *              모델: claude-haiku-4-5-20251001 · Prompt Caching 적용.
 *
 * @change-summary
 *   AS-IS: v1.1 — studentId 단일 키 rate limit · prompt injection 방어 없음 · 에러에 ENV 이름 노출
 *   TO-BE: v1.2 — IP 복합 키 rate limit (S-AUTH-01) · user input XML 래핑 (S-AI-01 = S19) · 외부 script 차단 · 에러 일반화 (S-ERR-01)
 *
 * @features
 *   - [수정] checkAndIncrement 에 IP 전달 (S-AUTH-01)
 *   - [추가] user input 을 <student_document> 태그로 감싸 system prompt 경계 강화 (S-AI-01)
 *   - [추가] 생성 HTML post-filter — 외부 http(s) script src 차단 (S-AI-01)
 *   - [수정] 설정 오류 응답을 'configuration_error' 로 일반화 (S-ERR-01)
 *
 * ── 변경 이력 ──────────────────────────
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
- 반응형: 800×600 고정 캔버스 + 화면 중앙 정렬
- 한국어 UI 텍스트

【안전】
- 폭력·혐오·성적 콘텐츠는 정중히 대체합니다: "귀여운 전투" "장애물 피하기" 같은 안전한 대안으로 자동 변환.
- 학생 개인정보(이름·학교·주소)는 게임에 포함하지 않고 익명 캐릭터로 대체합니다.
- 외부 URL 접근, 폼 전송, 쿠키 사용 금지.

【넷마블 캐릭터 이미지 참조 — 매우 중요】
문서에 캐릭터가 언급되면 반드시 **학생 문서에 적힌 절대 URL** 을 그대로 사용합니다. 상대 경로(/에셋_assets/...) 를 임의로 만들어 쓰지 마세요 — iframe srcdoc 에서 작동하지 않습니다.

예시: 문서에 "- 주인공: ㅋㅋ (이미지: https://gongdo-ai-game.vercel.app/에셋_assets/캐릭터_characters/kk_idle.png)" 이라고 적혀있으면, 해당 URL 을 그대로 img 태그의 src 속성에 사용합니다 (예: img src="https://gongdo-ai-game.vercel.app/에셋_assets/캐릭터_characters/kk_idle.png").

만약 문서에 이미지 URL 이 명시되지 않았다면 이모지 폴백만 사용:
- 토리 → 👒 / ㅋㅋ → 🦸 / 밥 → 🐰 / 레옹 → 🦁

【임시 에셋 폴백 — 매우 중요. 반드시 준수】
현재 캐릭터 PNG 파일은 아직 준비 중이어서 로드가 실패할 확률이 매우 높습니다. 따라서 **캐릭터는 반드시 이모지로 렌더링** 하는 코드를 기본으로 작성하고, 실제 이미지 로드는 보조 수단으로만 시도합니다.

이모지 매핑 (필수 암기):
- 토리 → 👒
- ㅋㅋ → 🦸
- 밥  → 🐰
- 레옹 → 🦁

【케이스 A — Canvas 2D 기반 게임 (fillRect·drawImage 사용)】
**플레이어 캐릭터를 단색 사각형(fillRect)으로 그리지 마세요.** 대신 ctx.fillText 로 이모지를 큰 글씨로 렌더링:

\`\`\`js
// 플레이어 그리기 예시
function drawPlayer(ctx, x, y, size) {
  ctx.font = \`\${size}px "Apple Color Emoji", "Segoe UI Emoji", serif\`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🦸', x, y);  // 이모지 매핑에 따라 바꾸세요
}
\`\`\`

적·장애물·아이템도 이모지로 표현 가능합니다 (예: 적=👾, 아이템=⭐, 폭탄=💣).

【케이스 B — DOM <img> 기반 게임】
\`<img>\` 사용 시 onerror 속성에 인라인 폴백을 반드시 포함:
\`\`\`html
<img src="/에셋_assets/캐릭터_characters/kk_idle.png"
     style="width:64px;height:64px"
     onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'🦸',style:'font-size:56px;display:inline-block;line-height:1'}))">
\`\`\`

【결론】
- 단순 도형(사각형·원)으로 캐릭터를 그리지 않습니다. 반드시 이모지(케이스 A) 또는 이미지+이모지 폴백(케이스 B).
- 게임의 재미는 AI 생성의 가장 중요한 가치이므로, 캐릭터 없이 무채색 사각형이 움직이는 게임은 실패로 간주합니다.`;

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
      max_tokens: mode === 'tutor' ? 600 : 4000,
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
    if (mode === 'generator') {
      const match = raw.match(/```html\s*([\s\S]*?)```/i);
      html = match ? match[1].trim() : raw.trim();
      html = forceEmojiCharacters(html);
      // S-AI-01: 외부 http(s) script src 제거 — 허용 CDN(jsdelivr·fonts.googleapis) 외 차단
      html = stripDisallowedExternalScripts(html);
      if (musicScore) html = injectBgmIntoGame(html, musicScore);
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
