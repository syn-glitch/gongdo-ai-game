/**
 * ============================================
 * 📋 배포 이력 (Deploy Header)
 * ============================================
 * @file        play.js
 * @version     v1.1.0
 * @updated     2026-04-19 (KST)
 * @agent       👩‍💻 에이다 (자비스 개발팀) · 지시: 자비스 PO
 * @ordered-by  용남 대표
 * @description /api/play — Supabase Storage 학생 게임 HTML 프록시 서빙.
 *              Padlet iframe 임베드 지원.
 *
 * @change-summary
 *   AS-IS: CSP 헤더 부재 → 업로드 HTML 이 동일 출처에서 외부 fetch 가능 (localStorage 탈취 경로) — S-UPL-01
 *   TO-BE: CSP 추가 default-src 'self' 기반으로 외부 도메인 fetch/XHR 차단, 게임 내부 기능(인라인 스크립트·이미지·폰트)은 유지
 *
 * @features
 *   - [추가] Content-Security-Policy 헤더 — 외부 도메인 fetch/XHR 차단 (S-UPL-01)
 *
 * ── 변경 이력 ──────────────────────────
 * v1.1.0 | 2026-04-19 | 에이다 | S-UPL-01 CSP 추가
 * v1.0.0 | 2026-04-15 | 에이다 | 최초 작성 (S17 v2)
 * ============================================
 */
// Supabase public URL 은 CSP `default-src 'none'; sandbox` 로 잠겨 있어 직접 사용 불가 → 우리 프록시로 서빙.

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // GET ?id=UUID
  const url = new URL(req.url, `http://${req.headers.host}`);
  const gameId = url.searchParams.get('id');

  if (!gameId || !/^[0-9a-fA-F-]{36}$/.test(gameId)) {
    res.status(400).setHeader('Content-Type', 'text/html; charset=utf-8').end(errorPage('잘못된 게임 주소예요'));
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    res.status(500).setHeader('Content-Type', 'text/html; charset=utf-8').end(errorPage('서버 설정 오류'));
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // 1) games 테이블에서 storage_path 조회
    const { data: gameRow, error: dbErr } = await supabase
      .from('games')
      .select('storage_path, title, expires_at')
      .eq('id', gameId)
      .single();

    if (dbErr || !gameRow) {
      res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8').end(errorPage('게임을 찾을 수 없어요'));
      return;
    }
    if (gameRow.expires_at && new Date(gameRow.expires_at) < new Date()) {
      res.status(410).setHeader('Content-Type', 'text/html; charset=utf-8').end(errorPage('게임 보관 기간이 끝났어요 (90일)'));
      return;
    }

    // 2) Storage 에서 HTML 다운로드
    const { data: blob, error: dlErr } = await supabase.storage
      .from('student-games')
      .download(gameRow.storage_path);

    if (dlErr || !blob) {
      res.status(502).setHeader('Content-Type', 'text/html; charset=utf-8').end(errorPage('게임 파일을 불러오지 못했어요'));
      return;
    }

    const html = await blob.text();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Padlet 등 외부 사이트의 iframe 임베드 허용
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    // S-UPL-01: 동일 출처 XSS 경로 봉쇄 — default-src 'self' 로 외부 fetch/XHR 차단.
    // 인라인 스크립트·Tone.js CDN·이모지 폰트는 허용하여 학생 게임 기능 유지.
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' https: data: blob:",
        "media-src 'self' blob: data:",
        "connect-src 'self'",
        "frame-ancestors *",
      ].join('; ')
    );
    res.end(html);
  } catch (err) {
    console.error('[play] 오류:', err?.message || err);
    res.status(500).setHeader('Content-Type', 'text/html; charset=utf-8').end(errorPage('잠깐 문제가 생겼어요'));
  }
}

function errorPage(msg) {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>공도 AI-Game</title>
<style>body{font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;background:#FFF8EC;color:#5B3A22;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:24px}
.card{background:#fff;border:3px solid #1A1A1A;border-radius:16px;padding:32px;box-shadow:4px 4px 0 #1A1A1A;max-width:420px}
h1{font-size:28px;color:#E63946;margin:0 0 12px}p{font-size:16px;line-height:1.5;margin:0}.emoji{font-size:64px;margin-bottom:12px}</style></head>
<body><div class="card"><div class="emoji">🤖</div><h1>${msg}</h1><p>친구에게 다시 게임 주소를 받아볼까요?</p></div></body></html>`;
}
