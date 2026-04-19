/**
 * ============================================
 * 📋 배포 이력 (Deploy Header)
 * ============================================
 * @file        upload-game.js
 * @version     v1.1.0
 * @updated     2026-04-19 (KST)
 * @agent       👩‍💻 에이다 (자비스 개발팀) · 지시: 자비스 PO
 * @ordered-by  용남 대표
 * @description /api/upload-game — 학생 게임 HTML → Supabase Storage → 공유 URL 반환.
 *              Padlet iframe 임베드용 /api/play?id= 프록시 경로 사용.
 *
 * @change-summary
 *   AS-IS: studentId 단일 키 rate limit
 *   TO-BE: studentId + IP 복합 키 rate limit (S-AUTH-01)
 *
 * @features
 *   - [수정] checkAndIncrement 에 IP 전달
 *
 * ── 변경 이력 ──────────────────────────
 * v1.1.0 | 2026-04-19 | 에이다 | S-AUTH-01 IP 복합 키
 * v1.0.0 | 2026-04-15 | 에이다 | 최초 작성 (S17 v2)
 * ============================================
 */

import { createClient } from '@supabase/supabase-js';
import { checkAndIncrement } from './_rateLimit.js';

const MAX_BYTES = 100 * 1024; // 100KB

function makePath(studentId, _title) {
  // Supabase Storage 키는 ASCII 만 안전. 한글 제목은 DB의 title 컬럼에만 보관.
  const safeId = (studentId || 'anon').replace(/[^\w-]/g, '').slice(0, 24);
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${safeId}/${ts}_${rand}.html`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST만 허용됩니다' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const html = (body?.html || '').toString();
  // S-AUTH-01: IP 추출 rate limit 복합 키 보조
  const forwardedFor = (req.headers['x-forwarded-for'] || '').toString();
  const reqIp = forwardedFor.split(',')[0].trim() || req.socket?.remoteAddress || '';
  const studentId = (body?.studentId || '').trim() || reqIp || 'anon';
  const title = (body?.title || '').toString().slice(0, 60);
  const tagline = (body?.tagline || '').toString().slice(0, 200);
  const lessonNo = Number(body?.lessonNo) || null;
  const mood = (body?.mood || '').toString().slice(0, 60);

  if (!html || !html.includes('<!DOCTYPE') && !html.includes('<html')) {
    res.status(400).json({ error: '게임 HTML 이 비어있거나 형식이 잘못됐어요' });
    return;
  }
  const sizeBytes = new TextEncoder().encode(html).length;
  if (sizeBytes > MAX_BYTES) {
    res.status(413).json({ error: `게임 파일이 너무 커요 (${(sizeBytes / 1024).toFixed(1)}KB · 최대 100KB)` });
    return;
  }

  // rate limit (학생당 시간당 5개 게임 업로드 — S-AUTH-01: studentId + IP 복합 키)
  const rl = await checkAndIncrement('upload', studentId, 5, reqIp);
  if (!rl.ok) {
    res.status(429).json({
      error: 'rate_limited',
      resetInSec: rl.resetInSec,
      message: '한 시간에 5개까지만 공유할 수 있어요. 조금만 기다려볼까요? 🎵',
    });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'Supabase 미설정' });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const storagePath = makePath(studentId, title);

  try {
    const { error: upErr } = await supabase.storage
      .from('student-games')
      .upload(storagePath, html, {
        contentType: 'text/html',
        cacheControl: '3600',
        upsert: false,
      });
    if (upErr) throw upErr;

    const { data: pub } = supabase.storage.from('student-games').getPublicUrl(storagePath);
    const storageUrl = pub.publicUrl;

    // games 테이블에 메타 기록
    const { data: insertData, error: dbErr } = await supabase
      .from('games')
      .insert({
        student_id: studentId,
        title: title || '내 게임',
        tagline,
        lesson_no: lessonNo,
        storage_path: storagePath,
        public_url: storageUrl,
        size_bytes: sizeBytes,
        mood,
      })
      .select('id, created_at, expires_at')
      .single();

    if (dbErr || !insertData) {
      console.warn('[upload-game] DB insert 실패:', dbErr?.message);
      res.status(502).json({ error: 'db_error', message: '저장 정보를 기록하지 못했어요. 다시 시도해볼까요?' });
      return;
    }

    // 학생/친구가 사용할 공유 URL — Supabase 직접 URL 대신 우리 /api/play 프록시
    // (Supabase public URL 은 CSP 로 잠겨 패들렛 iframe 에서 실행 안 됨)
    const host = req.headers.host || 'localhost:3000';
    const proto = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
    const playUrl = `${proto}://${host}/api/play?id=${insertData.id}`;

    res.status(200).json({
      ok: true,
      url: playUrl,           // 학생이 패들렛에 붙여넣는 URL (반드시 이것 사용)
      storageUrl,             // 디버그·다운로드용 직접 URL
      path: storagePath,
      size: sizeBytes,
      id: insertData.id,
      expiresAt: insertData.expires_at,
      rateLimit: { used: rl.used, limit: rl.limit, resetInSec: rl.resetInSec },
    });
  } catch (err) {
    console.error('[upload-game] 오류:', err?.message || err);
    res.status(502).json({
      error: 'storage_error',
      message: '게임을 올리지 못했어요. 다시 시도해볼까요?',
    });
  }
}
