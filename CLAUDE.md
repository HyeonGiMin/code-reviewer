# CLAUDE.md

Claude Code가 이 레포지토리에서 작업할 때 읽는 지침 파일.

## 프로젝트 문서

@docs/PROJECT.md
@docs/ROADMAP.md
@docs/JENKINS.md

---

## 명령어

```bash
npm run dev      # 개발 서버 (localhost:3000)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
```

---

## 코딩 규칙

### Next.js App Router
- `'use client'`는 꼭 필요한 컴포넌트에만 붙인다 (Server Component 기본값 유지).
- API Route는 반드시 `auth()` 세션 확인 후 리소스 소유자 검증.
- 민감한 로직(DB 쿼리, 토큰 처리)은 서버 사이드에서만.

### TypeScript
- `any` 타입 금지. `src/types/index.ts` 공통 타입을 재사용.
- null/undefined는 옵셔널 체이닝과 기본값으로 안전하게 처리.

### Tailwind CSS v4
- 조건부 클래스는 `cn()` (`src/lib/utils.ts`) 사용.
- 인라인 `style={}`은 동적 값이 필요한 경우에만 제한적으로 사용.

### PostgreSQL
- 파라미터화 쿼리(`$1`, `$2`) 필수 — SQL injection 방지.
- `src/lib/postgres.ts` Pool 싱글턴 사용, `new Pool()` 직접 생성 금지.

### MongoDB
- `src/lib/mongodb.ts` 연결 싱글턴 사용.
- 모델 등록: `mongoose.models.X ?? mongoose.model('X', XSchema)` 패턴 필수.

### VCS 레이어
- `src/lib/vcs/types.ts`의 `VcsProvider` 인터페이스를 통해서만 VCS 접근.
- 인증 정보는 환경변수로 관리, 코드에 하드코딩 금지.

### 보안
- `NEXT_PUBLIC_` 접두사에 시크릿 값 절대 사용 금지.
- 에러 메시지에 스택 트레이스·DB 스키마 포함 금지.
- 사용자 입력을 `dangerouslySetInnerHTML`에 직접 전달 금지.

---

## 개선 작업 시 워크플로우

1. `docs/ROADMAP.md`에서 해당 항목 확인
2. 작업 완료 후 `- [ ]` → `- [x]` 로 변경
3. 완료 기록 테이블에 날짜와 항목 추가
4. `docs/PROJECT.md`의 "알려진 제약" 항목도 함께 업데이트
