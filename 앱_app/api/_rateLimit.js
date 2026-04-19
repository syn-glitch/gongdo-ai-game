/**
 * ============================================
 * 📋 배포 이력 (Deploy Header)
 * ============================================
 * @file        _rateLimit.js
 * @version     v1.1.0
 * @updated     2026-04-19 (KST)
 * @agent       👩‍💻 에이다 (자비스 개발팀) · 지시: 자비스 PO
 * @ordered-by  용남 대표
 * @description rate limit 헬퍼. Vercel KV 우선, 인메모리 Map 폴백.
 *
 * @change-summary
 *   AS-IS: studentId 단일 키 → 클라이언트 studentId 스푸핑 시 rate limit 우회 가능 (S-AUTH-01)
 *   TO-BE: studentId + IP 복합 키 → 스푸핑해도 IP 같으면 동일 버킷. 프로덕션 KV 미설정 시 경고 (S-RL-01).
 *
 * @features
 *   - [수정] checkAndIncrement(scope, id, limit, ip) 4번째 인자 ip 추가
 *   - [수정] normalizeKey(scope, id, ip) 복합 키 생성
 *   - [추가] 모듈 로드 시 프로덕션 KV 미설정 경고 (S-RL-01)
 *
 * ── 변경 이력 ──────────────────────────
 * v1.1.0 | 2026-04-19 | 에이다 | S-AUTH-01 IP 복합 키 + S-RL-01 KV 미설정 경고
 * v1.0.0 | 2026-04-14 | 에이다 | 최초 작성 (S04 rate limit)
 * ============================================
 */
// S04: [시작] 5회/분, S07: 튜터 15회/분, S14: 음악 5회/분, S17: 업로드 5회/시간

const memStore = new Map();

// S-RL-01: 프로덕션에서 KV 미설정 시 경고 (인메모리 폴백은 Vercel 서버리스 인스턴스별 분리됨 — rate limit 실효 상실)
if (
  typeof process !== 'undefined' &&
  process.env?.NODE_ENV === 'production' &&
  (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN)
) {
  // eslint-disable-next-line no-console
  console.error(
    '[rate-limit] ⚠️ CRITICAL: 프로덕션에서 Vercel KV 미설정 — rate limit이 인스턴스별 메모리로 폴백되어 실질 무효화됩니다. Dashboard → Storage → gongdo-ai-game KV 연결 필요.'
  );
}

function normalizeKey(scope, id, ip) {
  const bucket = Math.floor(Date.now() / 60_000); // 분 단위 버킷
  // S-AUTH-01: IP를 보조 키로 결합. studentId 스푸핑해도 IP 같으면 동일 버킷
  const ipPart = ip ? `:${String(ip).split(',')[0].trim().slice(0, 45)}` : '';
  return `rl:${scope}:${id}${ipPart}:${bucket}`;
}

let kvModule = null;
async function getKv() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  if (!kvModule) {
    try {
      kvModule = await import('@vercel/kv');
    } catch {
      return null;
    }
  }
  return kvModule.kv;
}

/**
 * rate limit 체크 + 증가
 * @param {'generator'|'tutor'|'music'|'upload'} scope
 * @param {string} id - 학생ID (localStorage 발급)
 * @param {number} limit - 분당 허용 횟수
 * @param {string} [ip] - 요청 IP (X-Forwarded-For 또는 remoteAddress). 복합 키 보조용.
 * @returns {Promise<{ok: boolean, used: number, limit: number, resetInSec: number}>}
 */
export async function checkAndIncrement(scope, id, limit, ip = '') {
  const key = normalizeKey(scope, id, ip);
  const kv = await getKv();

  let used;
  if (kv) {
    used = await kv.incr(key);
    if (used === 1) await kv.expire(key, 90); // 90초 TTL
  } else {
    // 인메모리 폴백 (재시작 시 초기화)
    const record = memStore.get(key) || { count: 0, expires: Date.now() + 90_000 };
    record.count += 1;
    memStore.set(key, record);
    used = record.count;
    // 오래된 키 정리
    if (memStore.size > 1000) {
      const now = Date.now();
      for (const [k, v] of memStore) if (v.expires < now) memStore.delete(k);
    }
  }

  const nextBucketAt = (Math.floor(Date.now() / 60_000) + 1) * 60_000;
  const resetInSec = Math.max(1, Math.ceil((nextBucketAt - Date.now()) / 1000));

  return {
    ok: used <= limit,
    used,
    limit,
    resetInSec,
  };
}
