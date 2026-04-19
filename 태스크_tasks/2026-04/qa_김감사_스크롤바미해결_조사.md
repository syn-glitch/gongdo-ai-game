# QA-2026-04-19-001 — 스크롤바 미해결 사유 조사

---
- **QA ID**: QA-2026-04-19-001
- **요청일**: 2026-04-19
- **담당팀**: 🕵️ 김감사 QA팀
- **검수 대상**: JARVIS-2026-04-19-001 (자비스 팀 ee70ab8 패치 사후 검증)
- **판정**: ❌ **반려** — 단, 코드 결함 아님 / **배포 파이프라인 장애**
- **CRITICAL**: 1건 / MAJOR: 1건 / MINOR: 0건
---

## 요청 원문
> 스크롤바 문제가 해결안되었는데 QA해봐

## 결론 (한 줄)
자비스 팀의 코드 패치는 정확하나, **Vercel 자동 배포가 4일째 멈춰 있어** 운영 환경은 여전히 패치 이전 코드를 서빙 중. 사용자가 본 "스크롤바"는 코드 버그가 아닌 **배포 미반영**의 결과.

---

## 증거 (Evidence)

### ① 배포된 app.js 가 OLD 버전
```bash
curl -sI https://gongdo-ai-game.vercel.app/공용_public/js_스크립트/app.js
```
| 헤더 | 값 | 의미 |
|------|-----|------|
| `last-modified` | **Wed, 15 Apr 2026 11:34:58 GMT** | 4일 전 빌드 |
| `age` | 320346 (≈89시간) | CDN 에 89시간째 캐시 적중 |
| `x-vercel-cache` | HIT | 새 배포 invalidate 미발생 |

배포본 첫 25줄에 `/** @version v1.1.0 */` 헤더가 **없음** — 즉 v1.0(초기 S02 버전) 그대로.

### ② 운영 iframe 속성 확인 (live JS 평가)
```js
{
  "scrolling":              null,    // ← scrolling="no" 미적용
  "srcdocHasLock":          false,   // ← gongdo-viewport-lock CSS 미주입
  "srcdocHasOverflowHidden": 0       // ← 어디에도 overflow:hidden 없음
}
```

### ③ 생성 게임 HTML 가 v1.3.0 프롬프트 규칙 위반
운영 환경 [시작]으로 새로 생성된 게임 HTML 의 `<style>` 본문:
```css
#gameContainer {
  position: relative;
  width: 800px;     /* ← v1.3.0 가 명시적으로 금지한 800x600 고정 */
  height: 600px;    /* ← */
}
body {
  min-height: 100vh;  /* ← overflow:hidden 없음 */
}
```
v1.3.0 SYSTEM_GENERATOR 가 적용됐다면 절대 나올 수 없는 구조 → **api/chat.js 도 OLD 버전**.

### ④ 패치 자체는 정상
- Local app.js: v1.1.0 헤더, `injectViewportLockCss` 함수, `scrolling="no"` 부여 모두 존재 ✅
- Local chat.js: v1.3.0 헤더, 【🔴 뷰포트 고정 규칙】 블록 존재 ✅
- `git log origin/main`: HEAD = ee70ab8 (push 정상 도달) ✅

### ⑤ 사용자가 본 "스크롤"의 실제 원인
- iframe 뷰포트 ≈ 568×549 px
- 생성 게임의 `#gameContainer` = 800×600 px (고정)
- 800 > 568, 600 > 549 → **body 가 좌우·상하 모두 넘침**
- body 에 overflow:hidden 없음 + iframe scrolling 속성 없음 → 4방향 스크롤바 발생 ✅

---

## 이슈 분류

### 🔥 CRITICAL — Vercel 자동 배포 중단
- **유형**: 배포 인프라 장애
- **영향**: 2026-04-15 이후 푸시된 **최소 5건의 커밋이 운영에 미반영**
  - ee70ab8 (viewport scroll fix) ← 본 건
  - 46e67ce (P1 안정화 4건)
  - f1ebd96 (Canvas 이미지 프리로드)
  - 22ccd62 (system prompt 재설계)
  - 5162d67 (chat.js 백틱 500 에러 수정)
- **재현**: `curl -sI <vercel URL>/공용_public/js_스크립트/app.js` → last-modified 가 4월 15일
- **추정 원인 (가설)**:
  1. GitHub → Vercel 웹훅 연결 끊김
  2. Vercel 빌드 실패 (에러 미관측)
  3. Korean 파일명(`공용_public`) 인코딩으로 Vercel 빌드가 일부 자산 누락
  4. Vercel 프로젝트가 다른 브랜치를 추적

### ⚠️ MAJOR — 배포 게이트 부재
- 자비스 팀이 push 후 "Vercel 자동 배포 트리거됨"이라고 보고했으나, 실제 운영 헬스체크가 자동화돼 있지 않음
- 동일 패턴이 5번 반복되도록 관측되지 않음 = 푸시 후 배포 검증 단계 결여

---

## 권장 조치 (Recommended Actions)

### 즉시 (자비스 / 슈베이스 DevOps)
1. **수동 재배포**:
   - Option A: `vercel --prod --force` (vercel CLI)
   - Option B: Vercel dashboard → Deployments → "Redeploy" 클릭
   - Option C: 빈 커밋 `git commit --allow-empty -m "chore: trigger redeploy"` 후 push
2. 재배포 후 `curl -sI .../app.js` 재확인 → `last-modified` 가 오늘로 갱신됐는지 검증
3. v1.1.0 / v1.3.0 헤더 라이브 확인 → 본 QA 재검수 (15분 내 가능)

### 단기 (자비스 PO / 벙커 PM)
4. Vercel ↔ GitHub 연동 상태 점검 (Vercel 대시보드 Settings → Git)
5. 최근 5건 커밋의 deployment 로그 확인 — 빌드 실패가 있었는지

### 중기 (강철 AX팀)
6. 푸시 직후 자동 배포 검증 스크립트 도입 (예: GitHub Actions → curl 헬스체크 → 실패 시 슬랙 알림)
7. Korean 경로(`공용_public`) 자산이 정상 deploy 되는지 정기 점검

---

## 위임 안내 🔀

```
──────────────────────────
🔀 업무 위임 안내
──────────────────────────
발견 내용: Vercel 자동 배포가 2026-04-15 이후 동작하지 않아
           최근 5건의 푸시가 운영에 미반영. 본 건(스크롤바 패치)도
           코드는 정확하나 배포 미적용 상태.

이 작업의 담당 팀:
  🥇 1차: 🦸 슈베이스 (Supabase/DevOps) — Vercel 재배포 트리거
  🥈 2차: 🤵 자비스 PO — Vercel 대시보드 빌드 로그 확인
  🥉 3차: 🔧 강철 AX팀 — 배포 자동 검증 게이트 구축 (중기)

권장 조치:
  1. 즉시 vercel --prod --force OR Vercel UI Redeploy
  2. 재배포 후 curl 로 last-modified 갱신 확인
  3. 김감사 QA팀에 재검수 요청 (15분 SLA)

관련 파일:
  - 앱_app/공용_public/js_스크립트/app.js (v1.1.0 로컬 OK, 운영 OLD)
  - 앱_app/api/chat.js (v1.3.0 로컬 OK, 운영 OLD)
  - .vercel/project.json (projectId: prj_y4hadgOLtUQo9CkWOmW0MOjcweGa)

우선순위: 🔥 긴급 (CRITICAL — 학생 시연 차단 가능)
──────────────────────────
```

---

## 김감사 QA팀 역할 경계 준수 ✅
본 보고서는 **판정·진단·위임**만 수행. 코드 수정·재배포 트리거는 담당 팀(슈베이스/자비스) 소관.
