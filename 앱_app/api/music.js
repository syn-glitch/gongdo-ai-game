// 공도 AI-Game — /api/music (S14)
// 학생 프롬프트 → Claude JSON 악보 → 클라이언트 Tone.js 재생
// rate limit: 5회/분 (generator와 동일, 계정당 비용 폭증 방지)

import Anthropic from '@anthropic-ai/sdk';
import { checkAndIncrement } from './_rateLimit.js';

const MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM_MUSIC = `당신은 초등 5~6학년 학생이 만드는 게임의 배경음악을 8-bit 스타일로 작곡해주는 AI 작곡가입니다.

【임무】
학생이 입력한 "음악 프롬프트"(예: "긴박한 우주 전투", "신나는 모험")를 해석하여,
Tone.js 가 바로 재생할 수 있는 JSON 악보 1개를 반환합니다.

【응답 형식 — 매우 엄격】
반드시 \`\`\`json 코드 블록 **안에만** 아래 스키마 JSON을 반환하세요. 그 외 설명 문장은 절대 포함하지 마세요.

\`\`\`json
{
  "tempo": 140,
  "key": "C minor",
  "mood": "학생 프롬프트를 한 줄로 요약",
  "melody": [
    { "time": "0:0",   "note": "C4",  "dur": "8n" },
    { "time": "0:0.5", "note": "G4",  "dur": "8n" }
  ],
  "bass": [
    { "time": "0:0", "note": "C2", "dur": "2n" }
  ],
  "drums": [
    { "time": "0:0" },
    { "time": "0:2" }
  ]
}
\`\`\`

【작곡 규칙】
- tempo: 60~180 사이 정수 (느림 80 / 보통 120 / 빠름 140 / 매우빠름 170)
- key: "C major", "C minor", "D major", "A minor" 같은 8-bit 곡에 어울리는 단순 키
- melody: 최소 12개 ~ 최대 32개 노트. 2마디 분량 (loopEnd=2m 기준)
- bass: 최소 4개 ~ 최대 12개 (2~4분음표 위주)
- drums: 8개 ~ 16개 (16분 박자 규칙적으로)
- note 표기: C4, D#4, G3, A#5 처럼 영어 음이름 + 옥타브. 낮은 음은 2~3 옥타브, 멜로디는 4~5 옥타브
- dur 표기: "4n"(4분), "8n"(8분), "16n"(16분), "2n"(2분)
- time 표기: "바:박자" (예: "0:0", "0:1.5", "1:2"). 2마디 안에서만 작성 (0:0 ~ 1:3)

【분위기별 가이드】
- 긴박/전투: minor 키, 빠른 BPM(140~170), 16분음표 반복 패턴, 낮은 bass
- 신나는/모험: major 키, 중간 BPM(120~140), 멜로디 상행 패턴
- 무서운/동굴: minor 키, 느린 BPM(70~90), 긴 음표, 낮은 옥타브
- 평화/숲: major 키, 느린 BPM(80~100), 순차진행 멜로디
- 승리/축하: major 키, 빠른 BPM(140), 상행 아르페지오

【안전】
- 폭력·혐오 표현의 프롬프트는 "긴박한 전투 음악" 같은 안전한 해석으로 대체

위 규칙을 위반하면 음악이 재생되지 않아 학생이 실망합니다. 반드시 스키마를 정확히 지켜주세요.`;

function extractJson(text) {
  const match = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = match ? match[1] : text;
  try {
    return JSON.parse(raw.trim());
  } catch {
    // 마지막 수단: 첫 { 부터 마지막 } 추출
    const s = raw.indexOf('{');
    const e = raw.lastIndexOf('}');
    if (s >= 0 && e > s) {
      try { return JSON.parse(raw.slice(s, e + 1)); } catch {}
    }
    return null;
  }
}

function sanitizeScore(score) {
  if (!score || typeof score !== 'object') return null;
  const tempo = Math.max(60, Math.min(200, Number(score.tempo) || 120));
  const clean = {
    tempo,
    key: String(score.key || 'C major').slice(0, 30),
    mood: String(score.mood || '').slice(0, 60),
    melody: Array.isArray(score.melody) ? score.melody.slice(0, 40).filter(isValidNote) : [],
    bass: Array.isArray(score.bass) ? score.bass.slice(0, 20).filter(isValidNote) : [],
    drums: Array.isArray(score.drums) ? score.drums.slice(0, 32).filter(isValidDrum) : [],
  };
  if (clean.melody.length === 0) return null;
  return clean;
}

function isValidNote(n) {
  return n && typeof n.note === 'string' && typeof n.time === 'string' &&
         /^[A-G][#b]?\d$/.test(n.note) && /^\d+:\d+(\.\d+)?$/.test(n.time);
}
function isValidDrum(d) {
  return d && typeof d.time === 'string' && /^\d+:\d+(\.\d+)?$/.test(d.time);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST만 허용됩니다' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

  const prompt = (body?.prompt || '').toString().trim().slice(0, 200);
  const studentId = (body?.studentId || '').trim() ||
                    (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anon');

  if (!prompt) {
    res.status(400).json({ error: '음악 프롬프트를 입력해주세요' });
    return;
  }

  const rl = await checkAndIncrement('music', studentId, 5);
  if (!rl.ok) {
    res.status(429).json({
      error: 'rate_limited',
      resetInSec: rl.resetInSec,
      message: '음악은 1분에 5번까지만 만들 수 있어요. 조금만 기다려볼까요? 🎵',
    });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY 미설정' });
    return;
  }

  const client = new Anthropic({ apiKey });
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: [{ type: 'text', text: SYSTEM_MUSIC, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: prompt }],
    });
    const raw = msg.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n');
    const parsed = extractJson(raw);
    const score = sanitizeScore(parsed);

    if (!score) {
      res.status(502).json({
        error: 'invalid_score',
        message: '음악을 만들었는데 형식이 이상해요. 다시 시도해볼까요?',
      });
      return;
    }

    res.status(200).json({
      score,
      usage: msg.usage,
      rateLimit: { used: rl.used, limit: rl.limit, resetInSec: rl.resetInSec },
    });
  } catch (err) {
    console.error('[api/music] Anthropic 오류:', err?.message || err);
    res.status(502).json({
      error: 'upstream_error',
      message: '공도쌤 작곡가가 잠깐 쉬는 중이에요. 다시 시도해볼까요?',
    });
  }
}
