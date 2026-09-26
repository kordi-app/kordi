---
name: api-integration
description: kordi-server의 API를 kordi-client에 연동할 때(엔드포인트를 프론트에 새로 붙일 때) 사용. 프록시 라우트 핸들러 패턴, JWT 쿠키 인증 흐름, ApiResponse 응답 계약, CORS/공개 경로 설정을 담고 있다.
---

# 서버 API를 클라이언트에 연동하기

백엔드: Spring(`localhost:8080`), 프론트: Next.js(`localhost:3000`). 브라우저는 백엔드를 직접 호출하지 않고 **Next 라우트 핸들러를 프록시로 경유**한다 (httpOnly 쿠키의 토큰을 서버에서만 읽어 Bearer 헤더로 변환하기 위함).

## 요청 경로 두 가지

1. **브라우저 → Next 라우트 핸들러 → 백엔드** (인증 필요 API의 기본 경로)
   - `src/app/api/{path}/route.ts` 생성:
   ```ts
   import { NextRequest, NextResponse } from "next/server";
   import { apiClient } from "@/shared/api";

   export async function POST(request: NextRequest) {
     const body = await request.json();
     const result = await apiClient.post("api/scores", { json: body }).json();
     return NextResponse.json(result);
   }
   ```
   - 에러 전파가 필요하면 `@/shared/api/proxy.ts`의 `proxyBackend()` 래퍼 사용 (HTTPError 상태/바디를 그대로 전달).
   - 클라이언트 fetch 함수는 `ky.get("/api/...")`로 이 핸들러를 호출 (entities/features의 api/ 파일).

2. **RSC/Server Action → 백엔드 직접** — `@/shared/api`의 `apiClient` (쿠키에서 access token을 읽어 `Authorization: Bearer` 자동 첨부). 공개 API는 `publicApiClient`.

## 인증 흐름 (전제 지식)

- Google OAuth → 백엔드 `OAuth2SuccessHandler` → 프론트 `/api/auth/callback`에서 httpOnly 쿠키 저장
- 쿠키: `kordi_at` (access, 30분) / `kordi_rt` (refresh, 14일) — 상수는 `shared/config/auth.ts`의 `AUTH_COOKIES`
- 만료 시 `src/middleware.ts`가 `/api/auth/reissue`로 자동 재발급
- 백엔드는 stateless JWT — `JwtAuthenticationFilter`가 Bearer 검증

## 응답 계약

백엔드 응답은 `ApiResponse` 래퍼 (`kordi-server .../global/common/ApiResponse.java`):
- 성공: `ApiResponse.success(data)` — 단, `data`가 `@JsonUnwrapped`라 **페이로드 타입에 따라 JSON 형태가 다를 수 있다**. 연동 전 반드시 curl로 실제 응답을 확인:
  ```bash
  curl -s localhost:8080/api/rankings/EASY | head -c 500
  ```
- 에러: `{ code, message, path? }` — `code`는 `HTTP상태_도메인번호` 형식 (예: `4093002`), `CoreExceptionCode` enum 참고
- 페이징: `{ totalPage, totalCount, currentPage?, contents }`
- 클라이언트 타입은 각 fetch 파일에서 로컬 `ApiResponse<T>` 인터페이스로 선언하는 관례 (예: `entities/quiz/api/get-quiz-chords.ts`)

## 새 연동 체크리스트

1. 백엔드 엔드포인트가 공개인지 확인 — 공개면 `SecurityConfig.publicPaths`에 있어야 함
2. `entities/{domain}/model/types.ts`에 응답 타입 정의 (서버 DTO record와 필드 일치, enum은 문자열 리터럴 유니언)
3. 조회면 `entities/{domain}/api/` + queryOptions, 뮤테이션이면 `features/{domain}/api/`
4. 인증 필요 + 브라우저 호출이면 `app/api/{path}/route.ts` 프록시 추가
5. CORS는 백엔드 `SecurityConfig`에서 `localhost:3000` 허용 — 배포 origin 추가 시 여기 수정
