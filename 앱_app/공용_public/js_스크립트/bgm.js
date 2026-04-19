/**
 * ============================================
 * 📋 배포 이력 (Deploy Header)
 * ============================================
 * @file        bgm.js
 * @version     v1.2.0
 * @updated     2026-04-19 (KST)
 * @agent       👧 클로이 FE (자비스 개발팀) · 지시: 자비스 PO (대표 직접 지시)
 * @ordered-by  용남 대표
 * @description 공도 AI-Game 배경음악 — S13 기본 8-bit + S14 Claude AI 동적 악보 + 게임 적용 플로우.
 *
 * @change-summary
 *   AS-IS: v1.1 자동 재생성 → 학생이 문서 보지 않고 결과만 즐기게 됨 → 교육 취지 훼손
 *   TO-BE: 자동 재생성 롤백 + window.GongdoApp.highlightStartButton('bgm') → [시작] 버튼 attention 액션만
 *
 * @features
 *   - [삭제] scheduleAutoStart('bgm') 자동 트리거 (교육 취지 위배)
 *   - [추가] highlightStartButton('bgm') — [시작] 버튼 펄스 + 빨간 점 뱃지
 *   - [복원] 적용 토스트 "[시작] 눌러봐요!" 유지
 *
 * ── 변경 이력 ──────────────────────────
 * v1.2.0 | 2026-04-19 | 클로이 | 자동 재생성 롤백 + 시작 버튼 attention (JARVIS-2026-04-19-002 R2)
 * v1.1.0 | 2026-04-19 | 클로이 | (롤백됨) BGM 적용 시 자동 [시작]
 * v1.0.0 | (S13~S15)  | 클로이 | 최초 작성 — 8-bit BGM + AI 악보 + .wav 추출
 * ============================================
 */

// 공도 AI-Game — S13 + S14 배경음악
// S13: 기본 8-bit 하드코딩 BGM
// S14: /api/music Claude JSON 악보 → Tone.js 동적 재생
// S15(예정): MediaRecorder .wav 추출 + 게임 자동 삽입

(() => {
  'use strict';

  const state = {
    ready: false,
    synth: null,
    bass: null,
    drum: null,
    parts: [],
    isPlaying: false,
    currentSource: null,       // 'default' | 'ai'
    lastGeneratedScore: null,  // Claude가 마지막으로 만든 악보
    lastGeneratedMood: '',     // 표시용 프롬프트 요약
    appliedToGame: null,       // {score, mood} — [시작] 시 게임에 주입될 음악
  };

  // ─────────── 기본 악보 (하드코딩 8-bit 우주전투) ───────────
  const DEFAULT_SCORE = {
    tempo: 140,
    melody: [
      { time: '0:0',   note: 'C4',  dur: '8n' }, { time: '0:0.5', note: 'G4', dur: '8n' },
      { time: '0:1',   note: 'D#4', dur: '8n' }, { time: '0:1.5', note: 'G4', dur: '8n' },
      { time: '0:2',   note: 'C4',  dur: '8n' }, { time: '0:2.5', note: 'G4', dur: '8n' },
      { time: '0:3',   note: 'F4',  dur: '4n' },
      { time: '1:0',   note: 'A#3', dur: '8n' }, { time: '1:0.5', note: 'F4', dur: '8n' },
      { time: '1:1',   note: 'D4',  dur: '8n' }, { time: '1:1.5', note: 'F4', dur: '8n' },
      { time: '1:2',   note: 'A#3', dur: '8n' }, { time: '1:2.5', note: 'F4', dur: '8n' },
      { time: '1:3',   note: 'D#4', dur: '4n' },
    ],
    bass: [
      { time: '0:0', note: 'C2', dur: '2n' }, { time: '0:2', note: 'C2', dur: '2n' },
      { time: '1:0', note: 'A#1', dur: '2n' }, { time: '1:2', note: 'A#1', dur: '2n' },
    ],
    drums: [
      { time: '0:0' }, { time: '0:1' }, { time: '0:2' }, { time: '0:3' },
      { time: '1:0' }, { time: '1:1' }, { time: '1:2' }, { time: '1:3' },
    ],
  };

  // ─────────── 초기화: 신스 준비 ───────────
  async function initTone() {
    if (state.ready) return true;
    if (typeof Tone === 'undefined') {
      console.warn('[BGM] Tone.js 미로드');
      return false;
    }
    await Tone.start();

    state.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'square' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.1 },
      volume: -12,
    }).toDestination();

    state.bass = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.2 },
      volume: -15,
    }).toDestination();

    state.drum = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0 },
      volume: -20,
    }).toDestination();

    state.ready = true;
    return true;
  }

  // ─────────── 악보 로드 (기본 또는 AI 생성) ───────────
  function loadScore(score, source = 'default') {
    // 기존 Part 정리
    state.parts.forEach((p) => { try { p.stop(); p.dispose(); } catch {} });
    state.parts = [];

    Tone.Transport.bpm.value = Number(score.tempo) || 140;

    if (Array.isArray(score.melody) && score.melody.length) {
      const mel = new Tone.Part((time, val) => {
        try { state.synth.triggerAttackRelease(val.note, val.dur || '8n', time); } catch {}
      }, score.melody);
      mel.loop = true;
      mel.loopEnd = '2m';
      state.parts.push(mel);
    }
    if (Array.isArray(score.bass) && score.bass.length) {
      const b = new Tone.Part((time, val) => {
        try { state.bass.triggerAttackRelease(val.note, val.dur || '2n', time); } catch {}
      }, score.bass);
      b.loop = true;
      b.loopEnd = '2m';
      state.parts.push(b);
    }
    if (Array.isArray(score.drums) && score.drums.length) {
      const d = new Tone.Part((time) => {
        try { state.drum.triggerAttackRelease('16n', time); } catch {}
      }, score.drums);
      d.loop = true;
      d.loopEnd = '2m';
      state.parts.push(d);
    }
    state.parts.forEach((p) => p.start(0));
    state.currentSource = source;
  }

  async function play(score, source) {
    const ok = await initTone();
    if (!ok) return false;
    loadScore(score, source);
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    Tone.Transport.start('+0.05');
    state.isPlaying = true;
    updateButtonState();
    return true;
  }

  function stop() {
    if (!state.ready) return;
    Tone.Transport.stop();
    state.isPlaying = false;
    updateButtonState();
  }

  function updateButtonState() {
    const defaultBtn = document.getElementById('btn-bgm-default');
    const defaultLabel = document.getElementById('bgm-default-label');
    const toolbarBtn = document.getElementById('btn-bgm');
    const toolbarLabel = document.getElementById('btn-bgm-label');
    const aiActions = document.getElementById('bgm-ai-actions');

    if (defaultBtn) {
      const playing = state.isPlaying && state.currentSource === 'default';
      defaultBtn.classList.toggle('is-playing', playing);
      if (defaultLabel) defaultLabel.textContent = playing ? '정지' : '재생';
    }
    if (toolbarBtn) {
      toolbarBtn.setAttribute('aria-pressed', state.isPlaying ? 'true' : 'false');
      if (toolbarLabel) {
        toolbarLabel.textContent = state.isPlaying ? '재생중' : '음악';
      }
    }
    // AI 액션 영역: 음악 생성됐을 때만 표시
    if (aiActions) {
      const show = !!state.lastGeneratedScore;
      aiActions.hidden = !show;
    }
    // AI 토글 버튼 (정지 ↔ 재생) 라벨·아이콘
    const toggleBtn = document.getElementById('btn-bgm-toggle');
    const toggleIcon = document.getElementById('btn-bgm-toggle-icon');
    const toggleLabel = document.getElementById('btn-bgm-toggle-label');
    if (toggleBtn && toggleIcon && toggleLabel) {
      const aiPlaying = state.isPlaying && state.currentSource === 'ai';
      toggleBtn.classList.toggle('is-playing', aiPlaying);
      toggleIcon.textContent = aiPlaying ? '⏹' : '▶';
      toggleLabel.textContent = aiPlaying ? '음악 정지' : '음악 다시 듣기';
    }
  }

  function updateAppliedBadge() {
    const badge = document.getElementById('bgm-applied-badge');
    const mood = document.getElementById('bgm-applied-mood');
    const startBadge = document.getElementById('start-music-badge');
    if (state.appliedToGame) {
      if (badge) badge.hidden = false;
      if (mood) mood.textContent = state.appliedToGame.mood || '음악';
      if (startBadge) startBadge.hidden = false;
    } else {
      if (badge) badge.hidden = true;
      if (startBadge) startBadge.hidden = true;
    }
  }

  // ─────────── 기본 BGM 토글 ───────────
  async function toggleDefault() {
    if (state.isPlaying && state.currentSource === 'default') {
      stop();
    } else {
      await play(DEFAULT_SCORE, 'default');
    }
  }

  // ─────────── AI 음악 생성 (S14) ───────────
  async function generateFromPrompt(prompt) {
    const studentId = localStorage.getItem('gongdo-student-id') || 'anon';
    const res = await fetch('/api/music', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, studentId }),
    });
    if (res.status === 429) {
      const data = await res.json();
      return { rateLimited: true, message: data.message, resetInSec: data.resetInSec };
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { error: true, message: data.message || '음악을 만들지 못했어요' };
    }
    return res.json();
  }

  // ─────────── 3단계 피드백으로 "게임에 넣기" ───────────
  async function applyToGameWithFeedback() {
    const statusEl = document.getElementById('bgm-ai-status');
    const progressEl = document.getElementById('bgm-apply-progress');
    const progressText = document.getElementById('bgm-apply-text');
    const actionsEl = document.getElementById('bgm-ai-actions');
    const applyBtn = document.getElementById('btn-bgm-apply');

    // 1단계: 재생 중이면 페이드아웃 후 정지
    if (state.isPlaying && state.synth && state.bass && state.drum) {
      try {
        state.synth.volume.rampTo(-60, 0.3);
        state.bass.volume.rampTo(-60, 0.3);
        state.drum.volume.rampTo(-60, 0.3);
      } catch {}
      await new Promise((r) => setTimeout(r, 350));
      stop();
      // 볼륨 원복
      try {
        state.synth.volume.rampTo(-12, 0.1);
        state.bass.volume.rampTo(-15, 0.1);
        state.drum.volume.rampTo(-20, 0.1);
      } catch {}
    }

    // 2단계: 진행 표시 (1.2초)
    if (applyBtn) applyBtn.disabled = true;
    if (statusEl) statusEl.textContent = '';
    if (progressEl && progressText) {
      progressText.textContent = '음악을 게임에 넣는 중...';
      progressEl.hidden = false;
    }
    await new Promise((r) => setTimeout(r, 1200));

    // 3단계: 저장·완료 메시지·버튼 하이라이트
    state.appliedToGame = {
      score: state.lastGeneratedScore,
      mood: state.lastGeneratedMood,
    };
    updateAppliedBadge();

    if (progressEl && progressText) {
      progressText.textContent = '✅ 음악이 준비됐어요!';
      progressEl.style.background = 'var(--color-green)';
      progressEl.style.color = 'var(--color-cream)';
    }
    if (statusEl) {
      statusEl.className = 'bgm-ai-status is-success';
      statusEl.textContent = `🎉 이제 [▶ 시작] 버튼을 눌러봐요! '${state.lastGeneratedMood}' 음악과 함께 게임이 나와요.`;
    }

    // [시작] 버튼 attention (펄스 + 빨간 점) — 학생이 직접 누를 때까지 유지
    try { window.GongdoApp?.highlightStartButton?.('bgm'); } catch {}

    setTimeout(() => {
      if (progressEl) {
        progressEl.hidden = true;
        progressEl.style.background = '';
        progressEl.style.color = '';
      }
      if (applyBtn) applyBtn.disabled = false;
    }, 2500);
  }

  // ─────────── AudioContext 선해제 (사용자 제스처 유지용) ───────────
  // [시작] 클릭 시 호출 — 소리는 내지 않고 Tone.js 를 활성화만 해둠
  // 나중에 게임이 로드된 후 playAppliedIfAny 가 바로 재생 가능하게 한다
  async function prewarmAudio() {
    if (state.ready) return true;
    return initTone();
  }

  // ─────────── 게임 로드 직후 실제 재생 시작 ───────────
  async function playAppliedIfAny() {
    if (!state.appliedToGame) return false;
    try {
      await play(state.appliedToGame.score, 'ai');
      return true;
    } catch (err) {
      console.warn('[BGM] 자동 재생 실패:', err);
      return false;
    }
  }

  // ─────────── UI 바인딩 ───────────
  function initUI() {
    const defaultBtn = document.getElementById('btn-bgm-default');
    if (defaultBtn) defaultBtn.addEventListener('click', toggleDefault);

    // AI 음악 정지 ↔ 재생 토글 버튼
    const toggleBtn = document.getElementById('btn-bgm-toggle');
    if (toggleBtn) toggleBtn.addEventListener('click', async () => {
      const aiPlaying = state.isPlaying && state.currentSource === 'ai';
      if (aiPlaying) {
        stop();
      } else if (state.lastGeneratedScore) {
        await play(state.lastGeneratedScore, 'ai');
      }
    });

    // "게임에 넣기" 버튼 — 3단계 피드백
    const applyBtn = document.getElementById('btn-bgm-apply');
    if (applyBtn) applyBtn.addEventListener('click', async () => {
      if (!state.lastGeneratedScore) return;
      await applyToGameWithFeedback();
    });

    // 적용 취소 버튼
    const clearBtn = document.getElementById('bgm-applied-clear');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      state.appliedToGame = null;
      updateAppliedBadge();
    });

    const form = document.getElementById('bgm-ai-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('bgm-ai-input');
        const statusEl = document.getElementById('bgm-ai-status');
        const genBtn = document.getElementById('btn-bgm-generate');
        const prompt = input.value.trim();
        if (!prompt) return;

        genBtn.disabled = true;
        statusEl.className = 'bgm-ai-status';
        statusEl.textContent = '공도쌤이 음악을 만들고 있어요... 🎹 (5~10초)';

        try {
          const data = await generateFromPrompt(prompt);
          if (data.rateLimited) {
            statusEl.className = 'bgm-ai-status is-error';
            statusEl.textContent = data.message || '잠시 기다려주세요';
          } else if (data.error) {
            statusEl.className = 'bgm-ai-status is-error';
            statusEl.textContent = data.message || '다시 시도해볼까요?';
          } else if (data.score) {
            state.lastGeneratedScore = data.score;
            state.lastGeneratedMood = data.score.mood || prompt;
            await play(data.score, 'ai');
            statusEl.className = 'bgm-ai-status is-success';
            statusEl.textContent = `🎉 '${state.lastGeneratedMood}' 음악이 들리나요? 마음에 들면 아래 [✅ 이 음악을 내 게임에 넣기] 를 눌러요!`;
            updateButtonState();
          }
        } catch (err) {
          statusEl.className = 'bgm-ai-status is-error';
          statusEl.textContent = '음악 만들기에 실패했어요. 다시 시도해볼까요?';
        } finally {
          genBtn.disabled = false;
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', initUI);

  // 외부 노출 (S15 MediaRecorder 에서 사용)
  window.GongdoBGM = {
    play,
    stop,
    loadScore,
    toggleDefault,
    prewarmAudio,
    playAppliedIfAny,
    get state() { return state; },
    getAppliedScore() { return state.appliedToGame ? state.appliedToGame.score : null; },
  };
})();
