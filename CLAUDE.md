# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Code review web application supporting SVN and Git repositories. Users configure their own repositories, browse commit logs, view diffs, and leave comments on changes.

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS v4
- **Auth**: NextAuth v5 (beta) — Credentials provider, JWT session
- **PostgreSQL**: users, repositories (via `pg` pool) — `src/lib/postgres.ts`
- **MongoDB**: reviews/comments, diff snapshots (via `mongoose`) — `src/lib/mongodb.ts`

## Commands

```bash
npm run dev      # 개발 서버 (localhost:3000)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
```

## Project Structure

```
src/
  app/
    api/
      auth/[...nextauth]/  # NextAuth handler
      repositories/        # CRUD: 사용자 레포지토리 설정
      reviews/             # CRUD: 코멘트/리뷰 (MongoDB)
    auth/                  # 로그인 페이지
    dashboard/             # 메인 대시보드
    repositories/          # 레포지토리 목록/상세
  lib/
    auth.ts                # NextAuth 설정
    postgres.ts            # pg Pool 싱글턴
    mongodb.ts             # mongoose 연결 싱글턴 (dev hot-reload 대응)
  types/index.ts           # 공통 타입 (User, Repository, CommitLog, FileDiff, Review)
db/
  init.sql                 # PostgreSQL 스키마 초기화
```

## Environment Variables

`.env.local`에 설정 (`.env.example` 참고):

| 변수 | 용도 |
|------|------|
| `POSTGRES_HOST/PORT/DB/USER/PASSWORD` | PostgreSQL 연결 |
| `MONGODB_URI` | MongoDB 연결 |
| `AUTH_SECRET` | NextAuth JWT 서명 키 |
| `AUTH_URL` | 배포 시 서비스 URL |

## DB 역할 분리

- **PostgreSQL**: 구조화 데이터 — `users`, `repositories` (`db/init.sql`로 초기화)
- **MongoDB**: 문서형 데이터 — `Review` 모델 (코멘트, diff 캐시 등)

## Key Design Decisions

- `ReviewComment.filePath`는 optional — 파일별 코멘트 vs 커밋 단위 코멘트 방식은 미결정 상태
- VCS 타입은 `'git' | 'svn'` (`src/types/index.ts`의 `VcsType`)
- 실제 Git/SVN 명령 실행 로직은 아직 미구현 (API route에서 추가 예정)
