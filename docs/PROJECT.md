# Project Architecture

## 개요

Git(GitHub REST API) / SVN(WebDAV) 레포지토리를 등록하고, 커밋 로그를 탐색하며 diff를 보고 코멘트를 남기는 코드 리뷰 웹앱.

---

## 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js App Router (TypeScript) | 16.2.1 |
| 스타일 | Tailwind CSS v4 | 4.x |
| 인증 | NextAuth v5 beta — Credentials + JWT | 5.0.0-beta.30 |
| RDBMS | PostgreSQL via `pg` Pool | 8.x |
| Document DB | MongoDB via mongoose | 9.x |
| VCS | Git (GitHub REST API) / SVN (WebDAV + xml2js) | — |
| UI 컴포넌트 | Radix UI + lucide-react + sonner | — |
| 암호화 | AES-256-GCM (Node.js `crypto`) | — |

---

## 디렉토리 구조

```
src/
  app/
    api/
      auth/
        [...nextauth]/route.ts   NextAuth 핸들러
        signup/route.ts          회원가입 (bcryptjs 해싱)
      repositories/
        route.ts                 GET 목록 / POST 추가 (AES 암호화 저장)
        [id]/
          logs/route.ts          GET 커밋 로그 (VCS provider 위임)
          diff/[revision]/route.ts  GET diff + MongoDB 캐싱
          reviews/[revision]/route.ts  GET/POST 리뷰 코멘트
      reviews/route.ts           (미사용 — 추후 전역 리뷰 조회용)
    auth/
      signin/page.tsx            로그인 페이지
      signup/page.tsx            회원가입 페이지
    dashboard/
      layout.tsx                 사이드바 레이아웃
      page.tsx                   레포지토리 카드 홈
      repositories/
        page.tsx                 레포지토리 관리 (추가만 가능, 수정/삭제 미구현)
        AddRepositoryModal.tsx   레포지토리 추가 모달
        [id]/logs/
          page.tsx               커밋 로그 목록
          loading.tsx
          [revision]/
            page.tsx             커밋 상세 (Server Component — diff fetch)
            ReviewClient.tsx     Split-view diff 뷰어 + 코멘트 UI (~830줄)
            loading.tsx
    layout.tsx                   루트 레이아웃 (Toaster 포함)
    page.tsx                     루트 → /dashboard 리다이렉트

  components/
    layout/Sidebar.tsx           네비게이션 사이드바
    ui/                          Radix UI 래퍼 (badge, button, card, dialog 등)

  lib/
    auth.ts                      NextAuth 설정 — authorize() 에서 bcryptjs 검증
    postgres.ts                  pg Pool 싱글턴
    mongodb.ts                   mongoose 연결 싱글턴 (dev hot-reload 중복 방지)
    repositories.ts              레포지토리 조회 + AES 복호화 헬퍼
    crypto.ts                    encrypt(text) / decrypt(text) — AES-256-GCM
    utils.ts                     cn() — tailwind-merge + clsx
    vcs/
      types.ts                   VcsProvider 인터페이스, VcsAuth 타입
      index.ts                   getVcsProvider(repo) 팩토리
      git.ts                     GitHubProvider — getLogs / getCommit / getDiff
      svn.ts                     SvnProvider — WebDAV XML 파싱

  models/
    Review.ts                    mongoose 스키마 (복합 유니크 인덱스: repoId+revision+userId)
    CachedDiff.ts                diff 캐시 스키마 (복합 인덱스: repoId+revision)

  types/index.ts                 공통 타입 — VcsType, User, Repository, CommitLog, FileDiff,
                                 Review, ReviewComment

db/
  init.sql                       PostgreSQL 스키마 (users, repositories 테이블)
```

---

## 데이터 흐름

### 커밋 diff 조회
```
page.tsx (Server)
  → GET /api/repositories/[id]/diff/[revision]
      → CachedDiff 조회 (MongoDB)
      → 없으면 VcsProvider.getDiff() 호출
      → 결과 MongoDB에 저장 후 반환
  → ReviewClient.tsx (Client) 에 props로 전달
```

### 코멘트 저장
```
ReviewClient.tsx
  → POST /api/repositories/[id]/reviews/[revision]
      → auth() 세션 확인
      → Review 도큐먼트 upsert (userId 기준)
      → 코멘트 배열에 push
```

---

## 핵심 설계 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| DB 이중화 | PostgreSQL(구조) + MongoDB(문서) | 사용자/레포는 관계형, 리뷰/캐시는 스키마 유연성 필요 |
| 인증 정보 암호화 | AES-256-GCM, 환경변수 키 | HTTP Basic 자격증명을 DB에 평문 저장하지 않기 위함 |
| diff 캐싱 | MongoDB CachedDiff | 동일 revision 재조회 시 VCS API 호출 방지 |
| VCS 추상화 | VcsProvider 인터페이스 | git/svn 구현체 교체 및 추가 VCS 지원 용이 |
| ReviewComment.filePath optional | 선택 필드 | 파일별 코멘트 vs 커밋 전체 코멘트 방식 미결정 |

---

## 환경변수 (`.env.local`)

| 변수 | 용도 |
|------|------|
| `POSTGRES_HOST/PORT/DB/USER/PASSWORD` | PostgreSQL 연결 |
| `MONGODB_URI` | MongoDB 연결 |
| `AUTH_SECRET` | NextAuth JWT 서명 키 |
| `AUTH_URL` | 배포 시 서비스 URL |
| `ENCRYPTION_KEY` | AES-256 암호화 키 (32바이트 hex) |

---

## 알려진 제약 / 미완성 항목

- `src/app/api/reviews/route.ts` — 전역 리뷰 목록 조회 미구현
- 레포지토리 수정/삭제 API 및 UI 없음
- 리뷰 승인 상태(Approved/Needs Changes) 없음 — Review 모델에 `status` 필드 미존재
- `ReviewClient.tsx` 830줄 단일 파일 — 분리 필요
- 테스트 코드 없음
- 대용량 diff 가상 스크롤 없음
