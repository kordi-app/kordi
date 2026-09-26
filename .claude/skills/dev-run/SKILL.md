---
name: dev-run
description: kordi 풀스택(MySQL + Spring 서버 + Next 클라이언트)을 로컬에서 실행·검증할 때 사용. 실행 순서, 환경변수, 포트, 빌드/포맷/린트 명령을 담고 있다.
---

# kordi 로컬 실행

## 실행 순서

```bash
# 1. DB (MySQL 8, 포트 3306)
cd kordi-server && docker compose up -d

# 2. 백엔드 (포트 8080)
./gradlew bootRun        # .env의 DB_*, JWT_SECRET, GOOGLE_CLIENT_* 필요

# 3. 프론트엔드 (포트 3000)
cd ../kordi-client && pnpm dev
```

- 백엔드 헬스체크: `curl localhost:8080/health-check`
- 스키마는 `ddl-auto: update`로 자동 생성, 시드는 `data.sql` 자동 로드 (INSERT IGNORE라 재실행 안전)
- 프론트 환경변수: `NEXT_PUBLIC_API_URL` (기본 `http://localhost:8080`)
- Google 로그인은 실제 OAuth 리다이렉트가 필요하므로 브라우저에서만 검증 가능

## 검증 명령

| 대상 | 명령 |
|---|---|
| 서버 포맷 (커밋 전 필수) | `./gradlew spotlessApply` |
| 서버 빌드+테스트 | `./gradlew build` |
| 서버 테스트만 | `./gradlew test` (Spring context 필요 → DB 떠 있어야 함) |
| 클라 린트 | `pnpm lint` |
| 클라 타입체크 겸 빌드 | `pnpm build` (별도 테스트 프레임워크 없음) |

## 주의

- 두 저장소는 `/Users/lcy/Dev/kordi/` 아래 **별도 git 저장소** (`kordi-server`, `kordi-client`) — 커밋은 각자에서.
- 백엔드 테스트(`@SpringBootTest`)는 DB 연결이 필요하므로 docker compose를 먼저 올릴 것.
- 인증 API를 curl로 직접 테스트하려면 로그인 후 브라우저 쿠키(`kordi_at`)의 JWT를 꺼내 `Authorization: Bearer <token>` 헤더로 사용.
