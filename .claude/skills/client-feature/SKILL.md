---
name: client-feature
description: kordi-client(Next.js 16 + React 19, FSD 아키텍처)에 새 페이지·기능·컴포넌트를 추가할 때 사용. FSD 레이어 배치 결정, React Query 패턴, 폼, i18n, 디자인 시스템 적용 절차를 담고 있다.
---

# kordi-client: 새 페이지/기능 추가

Next.js 16 App Router / React 19 / TypeScript / Tailwind 4 / pnpm. 아키텍처는 Feature-Sliced Design — **먼저 `kordi-client/AGENTS.md`를 읽을 것** (FSD 규칙 + React/Next 성능 규칙 전체). 디자인 작업이면 `kordi-client/DESIGN.md`도 필수.

## 코드를 어느 레이어에 둘지 결정

| 만드는 것 | 위치 |
|---|---|
| 타입 정의, GET/조회 API, queryOptions | `entities/{domain}/` (model/types.ts, api/) |
| 뮤테이션(CUD), 사용자 인터랙션, 폼, 훅 | `features/{domain}/` (ui/, model/, lib/, api/) |
| 자기완결적 UI 블록(여러 feature 조합) | `widgets/{name}/` (ui/, model/) |
| 페이지 전체 조립 | `views/{page}/ui/{page}-page.tsx` |
| 라우트 셸(얇게, re-export만) | `app/[locale]/(routes)/{route}/page.tsx` |
| 도메인 무관 공용 | `shared/` (ui/, lib/, config/) |

핵심 규칙: import는 위→아래 단방향(`app → views → widgets → features → entities → shared`), 같은 레이어의 다른 슬라이스 import 금지, 모든 슬라이스는 `index.ts` 공개 API로만 노출.

## 새 페이지 절차

1. `views/{page}/ui/{page}-page.tsx` 작성 + `views/{page}/index.ts` export
2. `app/[locale]/(routes)/{route}/page.tsx`에서 view를 import해 렌더 (클라이언트 전용이면 옆에 `{route}-client.tsx` + `dynamic()` 패턴 — 기존 `piano/` 참고)
3. `shared/config/routes.ts`의 `ROUTES`에 경로 상수 추가
4. 사이드바 노출 시 `widgets/app-sidebar/model/nav-config.ts`에 추가
5. 인증 없이 접근 가능해야 하면 `shared/config/auth.ts`의 `PUBLIC_ROUTES`에 추가

## 데이터 페칭 패턴

- **조회(Read)**: `entities/{domain}/api/`에 fetch 함수 + `queries.ts`에 queryOptions 팩토리:
```ts
export const rankingQueries = {
  list: (difficulty: RankingDifficulty) =>
    queryOptions({ queryKey: ["ranking", difficulty], queryFn: () => getRankings(difficulty), staleTime: 30_000 }),
};
```
- **뮤테이션**: `features/{domain}/api/`에 함수, 컴포넌트에서 `useMutation` 사용.
- HTTP는 `ky`. 브라우저에서는 Next 라우트 핸들러(`/api/...`)를 경유(**api-integration 스킬 참고**), 서버(RSC)에서는 `@/shared/api`의 `apiClient` 직접 사용. entities의 서버 전용 함수는 `index.ts`가 아닌 `server.ts`로 export (기존 `entities/user/` 참고).

## 폼

react-hook-form + zod. 스키마는 `features/{domain}/model/schema.ts`, `zodResolver` 사용. 참고: `features/profile/ui/profile-form.tsx`.

## i18n (필수)

UI 문자열은 하드코딩 금지. `shared/config/messages/ko.json`과 `en.json` **양쪽에** 키를 추가하고 `useTranslations("namespace")`로 사용. 라우팅은 next-intl `[locale]` 프리픽스(기본 ko).

## 마무리 체크

```bash
pnpm lint && pnpm build   # 테스트 프레임워크는 없음 — build가 타입 체크 겸함
```
