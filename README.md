# 🎮 공도 AI-Game

**TRACK 01 바이브코딩 — 넷마블문화재단 × 공도 협업 초등 교육 플랫폼**

초등 5~6학년 학생이 자연어 문서로 AI에게 게임을 만들어달라고 부탁하고, 친구들과 패들렛에서 공유·플레이하는 5차시 창의 교육과정.

🌐 **운영 URL**: https://gongdo-ai-game.vercel.app/

📄 **외부 개발자 핸드오프 문서**: [`docs/DEVELOPER_HANDOFF.md`](docs/DEVELOPER_HANDOFF.md) — 이슈 발생 시 트러블슈팅·롤백·코드 위치 한 페이지 안내

🏷️ **안정 버전**: [`v0.4.0-pilot`](https://github.com/syn-glitch/gongdo-ai-game/releases/tag/v0.4.0-pilot)

---

## 🚀 핵심 기능

| 기능 | 상태 |
|:---|:---|
| 4-pane 레이아웃 (드로어 · 문서 · 게임 · AI튜터) | ✅ |
| 5차시 하네스 문서 자동 로딩 | ✅ |
| Claude haiku-4-5 게임 생성 + 30초 쿨다운 | ✅ |
| AI튜터 (공도쌤) 컨텍스트 인지 + 위치 힌트 | ✅ |
| 캐릭터 4종 (이모지 임시) · 배경 4종 | ✅ |
| Tone.js BGM (기본 + Claude 작곡) | ✅ |
| 게임에 음악 자동 삽입 | ✅ |
| 발표자료 평문 텍스트 클립보드 복사 | ✅ |
| Supabase Storage 게임 호스팅 + 공개 URL | ✅ |
| 패들렛 공유 (URL 자동 임베드) | ✅ |

## 📂 폴더 구조

```
TRACK01_바이브코딩/
├─ 앱_app/             ← 실제 배포 코드 (Vercel)
│  ├─ index.html
│  ├─ teacher.html (예정)
│  ├─ 공용_public/    스타일·스크립트·이미지·config
│  ├─ api/            Vercel 서버리스 함수 (chat·music·upload-game·play)
│  ├─ 차시_lessons/   하네스 문서 5종
│  └─ 에셋_assets/    캐릭터·배경·샘플게임
├─ 기획_planning/      기획서 v2 + 개발방향
├─ 태스크_tasks/       스텝 개발 로드맵 + 작업 지시서
├─ 디자인_design/      브랜드 팔레트
├─ 문서_docs/          개발 문서
└─ 릴리스_releases/    버전 스냅샷
```

## 🛠 기술 스택

- **프론트엔드**: 순수 HTML/CSS/JS (빌드 없음) · Tone.js (BGM)
- **AI**: Anthropic Claude haiku-4-5 + Prompt Caching
- **DB·Storage**: Supabase (ap-northeast-2 서울)
- **배포**: Vercel
- **공유 플랫폼**: Padlet
- **언어**: 한국어 (UI·문서 전부)

## 🏃 로컬 개발

```bash
cd 앱_app
npm install
node dev-server.js
# → http://localhost:3000
```

`.env.local` 필요:
```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

## 📋 개발 진행

전체 22 STEP 중 **15+ STEP 완료**. 상세는 [`태스크_tasks/2026-04/task_공도AI게임_스텝개발.md`](태스크_tasks/2026-04/task_공도AI게임_스텝개발.md) 참고.

## 🔐 보안

- 학생 계정 불필요 (익명 ID localStorage 보관)
- API 키는 모두 Vercel 환경변수 (Encrypted)
- iframe sandbox `allow-scripts` 단일 정책
- Rate limit: 게임 생성 5/분, 튜터 15/분, 음악 5/분
- Supabase 게임 파일 90일 TTL 자동 삭제

## © 라이선스

© 2026 Netmarble Cultural Foundation × 공도 (Gongdo). All Rights Reserved.

Powered by Claude (Anthropic) · Tone.js · Supabase · Vercel.
