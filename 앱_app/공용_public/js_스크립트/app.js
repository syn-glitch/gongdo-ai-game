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
    currentWork: null,
    myWorks: [],
    lessonCache: new Map(),
    studentId: getOrCreateStudentId(),
    lastGeneratedHtml: null,
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

      if (!state.lessonCache.has(lessonNo)) {
        const res = await fetch(`./차시_lessons/${lessonMeta.file}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('문서 로딩 실패');
        const text = await res.text();
        state.lessonCache.set(lessonNo, text);
      }
      editor.value = state.lessonCache.get(lessonNo);
      editor.focus();
      $('#game-status').textContent =
        `${lessonNo}차시 문서가 열렸어요. 수정한 뒤 [시작]을 눌러봐요!`;
    } catch (err) {
      console.error(err);
      editor.value = `(문서를 불러오지 못했어요 — ${err.message})`;
    }
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
        $('#game-status').textContent = '게임을 만들지 못했어요. 문서를 조금 바꿔볼까요?';
        return;
      }

      state.lastGeneratedHtml = data.html;
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

  function launchGame(htmlOrUrl) {
    const viewport = $('#game-viewport');
    viewport.innerHTML = '';

    const iframe = document.createElement('iframe');
    iframe.className = 'game-iframe';
    iframe.title = '내 게임 플레이 영역';
    // 보안 정책 (M-07): allow-scripts 단일. allow-same-origin 절대 금지
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.setAttribute('loading', 'eager');

    // HTML 문자열이면 srcdoc, URL이면 src
    if (htmlOrUrl.startsWith('<') || htmlOrUrl.includes('<!DOCTYPE')) {
      iframe.srcdoc = htmlOrUrl;
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

  // ─────────── 반응형 탭 모드 ───────────
  function initResponsive() {
    const mql = window.matchMedia('(max-width: 1024px)');
    const apply = () => document.body.classList.toggle('is-tab-mode', mql.matches);
    apply();
    mql.addEventListener('change', apply);
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

  // ─────────── 캐릭터 패널 (S10) ───────────
  function initCharacterPanel() {
    const p = setupPopover({ btnId: 'btn-character', popoverId: 'character-popover', closeId: 'character-popover-close' });
    if (!p) return;
    $$('.character-card').forEach((card) => {
      card.addEventListener('click', () => {
        insertCharacterIntoDoc(card.dataset.label, card.dataset.file);
        p.toggle(false);
      });
    });
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
  }

  function insertCharacterIntoDoc(label, file) {
    const editor = $('#editor-textarea');
    if (!editor) return;
    if (!state.currentLesson) {
      $('#game-status').textContent = '먼저 왼쪽에서 차시 문서를 열어주세요!';
      return;
    }

    const newLine = `- 주인공: ${label} (이미지: /에셋_assets/캐릭터_characters/${file})`;
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
    loadConfig();
    initLessons();
    initHeaderButtons();
    initTutor();
    initGenCancel();
    initResizeHandle();
    initCharacterPanel();
    initThemePanel();
    initBgmPanel();
    initPresentation();
    initFocusGuard();
    initResponsive();
    console.log('[공도 AI-Game] S10 (emoji 임시) 캐릭터 패널 로드 완료');
  });
})();
