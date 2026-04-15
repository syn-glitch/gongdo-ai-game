// 공도 AI-Game — rate limit 헬퍼
// Vercel KV 사용 가능 시 KV, 아니면 인메모리 Map (로컬 개발용)
// S04: [시작] 5회/분, S07: 튜터 15회/분

const memStore = new Map();

function normalizeKey(scope, id) {
  const bucket = Math.floor(Date.now() / 60_000); // 분 단위 버킷
  return `rl:${scope}:${id}:${bucket}`;
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
 * @param {'generator'|'tutor'} scope
 * @param {string} id - 학생ID 또는 IP
 * @param {number} limit - 분당 허용 횟수
 * @returns {Promise<{ok: boolean, used: number, limit: number, resetInSec: number}>}
 */
export async function checkAndIncrement(scope, id, limit) {
  const key = normalizeKey(scope, id);
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
