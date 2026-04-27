/**
 * ============================================
 * 📋 배포 이력 (Deploy Header)
 * ============================================
 * @file        app.js
 * @version     v1.12.0
 * @updated     2026-04-27 (KST)
 * @agent       👧 클로이 FE (자비스 4차 사이클) — 송PO 가 stalled 마무리 (deploy_header + selectLesson 검증)
 * @ordered-by  용남 대표 (9차 지시 — A안 5개 모두 채택)
 * @description 공도 AI-Game 메인 상호작용 스크립트 — 차시 로딩, 게임 iframe 주입, AI튜터 드로어 연동,
 *              캐릭터 활성화 게이트 (in-memory 변수 — sessionStorage/localStorage 미사용).
 *
 * @change-summary
 *   AS-IS: v1.10.0 — IP 셀 클릭 시 textarea 전체 덮어쓰기 + readonly (사용자 의도와 정반대)
 *   TO-BE: v1.11.0 — applyIpPrompt 재설계 = "- 주인공:" 라인만 in-place patch + mirror div 노란 하이라이트 + readonly 폐기
 *
 * @features
 *   - [재설계] applyIpPrompt — IP_META + HERO_LINE_PATTERN 정규식으로 "- 주인공: X" 라인만 in-place patch
 *                 lesson 본문 (적/배경/색상/효과 등) 모두 유지. 4차시 모든 lesson 동일 동작.
 *   - [신규] highlightHeroLine — mirror div + <mark> 기법으로 변경 라인에 노란 배경 (영구 유지)
 *   - [신규] clearHeroHighlight — selectLesson 안에 호출 (차시 전환 시 잔재 정리)
 *   - [폐기] readonly 잠금 — B-10 / M2 의 dataset.lockedPrompt / unlockEditorAfterStart / 타이핑 안내 토스트 모두 제거
 *   - [유지] IP_META 4 키 절대 URL (chat.js v1.6.0 매핑표 정합, CRITICAL-3 차단 유지)
 *   - [유지] 캐릭터 활성화 게이트 — in-memory `_characterUnlocked` (대표 5차 결정)
 *   - [유지] 활성화 모달 IME / ESC / 백드롭 / 취소 / 768px 안내 배너 / selectLesson hook
 *
 * ── 변경 이력 ──────────────────────────
 * v1.12.0 | 2026-04-27 | 송PO B안 patch | loadLessonFile 에 deploy_header 자동 stripping (lesson{N}.md 운영 메타데이터 학생 노출 차단) — 대표 라이브 검수 보강 #3
 * v1.11.2 | 2026-04-27 | 송PO patch | applyIpPrompt = caret + setSelectionRange + focus + scrollTop (textarea native 자동 스크롤). scrollHeroLineIntoView 폐기 — 대표 라이브 보강 #2
 * v1.11.1 | 2026-04-27 | 송PO patch | scrollHeroLineIntoView 추가 (hero line 자동 스크롤, 학생 즉시 발견) — 대표 라이브 검수 보강
 * v1.11.0 | 2026-04-27 | 클로이 4차 + 송PO 마무리 | applyIpPrompt 재설계 (in-place patch + mirror highlight + readonly 폐기) — 대표 9차 지시 A안 채택
 * v1.10.0 | 2026-04-27 | 클로이 | 핫픽스 #1 — IP_PROMPTS 절대 URL 변환 (CRITICAL-3 차단, 김감사 v2.0)
 * v1.9.0  | 2026-04-27 | 클로이 | 캐릭터 활성화 게이트 + 모달 + IP 자동 입력 (#editor-textarea, in-memory)
 * v1.8.2 | 2026-04-19 | 클로이 | "장르" 버튼 hide + 섹션별 Fallback 안내 사전 (대표 정리)
 * v1.8.1 | 2026-04-19 | 클로이 | Fallback 잔존 fix + 코드 영역 inline info (QA-006 MAJOR-1, MINOR-3)
 * v1.8.0 | 2026-04-19 | 클로이 | 항목별 [🔍 코드] 버튼 + 부분 하이라이트 (PRD 생략 Fast-Track)
 * v1.7.0 | 2026-04-19 | 클로이 | 분할 뷰 + tokenize root-cause fix (BUNKER-2026-04-19-004, PRD v1.1)
 * v1.6.0 | 2026-04-19 | 클로이 | [🔍 코드 구경] 오버레이 + 변경 감지 (BUNKER-2026-04-19-003, PRD v1.1)
 * v1.5.0 | 2026-04-19 | 클로이 | 문서 [↻ 처음으로] 초기화 버튼 (BUNKER-2026-04-19-002, PRD v1.1)
 * v1.4.0 | 2026-04-19 | 클로이 | 차시 변형(variants) 선택 UI (BUNKER-2026-04-19-001 → JARVIS UI 통합)
 * v1.3.0 | 2026-04-19 | 클로이 | 자동 재생성 롤백 + 시작 버튼 attention 액션 (JARVIS-2026-04-19-002 R2)
 * v1.2.0 | 2026-04-19 | 클로이 | (롤백됨) 캐릭터/배경/BGM 변경 시 자동 [시작]
 * v1.1.0 | 2026-04-19 | 클로이 | 게임 iframe 4방향 스크롤바 제거 (JARVIS-2026-04-19-001)
 * v1.0.0 | (S02)      | 클로이 | 최초 작성 — 차시 manifest + 트리 렌더 + UI 토글
 * ============================================
 */

// 공도 AI-Game — S02 상호작용 스크립트
// 차시 manifest + 하네스 문서 fetch 로딩, "내 작품" 서브폴더 트리 렌더링
// API 연동은 S04부터. 현재는 UI 토글·쿨다운 모달 데모.

(() => {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => root.querySelectorAll(sel);

  const state = {
    manifest: null,
    currentLesson: null,
    currentVariantKey: null,
    currentWork: null,
    myWorks: [],
    lessonCache: new Map(),
    studentId: getOrCreateStudentId(),
    lastGeneratedHtml: null,
    lastGeneratedHtmlSnapshot: null,  // { html, sourceText } — BUNKER-003 FR-19
    isGenerating: false,
    abortController: null,
    promptHistory: [],  // {at, lessonNo, document}
    tutorLog: [],       // {at, role:'user'|'bot', text, hint?}
    sessionStartedAt: Date.now(),
    config: {},         // config.json 로드 결과
  };

  async function loadConfig() {
    try {
      const res = await fetch('./공용_public/config.json', { cache: 'no-store' });
      if (res.ok) state.config = await res.json();
    } catch (err) {
      console.warn('[공도 AI-Game] config.json 로드 실패', err);
    }
  }

  // 임시 학생 ID (S08 Supabase 로그인 전까지 로컬에서 유지)
  function getOrCreateStudentId() {
    const KEY = 'gongdo-student-id';
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = 'stu-' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(KEY, id);
    }
    return id;
  }

  const LOADING_MESSAGES = [
    'AI가 게임을 만들고 있어요... 🎮',
    '우주선에 시동을 걸어요... 🚀',
    '캐릭터를 준비해요... 🎭',
    '배경 그림을 그리는 중... 🎨',
    '효과음을 넣고 있어요... 🎵',
    '점수판을 만드는 중... 🏆',
    '거의 다 됐어요... ✨',
    '잠시만 기다려요... 💫',
  ];

  // ─────────── manifest 로딩 + 트리 렌더링 ───────────
  async function initLessons() {
    try {
      const res = await fetch('./차시_lessons/manifest.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('manifest 로딩 실패');
      state.manifest = await res.json();
      renderLessonTree();
      renderMyWorksTree();
    } catch (err) {
      console.error('[공도 AI-Game]', err);
      $('#drawer-lessons').innerHTML = '<li class="tree-empty">수업 목록을 불러오지 못했어요</li>';
    }
  }

  function renderLessonTree() {
    const root = $('#drawer-lessons');
    root.innerHTML = '';

    state.manifest.lessons.forEach((lesson) => {
      const folder = document.createElement('li');
      folder.className = 'tree-folder';
      folder.dataset.lesson = lesson.no;
      folder.setAttribute('role', 'treeitem');

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'tree-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = `
        <span class="caret" aria-hidden="true">▶</span>
        <span class="folder-emoji" aria-hidden="true">📁</span>
        <span class="tree-toggle-title">
          <span>${lesson.no}차시 · ${lesson.title}</span>
          <span class="tree-toggle-subtitle">${lesson.emoji} ${lesson.subtitle}</span>
        </span>
      `;
      toggle.addEventListener('click', () => toggleFolder(folder, toggle));

      const children = document.createElement('ul');
      children.className = 'tree-children';
      children.setAttribute('role', 'group');

      const fileBtn = document.createElement('li');
      fileBtn.className = 'tree-file';
      fileBtn.setAttribute('role', 'treeitem');
      fileBtn.tabIndex = 0;
      fileBtn.dataset.lesson = lesson.no;
      fileBtn.innerHTML = `<span aria-hidden="true">📄</span> ${lesson.title} 문서`;
      fileBtn.addEventListener('click', () => selectLesson(lesson.no));
      fileBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectLesson(lesson.no);
        }
      });

      children.appendChild(fileBtn);
      folder.appendChild(toggle);
      folder.appendChild(children);
      root.appendChild(folder);
    });
  }

  function renderMyWorksTree() {
    const root = $('#drawer-myworks');
    root.innerHTML = '';

    state.manifest.myworks_folders.forEach((item) => {
      const folder = document.createElement('li');
      folder.className = 'tree-folder';
      folder.dataset.worksLesson = item.lesson;
      folder.setAttribute('role', 'treeitem');

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'tree-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = `
        <span class="caret" aria-hidden="true">▶</span>
        <span class="folder-emoji" aria-hidden="true">📁</span>
        <span class="tree-toggle-title">
          <span>${item.label}</span>
        </span>
      `;
      toggle.addEventListener('click', () => toggleFolder(folder, toggle));

      const children = document.createElement('ul');
      children.className = 'tree-children';
      children.setAttribute('role', 'group');

      const works = state.myWorks.filter((w) => w.lesson === item.lesson);
      if (works.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'tree-empty';
        empty.textContent = '(아직 저장된 작품이 없어요)';
        children.appendChild(empty);
      } else {
        works.forEach((w) => {
          const btn = document.createElement('li');
          btn.className = 'tree-file';
          btn.tabIndex = 0;
          btn.innerHTML = `<span aria-hidden="true">🎮</span> ${w.title}`;
          btn.addEventListener('click', () => loadWork(w));
          children.appendChild(btn);
        });
      }

      folder.appendChild(toggle);
      folder.appendChild(children);
      root.appendChild(folder);
    });
  }

  function toggleFolder(folder, toggleBtn) {
    const isOpen = folder.classList.toggle('is-open');
    toggleBtn.setAttribute('aria-expanded', String(isOpen));
  }

  // ─────────── 차시 문서 선택 ───────────
  async function selectLesson(lessonNo) {
    state.currentLesson = Number(lessonNo);
    state.currentWork = null;

    // active 상태 갱신
    $$('.tree-file').forEach((f) => f.classList.remove('is-active'));
    const selected = $(`#drawer-lessons .tree-file[data-lesson="${lessonNo}"]`);
    if (selected) selected.classList.add('is-active');

    const editor = $('#editor-textarea');
    editor.value = '문서를 불러오는 중...';

    try {
      const lessonMeta = state.manifest.lessons.find((l) => l.no === Number(lessonNo));
      if (!lessonMeta) throw new Error('차시 정보 없음');

      // variants 가 있으면 첫 번째 변형을 기본으로, 없으면 lesson.file 사용
      const variants = Array.isArray(lessonMeta.variants) ? lessonMeta.variants : [];
      const defaultVariant = variants[0] || null;
      const fileToLoad = defaultVariant ? defaultVariant.file : lessonMeta.file;
      state.currentVariantKey = defaultVariant ? defaultVariant.key : null;

      await loadLessonFile(fileToLoad);
      renderVariantPanel(lessonMeta);
      refreshCodeViewBtnVisibility();   // BUNKER-003 FR-3: 1·2·3차시만 노출
      // JARVIS-2026-04-27-001 (m5): SPA 차시 전환 시 캐릭터 버튼 상태 동기화 — in-memory 변수만 참조
      if (typeof refreshCharacterButtonState === 'function') refreshCharacterButtonState();
      editor.focus();
      $('#game-status').textContent =
        `${lessonNo}차시 문서가 열렸어요. 수정한 뒤 [시작]을 눌러봐요!`;
    } catch (err) {
      console.error(err);
      editor.value = `(문서를 불러오지 못했어요 — ${err.message})`;
    }
  }

  // 파일 경로 기준 캐시 — variants 까지 안전 처리 (BUNKER-2026-04-19-001 + JARVIS UI)
  // deploy_header 자동 stripping (대표 라이브 검수 보강) — lesson{N}.md 의 파일 첫 HTML 주석은
  // 운영 메타데이터(@version·@updated·@change-summary 등)이므로 학생에게 노출 X.
  // COMMON_RULES <deploy_header> 표준은 유지하되 textarea 노출 시점에 stripping.
  async function loadLessonFile(file) {
    const editor = $('#editor-textarea');
    if (!state.lessonCache.has(file)) {
      const res = await fetch(`./차시_lessons/${file}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('문서 로딩 실패');
      const raw = await res.text();
      // 파일 시작 위치의 HTML 주석 (<!-- ... -->) 만 제거. 본문 중간 주석은 영향 X.
      const stripped = raw.replace(/^\s*<!--[\s\S]*?-->\s*/, '');
      state.lessonCache.set(file, stripped);
    }
    editor.value = state.lessonCache.get(file);
  }

  function loadWork(work) {
    state.currentWork = work;
    $('#game-status').textContent =
      `'${work.title}' 작품을 불러왔어요. (S09 Supabase 연결 시 실제 복원)`;
  }

  // ─────────── 헤더 버튼 ───────────
  function initHeaderButtons() {
    $('#btn-start').addEventListener('click', handleStartClick);
    $('#btn-save').addEventListener('click', handleSaveClick);
    $('#btn-help').addEventListener('click', handleHelpClick);
  }

  let cooldownTimer = null;
  let loadingTimer = null;
  let genTimerInterval = null;
  let genStartTime = null;

  async function handleStartClick() {
    const editor = $('#editor-textarea');
    if (!editor.value.trim() || !state.currentLesson) {
      $('#game-status').textContent = '먼저 왼쪽에서 차시를 골라 문서를 열어주세요!';
      return;
    }

    // 학생이 [시작]을 직접 눌렀음 → attention 안내 종료
    clearStartButtonAttention();

    if (state.abortController) state.abortController.abort();
    state.abortController = new AbortController();

    const btnStart = $('#btn-start');
    btnStart.disabled = true;
    state.isGenerating = true;
    showGeneratingModal();

    try {
      const musicScore = window.GongdoBGM?.getAppliedScore?.() || null;

      // 사용자의 [시작] 클릭 제스처를 사용해 AudioContext 만 미리 활성화 (소리 없음).
      // 실제 음악 재생은 Claude 응답 후 iframe 이 로드된 뒤에 시작한다.
      if (musicScore) {
        try { await window.GongdoBGM.prewarmAudio(); } catch {}
      }

      const data = await callChatApi({
        document: editor.value,
        mode: 'generator',
        signal: state.abortController.signal,
        musicScore,
      });

      if (data.rateLimited) {
        hideGeneratingModal();
        showCooldownModal(data.resetInSec || 30);
        return;
      }
      if (data.error) {
        hideGeneratingModal();
        $('#game-status').textContent = `⚠️ ${data.message || data.error}`;
        return;
      }
      if (!data.html) {
        hideGeneratingModal();
        // 핫픽스 #2 (chat.js v1.6.0): htmlExtractStatus 별 차별 안내
        let msg;
        switch (data.htmlExtractStatus) {
          case 'markdown_only':
            msg = '⚠️ AI 응답 처리 실패 (마크다운만 도착). 다시 시도해주세요.';
            break;
          case 'no_doctype':
            msg = '⚠️ AI 응답 처리 실패 (HTML 형식 아님). 다시 시도해주세요.';
            break;
          case 'empty':
            msg = '⚠️ AI 응답이 비어있어요. 잠시 후 다시 시도해주세요.';
            break;
          default:
            msg = '게임을 만들지 못했어요. 문서를 조금 바꿔볼까요?';
        }
        $('#game-status').textContent = msg;
        return;
      }

      state.lastGeneratedHtml = data.html;
      // BUNKER-003 FR-19: 변경 감지용 snapshot
      state.lastGeneratedHtmlSnapshot = { html: data.html, sourceText: editor.value };
      state.promptHistory.push({
        at: new Date().toISOString(),
        lessonNo: state.currentLesson,
        document: editor.value.slice(0, 3000),
      });
      launchGame(data.html);
      hideGeneratingModal();

      // 게임 로드 직후 부모 페이지에서 음악 재생 시작 (AudioContext 는 이미 prewarm 됨)
      if (musicScore) {
        try { window.GongdoBGM.playAppliedIfAny(); } catch {}
      }

      $('#game-status').textContent =
        `✨ ${state.currentLesson}차시 게임이 만들어졌어요! · 오늘 ${data.rateLimit?.used}/${data.rateLimit?.limit}회 사용`;
    } catch (err) {
      hideGeneratingModal();
      if (err.name === 'AbortError') {
        $('#game-status').textContent = '취소했어요. 다시 시도해볼래요?';
        return;
      }
      console.error(err);
      $('#game-status').textContent = '⚠️ 공도쌤이 잠깐 쉬는 중이에요. 다시 시도해볼까요?';
    } finally {
      btnStart.disabled = false;
      state.isGenerating = false;
    }
  }

  // ─────────── [시작] 버튼 attention 액션 (JARVIS-2026-04-19-002 R2) ───────────
  // 캐릭터/배경/BGM 변경 시 학생의 시선을 우측 상단 [시작] 버튼으로 유도.
  // 자동 재생성 X (학생이 문서를 직접 보고 본인 손으로 [시작] 눌러야 학습 효과).
  // attention 클래스 = 부드러운 무한 펄스, 빨간 점 뱃지 = 변경사항 있음 표시.
  function highlightStartButton(reason) {
    const btn = $('#btn-start');
    if (!btn) return;
    btn.classList.add('btn-attention');
    const dot = $('#start-attention-dot');
    if (dot) dot.hidden = false;
  }
  function clearStartButtonAttention() {
    const btn = $('#btn-start');
    if (!btn) return;
    btn.classList.remove('btn-attention');
    const dot = $('#start-attention-dot');
    if (dot) dot.hidden = true;
  }

  // ─────────── AI 생성 중 팝업 ───────────
  function showGeneratingModal() {
    const modal = $('#generating-modal');
    modal.hidden = false;
    genStartTime = Date.now();
    updateGenTimer();
    genTimerInterval = setInterval(updateGenTimer, 200);
    startLoadingRotation();
  }

  function hideGeneratingModal() {
    const modal = $('#generating-modal');
    modal.hidden = true;
    if (genTimerInterval) { clearInterval(genTimerInterval); genTimerInterval = null; }
    stopLoadingRotation();
  }

  function updateGenTimer() {
    if (!genStartTime) return;
    const sec = Math.floor((Date.now() - genStartTime) / 1000);
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');
    $('#gen-timer').textContent = `${mm}:${ss}`;
  }

  function initGenCancel() {
    const cancel = $('#gen-cancel');
    if (!cancel) return;
    cancel.addEventListener('click', () => {
      if (state.abortController) state.abortController.abort();
      hideGeneratingModal();
    });
  }

  async function callChatApi({ document: doc, mode, signal, editorContent, musicScore }) {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document: doc,
        mode,
        studentId: state.studentId,
        editorContent: editorContent || null,
        musicScore: musicScore || null,
      }),
      signal,
    });
    if (res.status === 429) {
      const data = await res.json();
      return { rateLimited: true, resetInSec: data.resetInSec, message: data.message };
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { error: data.error || 'error', message: data.message };
    }
    return res.json();
  }

  function startLoadingRotation() {
    let i = 0;
    const target = $('#gen-message');
    if (target) target.textContent = LOADING_MESSAGES[0];
    loadingTimer = setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length;
      const t = $('#gen-message');
      if (t) {
        t.style.opacity = '0';
        setTimeout(() => {
          t.textContent = LOADING_MESSAGES[i];
          t.style.opacity = '1';
        }, 150);
      }
    }, 1800);
  }

  function stopLoadingRotation() {
    if (loadingTimer) clearInterval(loadingTimer);
    loadingTimer = null;
  }

  // ─────────── 드래그 리사이즈 (문서 ↔ 게임) ───────────
  const MIN_EDITOR_WIDTH = 420;
  const MIN_GAME_WIDTH = 520;

  function initResizeHandle() {
    const handle = $('#resize-handle');
    const editor = $('#pane-editor');
    const game = $('#pane-game');
    if (!handle || !editor || !game) return;

    const startDrag = (clientX) => {
      if (document.body.classList.contains('is-tab-mode')) return;

      const main = $('.app-main');
      const drawer = $('#pane-drawer');
      const mainRect = main.getBoundingClientRect();
      const drawerRect = drawer.getBoundingClientRect();
      const handleWidth = handle.offsetWidth;
      const available = mainRect.width - drawerRect.width - handleWidth;
      if (available <= MIN_EDITOR_WIDTH + MIN_GAME_WIDTH) return;

      document.body.classList.add('is-resizing');
      handle.classList.add('is-dragging');

      const onMove = (ev) => {
        const x = ev.touches ? ev.touches[0].clientX : ev.clientX;
        let newEditorWidth = x - drawerRect.right;
        newEditorWidth = Math.max(MIN_EDITOR_WIDTH, Math.min(available - MIN_GAME_WIDTH, newEditorWidth));
        editor.style.flex = `0 0 ${newEditorWidth}px`;
        const percent = Math.round((newEditorWidth / available) * 100);
        handle.setAttribute('aria-valuenow', String(percent));
      };
      const onUp = () => {
        document.body.classList.remove('is-resizing');
        handle.classList.remove('is-dragging');
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchmove', onMove, { passive: true });
      window.addEventListener('touchend', onUp);
    };

    handle.addEventListener('mousedown', (e) => { e.preventDefault(); startDrag(e.clientX); });
    handle.addEventListener('touchstart', (e) => { startDrag(e.touches[0].clientX); }, { passive: true });

    // 키보드 접근성: ← → 로 20px씩 조절
    handle.addEventListener('keydown', (e) => {
      if (document.body.classList.contains('is-tab-mode')) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const main = $('.app-main');
      const drawer = $('#pane-drawer');
      const available = main.getBoundingClientRect().width - drawer.getBoundingClientRect().width - handle.offsetWidth;
      const current = editor.getBoundingClientRect().width;
      const step = 20;
      let next = current + (e.key === 'ArrowRight' ? step : -step);
      next = Math.max(MIN_EDITOR_WIDTH, Math.min(available - MIN_GAME_WIDTH, next));
      editor.style.flex = `0 0 ${next}px`;
      handle.setAttribute('aria-valuenow', String(Math.round((next / available) * 100)));
    });
  }

  // 뷰포트 고정 CSS — 어떤 게임 HTML 이 와도 4방향 스크롤바를 차단한다.
  // 캔버스도 화면을 넘지 않도록 max-width/height 100vw/vh 강제.
  const VIEWPORT_LOCK_CSS = `
<style data-injected="gongdo-viewport-lock">
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    overflow: hidden !important;
  }
  body { display: flex; align-items: center; justify-content: center; }
  canvas, img, svg, video {
    max-width: 100vw;
    max-height: 100vh;
    display: block;
  }
</style>`;

  function injectViewportLockCss(html) {
    if (!html) return html;
    if (html.includes('data-injected="gongdo-viewport-lock"')) return html;
    if (/<head[^>]*>/i.test(html)) {
      return html.replace(/<head([^>]*)>/i, `<head$1>${VIEWPORT_LOCK_CSS}`);
    }
    if (/<html[^>]*>/i.test(html)) {
      return html.replace(/<html([^>]*)>/i, `<html$1><head>${VIEWPORT_LOCK_CSS}</head>`);
    }
    return VIEWPORT_LOCK_CSS + html;
  }

  function launchGame(htmlOrUrl) {
    const viewport = $('#game-viewport');
    viewport.innerHTML = '';

    const iframe = document.createElement('iframe');
    iframe.className = 'game-iframe';
    iframe.title = '내 게임 플레이 영역';
    // 보안 정책 (M-07): allow-scripts 단일. allow-same-origin 절대 금지
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.setAttribute('loading', 'eager');
    // 4방향 스크롤바 차단 (legacy 속성이지만 모든 주요 브라우저에서 동작)
    iframe.setAttribute('scrolling', 'no');

    // HTML 문자열이면 srcdoc, URL이면 src
    if (htmlOrUrl.startsWith('<') || htmlOrUrl.includes('<!DOCTYPE')) {
      iframe.srcdoc = injectViewportLockCss(htmlOrUrl);
    } else {
      iframe.src = htmlOrUrl;
    }

    viewport.appendChild(iframe);

    // iframe 자동 포커스 제거 (타이핑 버그 해결). 학생이 게임 영역 클릭 시에만 포커스 이관.
    // 세션 첫 게임에만 "클릭해서 시작하기" 오버레이 표시.
    const TUTORIAL_KEY = 'gongdo-game-tutorial-seen';
    const tutorialSeen = sessionStorage.getItem(TUTORIAL_KEY) === '1';
    if (!tutorialSeen) {
      const overlay = document.createElement('button');
      overlay.type = 'button';
      overlay.className = 'game-start-overlay';
      overlay.setAttribute('aria-label', '게임 시작하기 — 클릭하여 키보드로 조작');
      overlay.innerHTML = `
        <span class="game-start-emoji" aria-hidden="true">🎮</span>
        <span class="game-start-title">클릭하면 게임 시작!</span>
        <span class="game-start-desc">키보드로 조작할 수 있어요</span>
      `;
      overlay.addEventListener('click', () => {
        sessionStorage.setItem(TUTORIAL_KEY, '1');
        overlay.remove();
        iframe.focus();
      }, { once: true });
      viewport.appendChild(overlay);
    }
  }

  function handleSaveClick() {
    if (!state.currentLesson) {
      $('#game-status').textContent = '저장할 작품이 없어요. 먼저 차시를 열어주세요!';
      return;
    }
    // S09 Mock: 로컬 state에만 저장하여 "내 작품" 폴더에 표시
    const work = {
      lesson: state.currentLesson,
      id: `w-${Date.now()}`,
      title: `내 작품 ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`,
      createdAt: new Date().toISOString(),
    };
    state.myWorks.unshift(work);
    renderMyWorksTree();
    $('#game-status').textContent =
      `(Mock) 저장되었어요! "내 작품 > ${state.currentLesson}차시 작품" 폴더에서 확인할 수 있어요.`;
  }

  function handleHelpClick() {
    alert('공도 AI-Game 도움말\n\n1. 왼쪽에서 차시 폴더를 펼쳐요 📁\n2. 문서를 클릭해서 읽어요 📄\n3. 내용을 수정하고 [시작]을 눌러요 ▶\n4. 막히면 우하단 공도쌤에게 물어봐요 🦸');
  }

  // ─────────── 쿨다운 모달 (서버에서 resetInSec 받음) ───────────
  function showCooldownModal(seconds) {
    const modal = $('#cooldown-modal');
    const circle = $('#countdown-circle');
    const number = $('#countdown-number');
    const btnStart = $('#btn-start');

    const TOTAL = typeof seconds === 'number' && seconds > 0 ? seconds : 30;
    let remaining = TOTAL;
    modal.hidden = false;
    btnStart.disabled = true;

    const CIRC = 283;
    circle.style.strokeDasharray = CIRC;
    circle.style.strokeDashoffset = '0';
    number.textContent = remaining;

    if (cooldownTimer) clearInterval(cooldownTimer);
    cooldownTimer = setInterval(() => {
      remaining -= 1;
      number.textContent = remaining;
      const progress = (TOTAL - remaining) / TOTAL;
      circle.style.strokeDashoffset = String(CIRC * progress);

      if (remaining <= 0) {
        clearInterval(cooldownTimer);
        cooldownTimer = null;
        modal.hidden = true;
        btnStart.disabled = false;
        btnStart.focus();
      }
    }, 1000);
  }

  // ─────────── AI튜터 플로팅 버튼·드로어 ───────────
  function initTutor() {
    const fab = $('#tutor-fab');
    const drawer = $('#tutor-drawer');
    const closeBtn = $('#tutor-close');

    fab.addEventListener('click', () => openTutor());
    closeBtn.addEventListener('click', () => closeTutor());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        closeTutor();
      }
    });

    const form = $('#tutor-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = $('#tutor-input');
      const text = input.value.trim();
      if (!text) return;
      appendTutorMessage(text, 'user');
      state.tutorLog.push({ at: new Date().toISOString(), role: 'user', text });
      input.value = '';
      appendTutorMessage('...', 'bot', { pending: true });

      try {
        const editorContent = ($('#editor-textarea')?.value || '').slice(0, 3000);
        const data = await callChatApi({ document: text, mode: 'tutor', editorContent });
        removePendingTutor();
        if (data.rateLimited) {
          appendTutorMessage(data.message || '공도쌤이 잠깐 쉬고 있어요.', 'bot');
          return;
        }
        if (data.error) {
          appendTutorMessage(data.message || '답하지 못했어요. 다시 물어봐요!', 'bot');
          return;
        }
        // [HINT:검색어] 파싱 → 본문과 힌트 분리 후 말풍선에 배지 표시
        const { displayText, hint } = parseTutorHint(data.reply || '...');
        const lineNumber = hint ? highlightEditorByHint(hint) : null;
        appendTutorMessage(displayText, 'bot', { hint, lineNumber });
        state.tutorLog.push({ at: new Date().toISOString(), role: 'bot', text: displayText, hint });
      } catch (err) {
        removePendingTutor();
        appendTutorMessage('공도쌤이 잠깐 쉬고 있어요. 다시 물어봐요!', 'bot');
      }
    });
  }

  // ─────────── 튜터 응답 HINT 파싱·하이라이트 ───────────
  function parseTutorHint(text) {
    const m = text.match(/\[HINT:([^\]]*)\]\s*$/);
    if (!m) return { displayText: text, hint: null };
    const hint = m[1].trim();
    const displayText = text.slice(0, m.index).trim();
    return { displayText, hint: hint || null };
  }

  function highlightEditorByHint(hint) {
    if (!hint) return null;
    const editor = $('#editor-textarea');
    if (!editor || !editor.value) return null;
    const value = editor.value;

    // 다단계 검색 — 구조 우선, 평문은 최후 수단
    const cleaned = hint.replace(/[:：]\s*$/, '').trim();
    const firstWord = cleaned.split(/\s+/)[0] || cleaned;
    const candidates = [
      // 1) 리스트 항목 (가장 구체적)
      `- ${hint}`,             // "- 주인공:"
      `- ${cleaned}`,          // "- 주인공"
      // 2) 정확 콜론 형식
      hint,                    // "주인공:"
      // 3) 섹션 헤더
      `### ${cleaned}`,        // "### 주인공"
      `## ${cleaned}`,
      `# ${cleaned}`,
      // 4) 첫 단어 구조 폴백 (힌트가 "적 속도"인 경우)
      `- ${firstWord}:`,
      `- ${firstWord}`,
      `### ${firstWord}`,
      `## ${firstWord}`,
      // 5) 평문 단어 (가장 위험 → 최후 수단)
      cleaned,                 // "주인공"  ← 예시문에도 걸리므로 주의
    ];

    let pos = -1;
    for (const q of candidates) {
      if (!q) continue;
      pos = value.indexOf(q);
      if (pos >= 0) break;
    }
    // 마지막 수단: 대소문자 무시 첫 단어 부분 일치
    if (pos < 0) {
      const lower = value.toLowerCase();
      pos = lower.indexOf(firstWord.toLowerCase());
    }
    if (pos < 0) return null;

    let lineStart = value.lastIndexOf('\n', pos - 1) + 1;
    let lineEnd = value.indexOf('\n', pos);
    if (lineEnd === -1) lineEnd = value.length;

    editor.focus();
    editor.setSelectionRange(lineStart, lineEnd);
    scrollEditorToPosition(editor, lineStart);
    flashEditor();
    return value.slice(0, lineStart).split('\n').length;
  }

  function openTutor() {
    const fab = $('#tutor-fab');
    const drawer = $('#tutor-drawer');
    drawer.hidden = false;
    requestAnimationFrame(() => {
      drawer.classList.add('is-open');
      document.body.classList.add('has-tutor-open');
      fab.setAttribute('aria-expanded', 'true');
      const input = $('#tutor-input');
      if (input) input.focus();
    });
  }

  function closeTutor() {
    const fab = $('#tutor-fab');
    const drawer = $('#tutor-drawer');
    drawer.classList.remove('is-open');
    document.body.classList.remove('has-tutor-open');
    fab.setAttribute('aria-expanded', 'false');
    setTimeout(() => {
      if (!drawer.classList.contains('is-open')) drawer.hidden = true;
      fab.focus();
    }, 300);
  }

  function appendTutorMessage(text, sender, opts = {}) {
    const messages = $('#tutor-messages');
    const wrap = document.createElement('div');
    wrap.className = `tutor-message tutor-message-${sender}`;
    if (opts.pending) wrap.dataset.pending = '1';
    const avatar = document.createElement('span');
    avatar.className = 'tutor-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    if (sender === 'bot') {
      const img = document.createElement('img');
      img.className = 'mascot-img';
      img.src = './에셋_assets/캐릭터_characters/gongdossem.png';
      img.alt = '';
      img.onerror = () => { avatar.textContent = '🦸'; };
      avatar.appendChild(img);
    } else {
      avatar.textContent = '🙋';
    }
    const bubble = document.createElement('div');
    bubble.className = 'tutor-bubble';
    if (opts.pending) bubble.classList.add('is-pending');
    bubble.textContent = text;

    // 📍 줄번호 배지 (튜터가 [HINT:...] 에서 찾은 위치)
    if (opts.hint) {
      const badge = document.createElement('button');
      badge.type = 'button';
      badge.className = 'tutor-hint-badge';
      if (opts.lineNumber) {
        badge.innerHTML = `📍 문서 <b>${opts.lineNumber}</b>번째 줄 보기`;
        badge.setAttribute('aria-label', `문서 ${opts.lineNumber}번째 줄로 이동`);
      } else {
        badge.innerHTML = `🔍 문서에서 '<b>${opts.hint}</b>' 찾기`;
        badge.setAttribute('aria-label', `문서에서 ${opts.hint} 찾기`);
        badge.classList.add('is-search');
      }
      badge.addEventListener('click', () => {
        highlightEditorByHint(opts.hint);
      });
      bubble.appendChild(document.createElement('br'));
      bubble.appendChild(badge);
    }

    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
  }

  function removePendingTutor() {
    const pending = document.querySelector('.tutor-message[data-pending="1"]');
    if (pending) pending.remove();
  }

  // ─────────── 입력 포커스 안전장치 (타이핑 버그 방어) ───────────
  // 사용자가 input/textarea 를 클릭하면 게임 iframe 이 포커스를 가로채지 못하도록 강제 blur.
  // m-01: Safari 이중 안전 — blur() 후 다음 프레임에 타겟 input 재포커스.
  function initFocusGuard() {
    document.addEventListener('focusin', (e) => {
      const el = e.target;
      if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) return;
      const iframe = document.querySelector('.game-iframe');
      if (!iframe) return;
      if (document.activeElement === iframe) {
        iframe.blur();
        requestAnimationFrame(() => {
          try { el.focus(); } catch {}
        });
      }
    });
  }

  // ─────────── 반응형 탭 모드 + 768px 이하 PC 안내 배너 (JARVIS-2026-04-27-001 M5) ───────────
  function initResponsive() {
    const mql = window.matchMedia('(max-width: 1024px)');
    const apply = () => document.body.classList.toggle('is-tab-mode', mql.matches);
    apply();
    mql.addEventListener('change', apply);

    // M5: 768px 이하 진입 시 화면 상단 안내 배너 노출
    const narrowMql = window.matchMedia('(max-width: 768px)');
    const banner = $('#narrow-screen-banner');
    const applyBanner = () => {
      if (!banner) return;
      banner.hidden = !narrowMql.matches;
      document.body.classList.toggle('is-narrow-screen', narrowMql.matches);
    };
    applyBanner();
    narrowMql.addEventListener('change', applyBanner);
  }

  // ─────────── 팝오버 공통 헬퍼 ───────────
  function setupPopover({ btnId, popoverId, closeId, onOpen }) {
    const btn = $(`#${btnId}`);
    const popover = $(`#${popoverId}`);
    const closeBtn = closeId ? $(`#${closeId}`) : null;
    if (!btn || !popover) return null;

    const toggle = (open) => {
      const willOpen = typeof open === 'boolean' ? open : popover.hidden;
      // 다른 팝오버는 모두 닫기
      if (willOpen) {
        $$('.character-popover').forEach((p) => {
          if (p !== popover) {
            p.hidden = true;
            const openerId = p.getAttribute('aria-labelledby') || '';
            const opener = document.querySelector(`[aria-controls="${p.id}"]`);
            if (opener) opener.setAttribute('aria-expanded', 'false');
          }
        });
      }
      popover.hidden = !willOpen;
      btn.setAttribute('aria-expanded', String(willOpen));
      if (willOpen && onOpen) onOpen();
    };

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle();
    });
    if (closeBtn) closeBtn.addEventListener('click', () => toggle(false));
    document.addEventListener('click', (e) => {
      if (popover.hidden) return;
      if (!popover.contains(e.target) && e.target !== btn && !btn.contains(e.target)) toggle(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !popover.hidden) toggle(false);
    });
    return { toggle, popover, btn };
  }

  // ─────────── 예시 게임 변형 패널 (BUNKER-2026-04-19-001) ───────────
  function renderVariantPanel(lessonMeta) {
    const btn  = $('#btn-variant');
    const grid = $('#variant-grid');
    if (!btn || !grid) return;
    const variants = Array.isArray(lessonMeta?.variants) ? lessonMeta.variants : [];
    if (variants.length < 2) {
      btn.hidden = true;
      grid.innerHTML = '';
      return;
    }
    btn.hidden = false;
    grid.innerHTML = '';
    variants.forEach((v) => {
      const isActive = v.key === state.currentVariantKey;
      const li = document.createElement('li');
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'variant-card' + (isActive ? ' is-active' : '');
      card.dataset.variantKey  = v.key;
      card.dataset.variantFile = v.file;
      card.innerHTML = `
        <span class="variant-label">${v.label || v.key}</span>
        <span class="variant-desc">${v.desc || ''}</span>
      `;
      li.appendChild(card);
      grid.appendChild(li);
    });
  }

  function initVariantPanel() {
    const p = setupPopover({ btnId: 'btn-variant', popoverId: 'variant-popover', closeId: 'variant-popover-close' });
    if (!p) return;
    // 그리드는 매번 동적으로 채우므로 이벤트는 위임으로 처리
    const grid = $('#variant-grid');
    if (!grid) return;
    grid.addEventListener('click', async (e) => {
      const card = e.target.closest('.variant-card');
      if (!card) return;
      const file = card.dataset.variantFile;
      const key  = card.dataset.variantKey;
      if (!file || !state.currentLesson) return;
      if (key === state.currentVariantKey) { p.toggle(false); return; }
      try {
        await loadLessonFile(file);
        state.currentVariantKey = key;
        // 카드 active 상태 갱신
        $$('#variant-grid .variant-card').forEach((c) => c.classList.remove('is-active'));
        card.classList.add('is-active');
        const label = card.querySelector('.variant-label')?.textContent || '';
        $('#game-status').textContent = `✨ 예시를 '${label.trim()}'(으)로 바꿨어요! 문서를 읽고 [시작]을 눌러봐요!`;
        highlightStartButton('variant');
      } catch (err) {
        console.error(err);
        $('#game-status').textContent = '⚠️ 예시를 불러오지 못했어요. 다시 시도해볼래요?';
      } finally {
        p.toggle(false);
      }
    });
  }

  // ─────────── [🔍 코드 구경] 오버레이 (BUNKER-2026-04-19-003, PRD v1.1) ───────────
  // 학생이 자연어 → 코드 매핑을 시각적으로 확인. read-only 뷰어.
  // 자율 금지 (PRD §9.4): 코드 직접 수정 X / hover 매핑 X / 별도 LLM 호출 X / 외부 라이브러리 X.
  const CODE_VIEW_LESSONS = new Set([1, 2, 3]); // FR-3: 1·2·3차시만 노출

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function escapeAttr(s) { return String(s).replace(/"/g, '&quot;'); }
  function escapeRegex(s) { return String(s).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&'); }

  // FR-6 + §9.2 색상 토큰: comment / keyword
  // BUNKER-004 FR-18: 마커를 `class="code-tag-X"` → `<x-c>` `<x-k>` 커스텀 element 로 변경.
  // 이유: keyword 정규식이 자기 자신이 만든 span 의 `class` 속성을 매칭하던 잠재 버그 root-cause fix.
  // 주의: HTML+JS 혼합 코드에서 정규식만으로 JS 문자열과 HTML 속성값을 구분 불가 → string 색칠 제외.
  function tokenizeCode(rawCode) {
    let html = escapeHtml(rawCode);
    // 1) HTML comments <!-- ... -->
    html = html.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<x-c>$1</x-c>');
    // 2) JS line comments // ...
    html = html.replace(/(\/\/[^\n]*)/g, '<x-c>$1</x-c>');
    // 3) 키워드 (class 포함 — 커스텀 element 마커이므로 충돌 없음)
    html = html.replace(/\b(function|const|let|var|if|else|return|new|for|while|class|this|null|true|false)\b/g, '<x-k>$1</x-k>');
    return html;
  }

  // BUNKER-004 FR-14~17: 가벼운 마크다운 렌더 (외부 라이브러리 0).
  // v1.8: ### 헤딩 옆에 [🔍 코드] 버튼 인라인 삽입 (data-section 으로 섹션명 전달).
  function renderMarkdownLite(md) {
    if (!md) return '<div class="md-empty">내용 없음</div>';
    const escaped = escapeHtml(md);
    return escaped.split('\n').map((line) => {
      if (line.startsWith('## '))    return `<div class="md-h2">${line.slice(3)}</div>`;
      if (line.startsWith('### '))   {
        const title = line.slice(4);
        // v1.8.2: '장르' 는 게임 전체 컨셉 = 단일 매핑 의미 없음 → 버튼 hide (대표 정리)
        if (title.trim() === '장르') {
          return `<div class="md-h3"><span class="md-h3-text">${title}</span></div>`;
        }
        return `<div class="md-h3"><span class="md-h3-text">${title}</span><button type="button" class="md-section-btn" data-section="${escapeAttr(title)}">🔍 코드</button></div>`;
      }
      if (/^- /.test(line))           return `<div class="md-li">• ${line.slice(2)}</div>`;
      if (/^---+$/.test(line.trim())) return '<hr class="md-hr">';
      if (line.trim() === '')         return '<br>';
      return `<div class="md-p">${line}</div>`;
    }).join('');
  }

  // ─────────── 섹션 → 코드 매핑 + 라인 하이라이트 (v1.8) ───────────
  // 매핑 알고리즘:
  //   1) 섹션 제목 자체로 // 📝 주석 검색
  //   2) 실패 시 섹션 안 첫 항목들의 키워드로 재시도
  //   3) 모두 실패 시 Fallback (전체 보기 + 안내 토스트)
  function findSectionKeywords(mdSource, sectionTitle) {
    const keywords = [sectionTitle];
    if (!mdSource) return keywords;
    const lines = mdSource.split('\n');
    const startIdx = lines.findIndex((l) => l.trim() === `### ${sectionTitle}` || l.trim().startsWith(`### ${sectionTitle}`));
    if (startIdx < 0) return keywords;
    for (let i = startIdx + 1; i < lines.length; i++) {
      const ln = lines[i].trim();
      if (ln.startsWith('### ') || ln.startsWith('## ')) break;
      if (ln.startsWith('- ')) {
        const item = ln.slice(2).trim();
        const colonIdx = item.indexOf(':');
        if (colonIdx > 0) keywords.push(item.slice(0, colonIdx).trim());
        keywords.push(item);
      }
    }
    return keywords;
  }

  function findCodeRange(rawCode, keywords) {
    if (!rawCode || !keywords?.length) return null;
    const lines = rawCode.split('\n');
    for (const kw of keywords) {
      if (!kw) continue;
      const re = new RegExp('//\\s*📝[^\n]*' + escapeRegex(kw));
      for (let i = 0; i < lines.length; i++) {
        if (re.test(lines[i])) {
          // 다음 빈 줄 또는 다음 // 📝 까지 (단, 다음 // 📝 시작 직전까지)
          let end = i + 1;
          while (end < lines.length) {
            const t = lines[end].trim();
            if (/\/\/\s*📝/.test(t)) break;
            if (t === '' && end > i + 1) break;
            end++;
          }
          return { start: i, end: Math.max(i, end - 1) };
        }
      }
    }
    return null;
  }

  // 코드 라인별 wrap (.code-line) + 하이라이트 범위 적용.
  function renderCodeLines(rawCode, range) {
    const tokenized = tokenizeCode(rawCode);
    const lines = tokenized.split('\n');
    return lines.map((line, idx) => {
      const isHL = range && idx >= range.start && idx <= range.end;
      const cls = 'code-line' + (isHL ? ' is-highlight' : '');
      // 빈 줄도 시각 공간 확보 위해 nbsp
      return `<span class="${cls}">${line || '&nbsp;'}</span>`;
    }).join('');
  }

  // v1.8.2: 섹션별 Fallback 안내 사전 — 매칭 실패 시 학생이 직접 코드를 둘러보도록 유도
  // 사전에 없는 섹션은 일반 안내로 fallback
  const FALLBACK_MESSAGES = {
    '규칙':       '📜 규칙 코드는 점수, HP, 승리 같은 부분에 숨어 있어요! 코드에서 "score", "hp", "win" 같은 글자를 찾아보세요 🔎',
    '조작 방법':  '🎮 조작 방법은 키보드 부분에 있어요! 코드에서 "keydown", "ArrowLeft", "Space" 같은 글자를 찾아보세요 🔎',
    '배경':       '🎨 배경은 그림 그리는 부분에 있어요! 코드에서 "background", "fillRect", "canvas" 같은 글자를 찾아보세요 🔎',
    '주인공':     '🦸 주인공은 캐릭터 그리는 부분에 있어요! 코드에서 "player", "drawPlayer" 같은 글자를 찾아보세요 🔎',
    '적':         '👾 적은 외계인 만드는 부분에 있어요! 코드에서 "enemy", "enemies" 같은 글자를 찾아보세요 🔎',
  };

  let currentHighlightSection = null;
  let codeViewInfoTimer = null;

  // v1.8.1 MINOR-3: 코드 영역 안 inline 안내 (학생 시선 가까이 + 3초 자동 사라짐)
  function showCodeViewInfo(text, kind) {
    const info = $('#code-view-info');
    if (!info) return;
    info.textContent = text;
    info.dataset.kind = kind || 'success';   // success | fail
    info.hidden = false;
    if (codeViewInfoTimer) clearTimeout(codeViewInfoTimer);
    codeViewInfoTimer = setTimeout(() => { info.hidden = true; codeViewInfoTimer = null; }, 3000);
  }
  function hideCodeViewInfo() {
    const info = $('#code-view-info');
    if (info) info.hidden = true;
    if (codeViewInfoTimer) { clearTimeout(codeViewInfoTimer); codeViewInfoTimer = null; }
  }

  function highlightCodeSection(sectionTitle) {
    if (!state.lastGeneratedHtml) return;
    const snap = state.lastGeneratedHtmlSnapshot;
    const mdSource = snap ? snap.sourceText : ($('#editor-textarea')?.value || '');
    const keywords = findSectionKeywords(mdSource, sectionTitle);
    const range = findCodeRange(state.lastGeneratedHtml, keywords);
    if (!range) {
      // QA-006 MAJOR-1 fix: Fallback 시 이전 하이라이트 클리어 (학생 혼란 회피)
      showFullCode();
      // v1.8.2: 섹션별 차별 안내 (사전 우선 → 없으면 일반)
      const msg = FALLBACK_MESSAGES[sectionTitle.trim()]
        || `🔎 '${sectionTitle}' 부분과 딱 맞는 코드를 못 찾았어요. 전체 코드에서 찾아볼래요?`;
      $('#game-status').textContent = msg;
      showCodeViewInfo(msg, 'fail');
      return;
    }
    currentHighlightSection = sectionTitle;
    $('#code-view-content').innerHTML = renderCodeLines(state.lastGeneratedHtml, range);
    $('#btn-code-show-all').hidden = false;
    const okMsg = `🔍 '${sectionTitle}' 부분 코드를 찾았어요!`;
    $('#game-status').textContent = okMsg;
    showCodeViewInfo(okMsg, 'success');
    // 부드러운 자동 스크롤
    requestAnimationFrame(() => {
      const firstHL = document.querySelector('#code-view-content .code-line.is-highlight');
      if (firstHL) firstHL.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
  function showFullCode() {
    currentHighlightSection = null;
    $('#code-view-content').innerHTML = renderCodeLines(state.lastGeneratedHtml, null);
    $('#btn-code-show-all').hidden = true;
    hideCodeViewInfo();
  }

  function updateCodeView() {
    const overlay  = $('#code-view-overlay');
    const mdEl     = $('#code-view-md');
    const content  = $('#code-view-content');
    const warn     = $('#code-view-warn');
    const stale    = $('#code-view-stale');
    if (!overlay || !content || !warn || !stale || !mdEl) return;

    // FR-11: 게임 미생성 시 안내 (두 영역 합쳐서 하나의 안내)
    if (!state.lastGeneratedHtml) {
      const empty = ''
        + '<div class="code-view-empty">'
        + '<div class="code-view-empty-emoji">🎮</div>'
        + '<p>먼저 [▶ 시작]을 눌러 게임을 만들어요!</p>'
        + '<p>그러면 진짜 코드를 구경할 수 있어요.</p>'
        + '</div>';
      mdEl.innerHTML = empty;
      content.innerHTML = '';
      warn.hidden = true;
      stale.hidden = true;
      return;
    }
    // BUNKER-004 옵션 B: 마크다운 출처 결정
    //   snapshot 있으면 sourceText (1:1 일치) → FR-12 동기성 보장
    //   없으면 editor.value 로 fallback + 노란 stale 배지 (FR-13a/b, AC-Edge-9)
    const editor = $('#editor-textarea');
    const snap   = state.lastGeneratedHtmlSnapshot;
    const mdSource = snap ? snap.sourceText : (editor?.value || '');
    mdEl.innerHTML = renderMarkdownLite(mdSource);

    // FR-7 + 18: 코드 영역 (구버전 게임도 그대로 표시 — 학생용 주석만 없을 뿐)
    // v1.8: 라인 wrap 적용 (하이라이트 가능 구조). 처음 열 때는 하이라이트 X (전체 보기)
    currentHighlightSection = null;
    content.innerHTML = renderCodeLines(state.lastGeneratedHtml, null);
    if ($('#btn-code-show-all')) $('#btn-code-show-all').hidden = true;
    hideCodeViewInfo();   // v1.8.1: 이전 안내 클리어

    // FR-11 변경 감지 배지 (snapshot 있을 때만 비교 의미 있음)
    warn.hidden  = !(snap && editor && editor.value !== snap.sourceText);
    // FR-13b stale 배지 (snapshot 없는 구버전 게임에서만)
    stale.hidden = !!snap;
  }

  function openCodeView() {
    const overlay = $('#code-view-overlay');
    const btn     = $('#btn-code-view');
    if (!overlay || !btn) return;
    // AC-Edge-1: 다른 popover 자동 닫기
    $$('.character-popover').forEach((p) => {
      p.hidden = true;
      const opener = document.querySelector(`[aria-controls="${p.id}"]`);
      if (opener) opener.setAttribute('aria-expanded', 'false');
    });
    updateCodeView();
    overlay.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
  }
  function closeCodeView() {
    const overlay = $('#code-view-overlay');
    const btn     = $('#btn-code-view');
    if (overlay) overlay.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function refreshCodeViewBtnVisibility() {
    const btn = $('#btn-code-view');
    if (!btn) return;
    btn.hidden = !CODE_VIEW_LESSONS.has(Number(state.currentLesson));
  }

  function initCodeViewPanel() {
    const btn      = $('#btn-code-view');
    const overlay  = $('#code-view-overlay');
    const closeBtn = $('#btn-code-view-close');
    if (!btn || !overlay || !closeBtn) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      // AC-Edge-4: 토글 (재클릭 시 닫기)
      if (overlay.hidden) openCodeView(); else closeCodeView();
    });
    closeBtn.addEventListener('click', closeCodeView);
    // v1.8: 마크다운 영역 [🔍 코드] 버튼 위임 핸들러
    const mdEl = $('#code-view-md');
    if (mdEl) {
      mdEl.addEventListener('click', (e) => {
        const sBtn = e.target.closest('.md-section-btn');
        if (!sBtn) return;
        e.stopPropagation();
        highlightCodeSection(sBtn.dataset.section);
      });
    }
    // v1.8: [📜 전체 보기] 토글
    const showAllBtn = $('#btn-code-show-all');
    if (showAllBtn) {
      showAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showFullCode();
      });
    }
    // FR-8c: 외부 클릭 닫힘 (오버레이 자체 클릭 시는 닫히지 않게 — 헤더/본문 모두 overlay 자식)
    document.addEventListener('click', (e) => {
      if (overlay.hidden) return;
      if (overlay.contains(e.target)) return;
      if (e.target === btn || btn.contains(e.target)) return;
      closeCodeView();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !overlay.hidden) closeCodeView();
    });
  }

  // ─────────── 문서 [↻ 처음으로] 초기화 (BUNKER-2026-04-19-002, PRD v1.1) ───────────
  // FR-1~16 + AC-Edge-1~5 준수. setupPopover 미사용 (AC-Edge-4 재클릭 timer reset 위해 수동).
  async function resetCurrentLesson() {
    const lesson = state.manifest?.lessons?.find((l) => l.no === state.currentLesson);
    if (!lesson) return;
    const variant = lesson.variants?.find((v) => v.key === state.currentVariantKey);
    const file = variant?.file || lesson.file;
    try {
      // FR-7 + FR-16: cache hit → 즉시 / cache miss → fetch fallback
      if (!state.lessonCache.has(file)) {
        const res = await fetch(`./차시_lessons/${file}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('fetch 실패');
        state.lessonCache.set(file, await res.text());
      }
      $('#editor-textarea').value = state.lessonCache.get(file);
      $('#game-status').textContent = '📜 처음 예시로 되돌렸어요!';
      clearStartButtonAttention();
    } catch (err) {
      console.error('[reset]', err);
      $('#game-status').textContent = '⚠️ 처음 예시를 불러오지 못했어요. 다시 시도해볼래요?';
    }
  }

  function initResetPanel() {
    const btn      = $('#btn-reset');
    const popover  = $('#reset-confirm-popover');
    const yesBtn   = $('#btn-reset-yes');
    const noBtn    = $('#btn-reset-no');
    if (!btn || !popover || !yesBtn || !noBtn) return;

    let autoCloseTimer = null;
    const startTimer = () => {
      if (autoCloseTimer) clearTimeout(autoCloseTimer);
      autoCloseTimer = setTimeout(close, 5000); // FR-13: 5초 절대 시간 (hover 무관)
    };
    function close() {
      popover.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      if (autoCloseTimer) { clearTimeout(autoCloseTimer); autoCloseTimer = null; }
    }
    function open() {
      // AC-Edge-1: 다른 popover 자동 닫기
      $$('.character-popover').forEach((p) => {
        if (p !== popover) {
          p.hidden = true;
          const opener = document.querySelector(`[aria-controls="${p.id}"]`);
          if (opener) opener.setAttribute('aria-expanded', 'false');
        }
      });
      popover.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      startTimer();
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      // FR-7 보조: 차시 미선택 시 안내
      if (!state.currentLesson) {
        $('#game-status').textContent = '먼저 차시를 골라주세요!';
        return;
      }
      if (popover.hidden) {
        open();
      } else {
        // AC-Edge-4: 재클릭 시 토글 X — timer 만 reset
        startTimer();
      }
    });
    yesBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      close();
      await resetCurrentLesson();
    });
    noBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      close();
    });
    // FR-12 + AC-Edge-2/3: 외부 클릭 (차시 트리·[시작] 등) 시 자동 닫힘
    document.addEventListener('click', (e) => {
      if (popover.hidden) return;
      if (popover.contains(e.target)) return;
      if (e.target === btn || btn.contains(e.target)) return;
      close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !popover.hidden) close();
    });
  }

  // ─────────── 캐릭터 패널 (S10 + JARVIS-2026-04-27-001 활성화 게이트) ───────────
  // 모든 차시(1·2·3·4) 기본 비활성. "ㅋㅋ도와줘" 키워드 입력 시 in-memory 활성화.
  //
  // ★ 영속성 정책 (대표 2차 결정 🅱️):
  //   - in-memory 클로저 변수 `_characterUnlocked` 만 사용
  //   - sessionStorage / localStorage 둘 다 절대 사용 금지
  //   - F5 새로고침 = 모듈 재로드 = 자동 false → 키워드 재입력 요구
  //   - SPA 차시 전환 = 페이지 이동 X = 메모리 보존 → 1·3·4차시 오가도 활성 유지
  const CHAR_UNLOCK_KEYWORD = 'ㅋㅋ도와줘';   // 단일 진실 원천

  // IP 메타 — 4차 사이클 E-1: lesson 본문 hero line 만 in-place patch 위해 분리.
  // chat.js v1.5.0 매핑표(line 228~233) 절대 URL 형식과 정합 (CRITICAL-3 차단).
  const IP_ASSET_BASE = 'https://gongdo-ai-game.vercel.app/에셋_assets/캐릭터_characters';
  const IP_META = {
    kk:   { name: 'ㅋㅋ',  url: `${IP_ASSET_BASE}/kk_idle.png` },
    tory: { name: '토리',  url: `${IP_ASSET_BASE}/tory_idle.png` },
    bob:  { name: '밥',    url: `${IP_ASSET_BASE}/bob_idle.png` },
    leon: { name: '레옹',  url: `${IP_ASSET_BASE}/leon_idle.png` },
  };
  // 정규식: lesson1·2·1_catch·1_jump 모두 매치
  //   lesson1:        `- 주인공: 파란 우주선`
  //   lesson1_catch:  `- 주인공: ㅋㅋ`
  //   lesson2:        `- 주인공: 토리`
  // 그룹: $1=prefix("- 주인공: "), $2=기존 이름, $3=옵션(이전 patch 의 (이미지: ...) — 누적 방지)
  const HERO_LINE_PATTERN = /^(- 주인공:\s*)([^\n(]*?)(\s*\(이미지:[^)]*\))?\s*$/m;

  // ── in-memory 영속성 (대표 2차 결정 🅱️) ──
  let _characterUnlocked = false;
  let _charUnlockComposing = false;
  let _charToastTimer = null;

  function isCharacterUnlocked() { return _characterUnlocked === true; }
  function setCharacterUnlocked(value) { _characterUnlocked = (value === true); }

  function refreshCharacterButtonState() {
    const btn = $('#btn-character');
    const unlockBtn = $('#btn-character-unlock');
    const lockIcon = btn ? btn.querySelector('.character-lock-icon') : null;
    const charIcon = btn ? btn.querySelector('.character-icon') : null;
    if (!btn) return;
    const unlocked = isCharacterUnlocked();
    btn.disabled = !unlocked;
    btn.classList.toggle('is-locked', !unlocked);
    btn.setAttribute('aria-label', unlocked ? '캐릭터 넣기' : '캐릭터 넣기 (잠김)');
    if (unlocked) btn.removeAttribute('title');
    else btn.setAttribute('title', '선생님이 알려주실 때 켜요');
    if (lockIcon) lockIcon.hidden = unlocked;
    if (charIcon) charIcon.hidden = !unlocked;
    if (unlockBtn) unlockBtn.hidden = unlocked;
    // 비활성으로 전환되는 경우 popover 도 닫기
    if (!unlocked) {
      const popover = $('#character-popover');
      if (popover) {
        popover.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
      }
    }
  }

  // ─────────── 활성화 모달 (B-2 / B-5 / B-6 / B-7) ───────────
  function openCharacterUnlockModal() {
    const modal = $('#character-unlock-modal');
    const input = $('#character-unlock-input');
    const error = $('#character-unlock-error');
    const confirmBtn = $('#character-unlock-confirm');
    if (!modal) return;
    modal.hidden = false;
    if (error) error.hidden = true;
    if (input) input.value = '';
    if (confirmBtn) confirmBtn.disabled = true;
    _charUnlockComposing = false;
    // 첫 진입 입력란 자동 포커스
    setTimeout(() => input && input.focus(), 30);
  }

  function closeCharacterUnlockModalAndReset() {
    const modal = $('#character-unlock-modal');
    const input = $('#character-unlock-input');
    const error = $('#character-unlock-error');
    if (input) input.value = '';
    if (error) error.hidden = true;
    if (modal) modal.hidden = true;
  }

  function handleCharacterUnlockConfirm() {
    if (_charUnlockComposing) return;     // IME 조합 중 무시 (m6)
    const input = $('#character-unlock-input');
    const error = $('#character-unlock-error');
    if (!input) return;
    const normalized = (input.value || '').trim().replace(/\s+/g, '');
    if (normalized === CHAR_UNLOCK_KEYWORD) {
      // 성공
      setCharacterUnlocked(true);
      closeCharacterUnlockModalAndReset();
      refreshCharacterButtonState();
      showCharacterToast('✨ 활성화 되었습니다');
    } else {
      // 실패 — 모달 유지 + inline 안내 + 입력값 유지
      if (error) {
        error.hidden = false;
        error.textContent = normalized.length === 0
          ? '키워드를 입력해보세요'
          : '다시 한번 입력해보세요';
      }
      input.focus();
      input.select && input.select();
    }
  }

  // ─────────── 토스트 (B-7 활성화 / B-10 readonly 안내) ───────────
  function showCharacterToast(text) {
    const toast = $('#character-toast');
    if (!toast) return;
    toast.textContent = text;
    toast.hidden = false;
    toast.classList.remove('is-shown');
    void toast.offsetWidth;     // 강제 리플로우 → 재애니메이션
    toast.classList.add('is-shown');
    if (_charToastTimer) clearTimeout(_charToastTimer);
    _charToastTimer = setTimeout(() => {
      toast.classList.remove('is-shown');
      setTimeout(() => { toast.hidden = true; }, 220);
    }, 2200);
  }

  // ─────────── IP 자동 입력 — 4차 사이클 E-2 재설계 ───────────
  // 사용자 의도 (대표 9차 지시): lesson 본문 전체 유지 + "- 주인공:" 라인만 in-place patch.
  // readonly 잠금 폐기 (학생 자유 편집 가능). 노란 하이라이트 영구 유지.
  //
  // 누적 방지: 정규식 그룹 $3 가 이전 patch 의 `(이미지: ...)` 옵션 캡쳐 →
  // 새 IP 로 덮어쓰기 시 자연스럽게 교체. 4 IP 연속 클릭해도 마지막 1개만 hero line 에 남음.
  function applyIpPrompt(charKey) {
    const meta = IP_META[charKey];
    if (!meta) return;
    const editor = $('#editor-textarea');
    if (!editor) return;

    const before = editor.value;
    if (!HERO_LINE_PATTERN.test(before)) {
      showCharacterToast('"- 주인공: ..." 라인을 찾지 못했어요. 문서를 확인해주세요.');
      return;
    }

    // $1=prefix, $2=name(원본 무시 후 새 이름), $3=옵션(있으면 덮어쓰기) 자리 모두 새 텍스트로
    const replacement = `$1${meta.name} (이미지: ${meta.url})`;
    editor.value = before.replace(HERO_LINE_PATTERN, replacement);

    // ── caret + selection 으로 hero line 강조 + textarea native 자동 스크롤 ──
    // mirror div 의 word-break 미스매치보다 textarea native selection 이 더 신뢰성.
    // textarea ::selection 이 var(--color-yellow) 라 자동으로 베스트 케이스 색상.
    // 학생이 클릭하면 selection 사라지지만 mirror highlight 는 영구 유지 (이중 안내).
    const newM = editor.value.match(HERO_LINE_PATTERN);
    if (newM) {
      const start = newM.index;
      const end   = newM.index + newM[0].length;
      // focus 먼저 → setSelectionRange (반대 순서면 일부 브라우저에서 caret 끝으로 이동)
      editor.focus();
      editor.setSelectionRange(start, end);
      // textarea 가 selection 영역을 자동으로 viewport 안으로 스크롤
      // 일부 브라우저 미스인 경우 명시 보조:
      const heroLineNum = (editor.value.slice(0, start).match(/\n/g) || []).length;
      const lineHeight = parseFloat(getComputedStyle(editor).lineHeight) || 24;
      const targetTop = heroLineNum * lineHeight - editor.clientHeight / 3;
      editor.scrollTop = Math.max(0, targetTop);
    }

    // 시각 하이라이트 (영구 유지) — selection 사라진 후에도 mirror 가 노란 배경 유지
    highlightHeroLine(editor);
  }

  // ─────────── Hero line 시각 하이라이트 (E-3) ───────────
  // 기술 선택: mirror div + <mark> — textarea 와 동일 폰트/패딩으로 깔린 div 가
  //   hero line 만 <mark> 로 감싸 노란 배경 표시. textarea 는 그 위에 normal 색 텍스트.
  //   영구 유지 (새 IP 클릭 또는 [▶ 시작] 시까지). 학생 자유 편집 가능.
  function ensureEditorMirror(editor) {
    // textarea 의 부모를 wrapper 로 변환 + mirror div 생성 (1회만)
    if (editor._mirror && editor.parentElement && editor.parentElement.classList.contains('editor-textarea-wrapper')) {
      return editor._mirror;
    }
    const parent = editor.parentElement;
    if (!parent) return null;
    const wrapper = document.createElement('div');
    wrapper.className = 'editor-textarea-wrapper';
    parent.insertBefore(wrapper, editor);
    wrapper.appendChild(editor);

    const mirror = document.createElement('div');
    mirror.className = 'editor-mirror';
    mirror.setAttribute('aria-hidden', 'true');
    wrapper.insertBefore(mirror, editor);
    editor._mirror = mirror;
    editor.classList.add('editor-textarea-with-mirror');

    // textarea 스크롤 동기화
    editor.addEventListener('scroll', () => {
      mirror.scrollTop = editor.scrollTop;
      mirror.scrollLeft = editor.scrollLeft;
    });
    // 학생이 직접 편집해 hero line 이 사라지면 하이라이트 자동 해제
    editor.addEventListener('input', () => {
      if (editor.dataset.heroHighlight === '1') {
        renderHeroHighlight(editor);
      }
    });
    return mirror;
  }

  function renderHeroHighlight(editor) {
    const mirror = editor._mirror;
    if (!mirror) return;
    const value = editor.value;
    const m = value.match(HERO_LINE_PATTERN);
    if (!m) {
      mirror.textContent = '';
      mirror.hidden = true;
      delete editor.dataset.heroHighlight;
      return;
    }
    // 매치 위치 계산 — m.index, m[0].length
    const start = m.index;
    const end   = start + m[0].length;
    const before = value.slice(0, start);
    const hero   = value.slice(start, end);
    const after  = value.slice(end);
    // textContent 로 set 해도 HTML escape 자동 처리. <mark> 는 createElement 로 감쌈.
    mirror.textContent = '';
    mirror.appendChild(document.createTextNode(before));
    const mark = document.createElement('mark');
    mark.className = 'editor-hero-mark';
    mark.appendChild(document.createTextNode(hero));
    mirror.appendChild(mark);
    mirror.appendChild(document.createTextNode(after));
    mirror.hidden = false;
    // 스크롤 동기
    mirror.scrollTop = editor.scrollTop;
    mirror.scrollLeft = editor.scrollLeft;
  }

  function highlightHeroLine(editor) {
    ensureEditorMirror(editor);
    editor.dataset.heroHighlight = '1';
    renderHeroHighlight(editor);
    // 자동 스크롤은 applyIpPrompt 가 caret + selection 기반으로 직접 처리 (textarea native)
  }

  function clearHeroHighlight() {
    const editor = $('#editor-textarea');
    if (!editor) return;
    if (editor._mirror) {
      editor._mirror.textContent = '';
      editor._mirror.hidden = true;
    }
    delete editor.dataset.heroHighlight;
  }

  function initCharacterPanel() {
    const p = setupPopover({ btnId: 'btn-character', popoverId: 'character-popover', closeId: 'character-popover-close' });
    if (!p) return;

    // ── 4 IP 셀 클릭 → hero line in-place patch (4차 사이클 E-2) ──
    $$('.character-card').forEach((card) => {
      card.addEventListener('click', () => {
        const key = card.dataset.char;
        if (key && IP_META[key]) {
          applyIpPrompt(key);
        } else {
          // 폴백: 기존 동작 유지 (S10 직접 문서 삽입 — hero line patch 와 무관)
          insertCharacterIntoDoc(card.dataset.label, card.dataset.file);
        }
        p.toggle(false);
      });
    });

    // ── 진입로 1: [🔓 캐릭터 활성화하기] (B-5) ──
    const unlockBtn = $('#btn-character-unlock');
    if (unlockBtn) {
      unlockBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openCharacterUnlockModal();
      });
    }

    // ── 진입로 2: 비활성 [👤 캐릭터] 클릭 → 모달 자동 open (B-5, M4) ──
    // disabled 버튼은 click 발생 X → CSS pointer-events:none + wrapper 가 click 받음
    const wrapper = $('#btn-character-wrapper');
    if (wrapper) {
      wrapper.addEventListener('click', (e) => {
        if (!isCharacterUnlocked()) {
          e.preventDefault();
          e.stopPropagation();
          openCharacterUnlockModal();
        }
      }, true);
    }

    // ── 모달 IME / 검증 / 닫기 (B-6, B-7, m1, m6) ──
    const form = $('#character-unlock-form');
    const input = $('#character-unlock-input');
    const cancelBtn = $('#character-unlock-cancel');
    const confirmBtn = $('#character-unlock-confirm');
    const modal = $('#character-unlock-modal');
    const errorEl = $('#character-unlock-error');

    if (input) {
      input.addEventListener('compositionstart', () => {
        _charUnlockComposing = true;
        if (confirmBtn) confirmBtn.disabled = true;
      });
      input.addEventListener('compositionend', () => {
        _charUnlockComposing = false;
        if (confirmBtn) confirmBtn.disabled = input.value.length === 0;
      });
      input.addEventListener('input', () => {
        if (errorEl && !errorEl.hidden) errorEl.hidden = true;
        if (!_charUnlockComposing && confirmBtn) {
          confirmBtn.disabled = input.value.length === 0;
        }
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          if (_charUnlockComposing) return;     // IME 조합 중 Enter 무시
          e.preventDefault();
          handleCharacterUnlockConfirm();
        }
      });
    }
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleCharacterUnlockConfirm();
      });
    }
    if (cancelBtn) cancelBtn.addEventListener('click', closeCharacterUnlockModalAndReset);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeCharacterUnlockModalAndReset();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && !modal.hidden) {
        closeCharacterUnlockModalAndReset();
      }
    });

    // ── readonly 잠금 폐기 (4차 사이클 E-4, 대표 9차 지시) ──
    // 3차 사이클의 editor.readOnly / dataset.lockedPrompt / 타이핑 안내 토스트 모두 제거.
    // 학생 자유 편집 = 사용자 의도. hero line 외 본문 (적/배경/색상/효과) 직접 수정 가능.

    // ── [▶ 시작] 클릭 → 하이라이트 해제만 (영구 유지 정책의 종료점) ──
    // value 비우기 / readonly 해제 모두 제거. lesson 본문 그대로 chat.js 입력으로 전송됨.
    const btnStart = $('#btn-start');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        clearHeroHighlight();
      });
    }

    // ── 초기 상태 동기화 (B-4) ──
    refreshCharacterButtonState();
  }

  // ─────────── 배경 테마 패널 (S11) ───────────
  function initThemePanel() {
    const p = setupPopover({ btnId: 'btn-theme', popoverId: 'theme-popover', closeId: 'theme-popover-close' });
    if (!p) return;
    $$('.theme-card').forEach((card) => {
      card.addEventListener('click', () => {
        insertThemeIntoDoc(card.dataset.label, card.dataset.desc, card.dataset.colors);
        p.toggle(false);
      });
    });
  }

  // ─────────── 배경음악 팝오버 (S13·S14) — 열기만 ───────────
  function initBgmPanel() {
    setupPopover({ btnId: 'btn-bgm', popoverId: 'bgm-popover', closeId: 'bgm-popover-close' });
    // 실제 재생/생성 로직은 bgm.js 에서 담당
  }

  function insertThemeIntoDoc(label, desc, colors) {
    const editor = $('#editor-textarea');
    if (!editor) return;
    if (!state.currentLesson) {
      $('#game-status').textContent = '먼저 왼쪽에서 차시 문서를 열어주세요!';
      return;
    }

    const newLine = `- 배경: ${label} (${desc}) · 색상: ${colors}`;
    const current = editor.value;
    const regex = /^-?\s*배경:.*$/m;

    let insertStart;
    let nextValue;
    const match = current.match(regex);
    if (match) {
      insertStart = match.index;
      nextValue = current.slice(0, match.index) + newLine + current.slice(match.index + match[0].length);
    } else {
      const trailing = current.endsWith('\n') ? '' : '\n';
      insertStart = current.length + trailing.length;
      nextValue = current + trailing + newLine + '\n';
    }
    editor.value = nextValue;

    const insertEnd = insertStart + newLine.length;
    editor.focus();
    editor.setSelectionRange(insertStart, insertEnd);
    scrollEditorToPosition(editor, insertStart);
    flashEditor();

    const lineNumber = nextValue.slice(0, insertStart).split('\n').length;
    $('#game-status').textContent =
      `🎨 배경을 '${label}'(으)로 바꿨어요! 📍 문서 ${lineNumber}번째 줄에 표시했어요. [시작]을 눌러봐요!`;
    highlightStartButton('theme');
  }

  function insertCharacterIntoDoc(label, file) {
    const editor = $('#editor-textarea');
    if (!editor) return;
    if (!state.currentLesson) {
      $('#game-status').textContent = '먼저 왼쪽에서 차시 문서를 열어주세요!';
      return;
    }

    // 절대 URL 사용 — iframe srcdoc 에서도 로드 가능 (m-03: 디버그 로그)
    const origin = window.location.origin;
    const newLine = `- 주인공: ${label} (이미지: ${origin}/에셋_assets/캐릭터_characters/${file})`;
    const current = editor.value;
    const regex = /^-?\s*주인공:.*$/m;

    let insertStart;
    let nextValue;
    const match = current.match(regex);
    if (match) {
      insertStart = match.index;
      nextValue = current.slice(0, match.index) + newLine + current.slice(match.index + match[0].length);
    } else {
      const trailing = current.endsWith('\n') ? '' : '\n';
      insertStart = current.length + trailing.length;
      nextValue = current + trailing + newLine + '\n';
    }
    editor.value = nextValue;

    const insertEnd = insertStart + newLine.length;
    editor.focus();
    editor.setSelectionRange(insertStart, insertEnd);
    scrollEditorToPosition(editor, insertStart);
    flashEditor();

    // 줄 번호 계산 (1-based)
    const lineNumber = nextValue.slice(0, insertStart).split('\n').length;
    $('#game-status').textContent =
      `🎉 주인공을 '${label}'(으)로 바꿨어요! 📍 문서 ${lineNumber}번째 줄에 표시했어요. [시작]을 눌러봐요!`;
    highlightStartButton('character');
  }

  function scrollEditorToPosition(textarea, pos) {
    const before = textarea.value.slice(0, pos);
    const lineIndex = before.split('\n').length - 1;
    const computed = getComputedStyle(textarea);
    const lineHeight = parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) * 1.7;
    const targetScroll = Math.max(0, lineIndex * lineHeight - textarea.clientHeight / 2 + lineHeight);
    textarea.scrollTop = targetScroll;
  }

  function flashEditor() {
    const editor = $('#editor-textarea');
    if (!editor) return;
    editor.classList.remove('is-flashing');
    // 리플로우 강제 → 재애니메이션
    void editor.offsetWidth;
    editor.classList.add('is-flashing');
    setTimeout(() => editor.classList.remove('is-flashing'), 1800);
  }

  // ─────────── 📤 발표자료 만들기 (S16) ───────────
  function initPresentation() {
    const btn = $('#btn-present');
    const modal = $('#present-modal');
    const closeBtn = $('#present-close');
    const cancelBtn = $('#present-cancel');
    const form = $('#present-form');
    if (!btn || !modal) return;

    const successPanel = $('#present-success');
    const doneBtn = $('#present-done');

    const open = () => {
      form.hidden = false;
      successPanel.hidden = true;
      populateAutoList();
      modal.hidden = false;
      setTimeout(() => $('#present-title-input')?.focus(), 50);
    };
    const close = () => {
      modal.hidden = true;
      form.hidden = false;
      successPanel.hidden = true;
    };

    btn.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    cancelBtn.addEventListener('click', close);
    if (doneBtn) doneBtn.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hidden) close();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const meta = {
        title: $('#present-title-input').value.trim() || '내 게임',
        tagline: $('#present-tagline').value.trim(),
        highlight: $('#present-highlight').value.trim(),
        learned: $('#present-learned').value.trim(),
      };

      // 진행 패널로 즉시 전환
      showShareInProgress();

      // ① 게임 HTML 을 Supabase 에 업로드 → 공유 URL 받기 (가장 중요)
      let playUrl = null;
      let uploadError = null;
      if (state.lastGeneratedHtml) {
        try {
          const upRes = await fetch('/api/upload-game', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              html: state.lastGeneratedHtml,
              studentId: state.studentId,
              title: meta.title,
              tagline: meta.tagline,
              lessonNo: state.currentLesson,
              mood: window.GongdoBGM?.state?.appliedToGame?.mood || '',
            }),
          });
          const upData = await upRes.json();
          if (upRes.ok && upData.url) {
            playUrl = upData.url;
          } else {
            uploadError = upData.message || '업로드 실패';
          }
        } catch (err) {
          uploadError = err.message;
        }
      } else {
        uploadError = '먼저 [▶ 시작] 으로 게임을 만들어주세요';
      }

      // ② 패들렛 친화 평문 텍스트 빌드 (URL 최상단 · 마크다운 기호 없음)
      const shareText = buildShareText(meta, { playUrl });

      // ③ 클립보드 복사 (파일 다운로드 없음 — 학생이 실수로 파일 첨부하는 혼란 방지)
      let clipOk = false;
      try {
        await navigator.clipboard.writeText(shareText);
        clipOk = true;
      } catch (err) {
        console.warn('[클립보드] 복사 실패:', err);
      }

      showShareSuccess({ playUrl, clipOk, uploadError, shareText });

      $('#game-status').textContent = playUrl
        ? `📤 '${meta.title}' 게임이 온라인에 올라갔어요! 패들렛에 Cmd+V 로 붙여넣어요 🎉`
        : `📤 게임 업로드 실패 😢 다시 시도해볼까요?`;
    });
  }

  function showShareInProgress() {
    const form = $('#present-form');
    const panel = $('#present-success');
    form.hidden = true;
    panel.hidden = false;
    const title = $('.present-success-title');
    const icon = $('.present-success-icon');
    if (title) title.textContent = '게임을 온라인에 올리는 중...';
    if (icon) icon.textContent = '🚀';
    const list = $('.present-success-list');
    if (list) list.innerHTML = '<li>📤 Supabase 에 게임 업로드 중...</li>';
    const guide = $('.present-success-guide');
    if (guide) guide.style.display = 'none';
    const actions = panel.querySelector('.present-actions');
    if (actions) actions.style.display = 'none';
  }

  function showShareSuccess({ playUrl, clipOk, uploadError, shareText }) {
    const panel = $('#present-success');
    const title = $('.present-success-title');
    const icon = $('.present-success-icon');
    const guide = $('.present-success-guide');
    const actions = panel.querySelector('.present-actions');
    if (guide) guide.style.display = '';
    if (actions) actions.style.display = '';

    if (playUrl) {
      if (icon) icon.textContent = '🎉';
      if (title) { title.textContent = '준비 완료!'; title.style.color = ''; }
    } else {
      if (icon) icon.textContent = '😢';
      if (title) { title.textContent = '게임 업로드 실패'; title.style.color = 'var(--color-red)'; }
    }

    const list = $('.present-success-list');
    if (list) {
      list.innerHTML = '';
      const add = (text, ok) => {
        const li = document.createElement('li');
        li.textContent = text;
        if (!ok) li.classList.add('is-skipped');
        list.appendChild(li);
      };
      add('🚀 게임을 온라인에 올렸어요 (90일 보관)', !!playUrl);
      if (playUrl) {
        const li = document.createElement('li');
        li.innerHTML = `🔗 게임 주소: <a href="${playUrl}" target="_blank" rel="noopener" style="color:var(--color-blue);font-weight:800">새 탭에서 열기</a>`;
        list.appendChild(li);
      } else if (uploadError) {
        const li = document.createElement('li');
        li.style.color = 'var(--color-red)';
        li.textContent = `⚠️ ${uploadError}`;
        list.appendChild(li);
      }
      add('📋 발표 글 + 게임 주소 복사 완료 (Cmd+V 로 붙여넣기)', clipOk);
    }

    // 패들렛 버튼
    const padletUrl = state.config?.padlet?.default_url;
    const openBtn = $('#present-open-padlet');
    if (openBtn && padletUrl) {
      openBtn.href = padletUrl;
      openBtn.hidden = false;
    }
  }

  function downloadGameHtml(title) {
    if (!state.lastGeneratedHtml) return false;
    const safeName = sanitizeFilename(title);
    const filename = `${safeName}_게임.html`;
    const blob = new Blob(['\uFEFF' + state.lastGeneratedHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    return true;
  }

  function sanitizeFilename(name) {
    return (name || '내_게임').replace(/[^\w가-힣\s-]/g, '').trim().replace(/\s+/g, '_') || '내_게임';
  }

  function populateAutoList() {
    const list = $('#present-auto-list');
    if (!list) return;
    const docLen = ($('#editor-textarea')?.value || '').length;
    const promptCount = state.promptHistory.length;
    const tutorCount = state.tutorLog.filter((e) => e.role === 'user').length;
    const applied = window.GongdoBGM?.state?.appliedToGame;
    const character = extractFieldFromDoc('주인공');
    const theme = extractFieldFromDoc('배경');

    list.innerHTML = '';
    const add = (text) => {
      const li = document.createElement('li');
      li.textContent = text;
      list.appendChild(li);
    };
    add(`내 바이브코딩 문서 (${docLen}자)`);
    add(`공도쌤과 대화 ${tutorCount}번`);
    add(`[▶ 시작] 실행 ${promptCount}번`);
    if (character) add(`주인공: ${character}`);
    if (theme) add(`배경: ${theme}`);
    if (applied) add(`배경음악: ${applied.mood || '내가 만든 음악'}`);
  }

  function extractFieldFromDoc(label) {
    const doc = $('#editor-textarea')?.value || '';
    const re = new RegExp(`^-?\\s*${label}\\s*:\\s*(.+)$`, 'm');
    const m = doc.match(re);
    if (!m) return null;
    return m[1].replace(/\(.*$/, '').trim().slice(0, 30);
  }

  function buildPresentationMarkdown(meta, opts = {}) {
    const doc = $('#editor-textarea')?.value || '';
    const applied = window.GongdoBGM?.state?.appliedToGame;
    const character = extractFieldFromDoc('주인공') || '(지정 안 함)';
    const theme = extractFieldFromDoc('배경') || '(지정 안 함)';
    const lesson = state.currentLesson ? `${state.currentLesson}차시` : '자유 작품';
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const sessionMin = Math.round((now.getTime() - state.sessionStartedAt) / 60000);

    const L = [];
    L.push(`# 🎮 ${meta.title}`);
    L.push('');
    if (meta.tagline) L.push(`> ${meta.tagline}`);
    L.push('');
    if (opts.playUrl) {
      L.push(`▶ **게임 플레이**: ${opts.playUrl}`);
      L.push('');
    }
    L.push('---');
    L.push(`- **만든이**: ${state.studentId}`);
    L.push(`- **만든 날짜**: ${dateStr} ${timeStr}`);
    L.push(`- **수업 차시**: ${lesson}`);
    L.push(`- **개발 시간**: 약 ${sessionMin}분`);
    L.push('---');
    L.push('');

    L.push('## 😄 가장 재밌었던 점');
    L.push(meta.highlight || '(비어 있음)');
    L.push('');

    L.push('## 🌱 배우거나 알게 된 점');
    L.push(meta.learned || '(비어 있음)');
    L.push('');

    L.push('## 🎨 내 게임 구성');
    L.push(`- 주인공: ${character}`);
    L.push(`- 배경: ${theme}`);
    L.push(`- 배경음악: ${applied ? applied.mood || '내가 만든 음악' : '(없음)'}`);
    L.push(`- [▶ 시작] 실행 횟수: ${state.promptHistory.length}번`);
    L.push('');

    L.push('## 📝 내 바이브코딩 문서');
    L.push('```markdown');
    L.push(doc || '(문서가 비어있어요)');
    L.push('```');
    L.push('');

    if (state.tutorLog.length) {
      L.push('## 💬 공도쌤과의 대화');
      state.tutorLog.forEach((entry) => {
        const who = entry.role === 'user' ? '🙋 나' : '🦸 공도쌤';
        L.push(`- **${who}**: ${entry.text.replace(/\n/g, ' ')}`);
      });
      L.push('');
    }

    if (state.promptHistory.length) {
      L.push('## 📜 바이브코딩 이력');
      state.promptHistory.forEach((entry, i) => {
        const t = new Date(entry.at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        L.push(`${i + 1}. [${t}] ${entry.lessonNo}차시 · 문서 ${entry.document.length}자`);
      });
      L.push('');
    }

    L.push('---');
    L.push('');
    L.push('*본 발표자료는 공도 AI-Game (넷마블문화재단 × 공도) 에서 자동 생성되었어요.*');
    L.push('*© 2026 Netmarble Cultural Foundation. All Rights Reserved.*');

    return L.join('\n');
  }

  // 패들렛 친화 평문 포맷 — URL 최상단·마크다운 기호 없음·이모지·구분선
  function buildShareText(meta, opts = {}) {
    const playUrl = opts.playUrl || '';
    const character = extractFieldFromDoc('주인공') || '(지정 안 함)';
    const theme = extractFieldFromDoc('배경') || '(지정 안 함)';
    const applied = window.GongdoBGM?.state?.appliedToGame;
    const lesson = state.currentLesson ? `${state.currentLesson}차시` : '자유 작품';
    const dateStr = new Date().toISOString().slice(0, 10);
    const tutorCount = state.tutorLog.filter((e) => e.role === 'user').length;

    const L = [];
    L.push(`🎮 ${meta.title}`);
    L.push('');
    if (playUrl) {
      L.push(`👉 내 게임 플레이: ${playUrl}`);
      L.push('');
    }
    if (meta.tagline) {
      L.push(meta.tagline);
      L.push('');
    }
    L.push('━━━━━━━━━━━━━━━━━━━━━');
    L.push(`만든이: ${state.studentId}  ·  ${lesson}  ·  ${dateStr}`);
    L.push('');
    if (meta.highlight) {
      L.push('😄 가장 재밌었던 점');
      L.push(`  ${meta.highlight}`);
      L.push('');
    }
    if (meta.learned) {
      L.push('🌱 배운 점');
      L.push(`  ${meta.learned}`);
      L.push('');
    }
    L.push('🎨 내 게임 구성');
    L.push(`  • 주인공: ${character}`);
    L.push(`  • 배경: ${theme}`);
    L.push(`  • 배경음악: ${applied ? applied.mood || '내가 만든 음악' : '없음'}`);
    L.push('');
    L.push(`💬 공도쌤과 ${tutorCount}번 대화  ·  ▶ 시작 ${state.promptHistory.length}번 실행`);
    L.push('');
    L.push('━━━━━━━━━━━━━━━━━━━━━');
    L.push('© 2026 Netmarble Cultural Foundation × 공도 AI-Game');

    return L.join('\n');
  }

  function downloadMarkdown(title, content) {
    const safeName = sanitizeFilename(title);
    const filename = `${safeName}_발표자료.md`;
    const blob = new Blob(['\uFEFF' + content], { type: 'text/markdown; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  // ─────────── 초기화 ───────────
  document.addEventListener('DOMContentLoaded', () => {
    // m-03: 환경 디버그 로그 (로컬·Vercel·커스텀 도메인 자동 식별)
    console.log('[공도 AI-Game] origin:', window.location.origin);
    loadConfig();
    initLessons();
    initHeaderButtons();
    initTutor();
    initGenCancel();
    initResizeHandle();
    initVariantPanel();
    initResetPanel();
    initCodeViewPanel();
    initCharacterPanel();
    initThemePanel();
    initBgmPanel();
    initPresentation();
    initFocusGuard();
    initResponsive();
    console.log('[공도 AI-Game] S10 (emoji 임시) 캐릭터 패널 로드 완료');
  });

  // bgm.js 등 외부 모듈에서 [시작] 버튼 attention 표시 (JARVIS-2026-04-19-002 R2)
  window.GongdoApp = Object.assign(window.GongdoApp || {}, {
    highlightStartButton,
    clearStartButtonAttention,
  });
})();
