<!--
============================================
📋 문서 배포 이력 (Deploy Header)
============================================
@file        HANDOFF_QUICKSTART.md
@version     v1.0.0
@updated     2026-04-28 (KST)
@agent       🛡️ 벙커 송PO
@ordered-by  용남 대표
@description 외부 개발자 인수인계 Quick Start — 2분 안에 시작점 파악, 5분 안에 로컬 개발 진입.
@audience    문유나 (외부 개발자)
@scope       gongdo-ai-game v0.4.3-bg-gate 기준
============================================
-->

# 🤝 외부 개발자 인수인계 — Quick Start

> **2분 읽고 시작 가능한 진입 가이드.** 깊은 내용은 [DEVELOPER_HANDOFF.md](./DEVELOPER_HANDOFF.md) 참고.

---

## 📦 인수인계 현황

| 항목 | 상태 | 비고 |
|---|---|---|
| GitHub repo 권한 | ✅ 부여 완료 | `gongdo-yuna` collaborator |
| Vercel 팀 권한 | ⏳ 결제 복구 후 부여 | 임시로 송PO가 배포 대행 |
| API 키 묶음 | 🔑 Slack DM 별도 전달 | `.env.local` 직접 작성 |
| 핸드오프 문서 | ✅ 준비 완료 | [DEVELOPER_HANDOFF.md](./DEVELOPER_HANDOFF.md) |

---

## 🔗 핵심 링크

| 자원 | URL |
|---|---|
| **GitHub repo** | https://github.com/syn-glitch/gongdo-ai-game |
| **라이브 URL** | https://gongdo-ai-game.vercel.app |
| **상세 핸드오프 문서** | [docs/DEVELOPER_HANDOFF.md](./DEVELOPER_HANDOFF.md) |
| **현재 안정 tag** | `v0.4.3-bg-gate` (commit `3f79194`) |

---

## 🚀 5분 로컬 개발 진입 절차

### 1. Clone & install

```bash
git clone https://github.com/syn-glitch/gongdo-ai-game.git
cd gongdo-ai-game/앱_app
npm install
```

### 2. `.env.local` 작성 (키 값은 Slack DM 으로 받음)

```
ANTHROPIC_API_KEY=...        # 필수 (chat, music)
SUPABASE_URL=...             # 필수 (play, upload-game)
SUPABASE_ANON_KEY=...        # 필수
KV_REST_API_URL=...          # 선택 (rate limit)
KV_REST_API_TOKEN=...        # 선택
```

### 3. 로컬 실행

```bash
npm run dev
# → http://localhost:3000
```

---

## 🔄 임시 운영 워크플로우 (Vercel 결제 복구 전까지)

```
[문유나]                          [송PO]
 ├─ feature 브랜치 작업
 ├─ origin 에 push          →    PR 리뷰 + main merge
 ├─ PR 생성                 →    main 에서 vercel --prod 수동 배포
 └─ 이슈 진단 (5분 가이드)        Vercel 로그 조회 대신해줌
```

> Vercel 결제 복구 시 즉시 **Member** 권한 부여 → 직접 배포로 전환.

---

## ⚠️ 주의사항 (꼭 숙지)

1. **`moon` 원격은 fork — push 절대 금지** (`origin` 에만 push)
2. **수동 배포 명령**: `cd 앱_app && vercel --prod --yes` (webhook 미복구 상태)
3. **`manifest.json` 의 `featureFlags`** 가 단일 토글 진실 (현재 S17 파일럿: 1·2차시만 활성)
4. **API 비용은 송PO 계정에 청구** — 디버깅 시 chat 호출 최소화 권장
5. **`.env.local` 절대 커밋 금지** (`.gitignore` 등록되어 있음)

---

## 📞 첫 진입 시 확인 순서

1. 본 문서 읽기 (2분)
2. [DEVELOPER_HANDOFF.md §1~2](./DEVELOPER_HANDOFF.md) 읽기 (10분) — 빠른 시작 + 5분 진단 가이드
3. Slack DM 으로 키 묶음 수령 → `.env.local` 작성
4. 로컬 실행 → 라이브 URL 과 동작 비교
5. 막히면 송PO 호출 또는 [DEVELOPER_HANDOFF.md §9](./DEVELOPER_HANDOFF.md) 알려진 이슈 참조

---

## 📬 문의

- **송PO (송용남)**: 인수인계·배포·전체 의사결정
- **DEVELOPER_HANDOFF.md §12**: 연락처·역할 정리됨
