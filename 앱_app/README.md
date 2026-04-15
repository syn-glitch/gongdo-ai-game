# 🎮 공도 AI-Game — 실습환경 앱

TRACK 01 바이브코딩 교육과정의 핵심 실습 플랫폼.

## 🚀 로컬 실행 (S01 기준)

```bash
cd "앱_app"
npx serve .
# → http://localhost:3000 접속
```

> `npx` 명령이 없으면 `npm install -g serve` 로 설치.

## 📂 폴더 구조

```
앱_app/
├─ index.html                    학생 진입 페이지
├─ 공용_public/
│  ├─ css_스타일/
│  │  ├─ reset.css               기본 리셋 + 접근성 유틸
│  │  ├─ palette.css             브랜드 팔레트 (CSS 변수)
│  │  ├─ layout.css              4-pane 레이아웃
│  │  └─ components.css          버튼·모달·드로어·튜터 컴포넌트
│  ├─ js_스크립트/
│  │  └─ app.js                  S01 상호작용 (Mock)
│  └─ 이미지_images/              UI 이미지 (로고·아이콘)
├─ api_서버함수/                  Vercel Edge (S04~S15에서 채움)
├─ 차시_lessons/                  하네스 문서 (S02에서 채움)
└─ 에셋_assets/
   ├─ 캐릭터_characters/          ㅋㅋ·토리·밥·레옹 (S10~S12)
   └─ 배경_backgrounds/           지구본 맵 등
```

## ✅ S01 완료 체크리스트

- [x] 4-pane 레이아웃 (좌 20% / 중 42% / 우 38%)
- [x] 하단 AI튜터 200px 고정 + 접기/펼치기 토글
- [x] 상단 헤더 [시작]·[저장]·[도움말]
- [x] 차시 폴더 5개 드로어 네비
- [x] 차시 선택 시 샘플 문서 자동 로딩
- [x] AI튜터 Mock 응답 (초등 친화 3종 패턴)
- [x] 30초 쿨다운 모달 + 카운트다운 UI (5회 초과 시 트리거)
- [x] 1024px 미만 반응형 대응
- [x] a11y: skip-link · ARIA · 키보드 Tab · 포커스 아웃라인
- [x] WCAG AA/AAA 콘트라스트 준수 (브라운 × 크림 7.82:1)

## 🔜 다음 STEP

- **S02**: 차시별 하네스 문서 JSON 로딩 + "내 작품" 서브폴더
- **S03**: [시작] → Mock HTML iframe 주입
- **S04**: Claude API 연결 + Vercel KV rate limit 5회/분 + 30초 쿨다운
- **S05**: AbortController 기반 재시작 루프

## 🎨 디자인 참조

- 팔레트: [`../디자인_design/브랜드_brand/palette.md`](../디자인_design/브랜드_brand/palette.md)
- 태스크: [`../태스크_tasks/2026-04/task_공도AI게임_스텝개발.md`](../태스크_tasks/2026-04/task_공도AI게임_스텝개발.md)
