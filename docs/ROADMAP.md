# Roadmap

개선 과제 목록. 완료 시 `- [x]`로 변경하고 완료 날짜를 기입.

우선순위: 🔴 High · 🟡 Medium · 🔵 Low

---

## 1. 리뷰 워크플로우

- [x] 🔴 Review 모델에 `status: 'pending' | 'approved' | 'needs_changes'` 필드 추가
- [x] 🔴 리뷰 상태 변경 API (`PATCH /api/repositories/[id]/reviews/[revision]`)
- [x] 🔴 커밋 상세 페이지 상단에 리뷰 상태 배지 및 승인/반려 버튼 UI
- [x] 🔴 커밋 로그 목록에 리뷰 상태 컬러 닷 표시 (승인 녹색 / 수정필요 빨강)
- [ ] 🟡 ReviewComment에 `resolved: boolean` 필드 추가 (코멘트 해결 처리)
- [ ] 🟡 해결된 코멘트 접기/펼치기 UI

## 2. 성능 — 대용량 Diff 대응

- [ ] 🔴 파일 트리에서 선택한 파일만 diff 렌더링 (현재 전체 렌더)
- [ ] 🟡 `@tanstack/virtual` 가상 스크롤 적용 (수천 줄 diff 대응)
- [ ] 🟡 파일 트리에 줄 변경량 표시 (`+123 / -45`)
- [ ] 🔵 커밋 로그 페이지 무한 스크롤 또는 페이지네이션

## 3. 코드 품질

- [ ] 🔴 `ReviewClient.tsx` 컴포넌트 분리
  - [ ] `DiffViewer.tsx` — diff 렌더링
  - [ ] `FileTree.tsx` — 파일 트리
  - [ ] `CommentPanel.tsx` — 코멘트 입력/목록
  - [ ] `ReviewToolbar.tsx` — 상단 툴바
- [ ] 🟡 SWR 도입 (`useSWR`) — 리뷰/diff fetch 낙관적 업데이트
- [ ] 🔵 VCS 레이어 단위 테스트 (`git.ts`, `svn.ts`)
- [ ] 🔵 API route 통합 테스트

## 4. 기능 보완

- [ ] 🔴 레포지토리 수정/삭제 API 및 UI
- [ ] 🟡 키보드 단축키 (`j/k` 파일 이동, `[/]` hunk 이동, `c` 코멘트)
- [ ] 🟡 커밋 로그 검색/필터 (작성자, 날짜, 키워드)
- [ ] 🔵 다크 모드 (Tailwind CSS v4 `dark:` 변수)
- [ ] 🔵 인앱 알림 (내 코멘트에 답글 시)

## 5. 운영

- [ ] 🟡 `docker-compose.yml` (PostgreSQL + MongoDB + 앱 한번에 실행)
- [x] 🔴 Jenkins CI/CD 파이프라인 구성 (Lint → Build → PM2 배포)
- [ ] 🔵 에러 모니터링 (Sentry 연동)

---

## 완료 기록

| 날짜 | 항목 |
|------|------|
| 2026-05-17 | `TruncatedLabel` ResizeObserver 적용, className optional 처리 |
| 2026-05-17 | 리뷰 워크플로우 구현 — status 필드, PATCH API, 상태 버튼 UI, 로그 목록 배지 |
| 2026-05-17 | Jenkins CI/CD 구성 — Jenkinsfile, ecosystem.config.js, docs/JENKINS.md |
