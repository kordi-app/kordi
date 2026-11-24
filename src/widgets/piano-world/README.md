# piano-world

홈 화면의 걸어 다니는 3D 피아노 월드예요. 처음 보는 사람을 위한 지도예요.

## 폴더

| 폴더 | 내용 | 규칙 |
|---|---|---|
| `engine/` | 지도, 물리, 지역, 코스, 하늘섬, 꿈의 바다, 동굴, 공의 **순수 계산** | three.js·React를 쓰지 않아요. 테스트(`*.test.ts`)가 여기 있어요 |
| `ui/world.tsx` | 3D 장면과 **한 프레임의 순서** | 지역마다의 규칙은 `ui/frame/`에 두고 여기서는 부르기만 해요 |
| `ui/frame/` | 지역·기능별 한 프레임 처리 (코스, 하늘에서 낙하, 섬의 비밀, 동굴, 공) | `FrameContext`를 받아 플레이어를 움직이고 이벤트를 보내요 |
| `ui/piano-world-scene.tsx` | 페이지: 상태, 오디오, 서버 접속, HUD를 조립 | 지역마다의 이벤트 처리는 `ui/hooks/use-*-events.ts`로 |
| `ui/hooks/` | 페이지 쪽 훅. 지역 이벤트(`use-sky-events`, `use-dream-events`, `use-cave-events`), 저장(`use-cave`, `use-dream-sea`…), 이동, 조작 | 브라우저 저장은 `@/shared/lib/storage`만 거쳐요 |
| `ui/hud/` | 화면 위 UI (카드, 배너, 상태) | |
| `ui/island/`, `ui/*.tsx` | 지역별 3D 그리기 | |
| `net/` | 서버 WebSocket 프로토콜과 접속 | 메시지 모양은 `net/protocol.ts`에 한 번만 정의해요. 서버 저장소의 `world/` 패키지와 짝이에요 |
| `audio/` | 소리 | |
| `lib/debug-seam.ts` | 개발 서버에서만 `window.__kordi`로 상태를 보고 순간이동 | |

## 한 프레임의 순서 (`ui/world.tsx`)

1. 도착 처리(지역에 들어올 때 한 번): 위치, 지역별 `enter*`
2. 코스 시계·용(`stepCourseBefore`)
3. 걷기 → 점프·낙하(`engine/player.ts`)
4. 하늘 낙하 효과, 섬의 비밀, 동굴, 꿈의 바다(`ui/frame/*`)
5. 밟은 건반·지형 소리, 위치 전송
6. 공(`stepBallsFrame`)
7. 주변 상호작용, 포탈, 카메라

## 지역을 하나 더 만들 때

1. `engine/regions.ts`의 `REGION_IDS`와 `REGIONS`에 추가해요. 특별한 지형이면 `RegionDef`에 플래그를 두고 `engine/physics.ts`의 `groundAt`에 분기를 추가해요.
2. 서버 `WorldLobby.REGIONS`에도 추가해요(`course-contract.test.ts`가 비교해요).
3. 지역 이름을 `shared/config/messages/{ko,en}.json`의 `home.world.regions`에 넣어요.
4. 한 프레임 규칙은 `ui/frame/<지역>-frame.ts`, 페이지 이벤트는 `ui/hooks/use-<지역>-events.ts`에 둬요.

숨겨진 콘텐츠(여는 조건, 보상, 관련 파일)는 [SECRETS.md](./SECRETS.md)에 있어요.
