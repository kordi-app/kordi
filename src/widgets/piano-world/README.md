# piano-world

홈 화면의 걸어 다니는 3D 피아노 월드예요. 처음 보는 사람을 위한 지도예요.

## 폴더

| 폴더 | 내용 | 규칙 |
|---|---|---|
| `engine/` | 지도, 물리, 지역, 코스, 하늘섬, 꿈의 바다, 동굴, 꿈꾸는 석상, 오르골 속, 공의 **순수 계산** | three.js·React를 쓰지 않아요. 테스트(`*.test.ts`)가 여기 있어요 |
| `engine/world-contract.json` | 서버가 지키게 하는 규칙(지역, 판정 위치, 머무는 시간, 이동 한도, 프로토콜 버전) | **서버 저장소에 똑같은 파일**이 있어요. 서버 숫자는 여기서만 읽고 코드에 복사하지 않아요. 바꿀 땐 두 저장소를 같이 바꾸고, 다르면 CI가 실패해요 |
| `engine/regions.ts` | 지역 정의: 테마, 포탈, 지형(`terrain`), 키보드 대신 바닥(`floor`), 링크 도착점(`entry`) | 지역의 생김새는 데이터로만 정해요. 포탈은 세 가지예요: 보이는 문, 문으로 그려지지 않지만 밟으면 가는 `invisible`, 그려지지도 밟히지도 않고 돌아올 자리만 정하는 `arriveOnly`(`isDrawn`/`isWalkThrough`로 물어요) |
| `ui/world.tsx` | 3D 장면과 **한 프레임의 순서** | 지역마다의 규칙은 몰라요. 지역의 프레임 목록을 돌며 부르기만 해요 |
| `ui/frame/region-frames.ts` | 지역 기능 → 프레임 목록 표(`FEATURE_FRAMES`) | 지역 규칙은 `RegionFrame`(`enter`/`before`/`after`)으로 |
| `ui/frame/*-frame.ts` | 지역·기능별 한 프레임 처리 (코스, 하늘에서 낙하, 섬의 비밀, 꿈의 바다, 동굴, 오르골 속, 공) | `FrameContext`를 받아 플레이어를 움직이고 이벤트를 보내요 |
| `ui/region-scene.tsx` | 지역마다 무엇을 그릴지 고르는 유일한 곳 | |
| `ui/piano-world-scene.tsx` | 페이지: 상태, 오디오, 서버 접속, HUD를 조립 | 지역마다의 이벤트 처리는 `ui/hooks/use-*-events.ts`로 |
| `ui/hooks/` | 페이지 쪽 훅. 지역 이벤트(`use-sky-events`, `use-dream-events`, `use-cave-events`, `use-musicbox-events`), 저장(`secret-places`: 숨은 곳을 찾았는지와 링크 허용, `use-cave`, `use-dream-sea`…), 이동, 조작 | 브라우저 저장은 `@/shared/lib/storage`만 거쳐요 |
| `ui/hud/` | 화면 위 UI (카드, 배너, 상태) | |
| `ui/island/`, `ui/*.tsx` | 지역별 3D 그리기 | |
| `net/` | 서버 WebSocket 프로토콜과 접속 | 메시지 모양은 `net/protocol.ts`에 한 번만 정의해요. 서버 저장소의 `world/` 패키지와 짝이에요 |
| `audio/` | 소리 | |
| `lib/debug-seam.ts` | 개발 서버에서만 `window.__kordi`로 상태를 보고 순간이동 | |

## 한 프레임의 순서 (`ui/world.tsx`)

1. 도착 처리(지역에 들어오거나 같은 지역 안에서 워프할 때): 위치, 지역 프레임 목록을 만들고 각 `enter`
2. 지역 프레임의 `before` (코스의 움직이는 발판, 용)
3. 걷기 → 점프·낙하(`engine/player.ts`)
4. 지역 프레임의 `after` (하늘 낙하 효과, 섬의 비밀과 꿈꾸는 석상, 동굴, 꿈의 바다, 오르골 속). 프레임이 `FrameContext` 말고 더 필요한 것(이번 프레임의 착지, 앉기 감정 표현 중인지…)은 `FrameInputs`로 받아요
5. 밟은 건반·지형 소리, 위치 전송
6. 공(`stepBallsFrame`)
7. 주변 상호작용, 포탈, 카메라

## 지역을 하나 더 만들 때

1. `engine/regions.ts`의 `REGION_IDS`와 `REGIONS`에 추가해요. 새 지형이면 `engine/terrains.ts`에 이름으로 등록하고 `terrain`/`floor`/`entry`로 적어요(물리는 손대지 않아요).
2. `world-contract.json`의 `regions`에 추가해요. **클라이언트와 서버 두 파일 모두**예요.
3. 지역 이름을 `shared/config/messages/{ko,en}.json`의 `home.world.regions`에 넣어요.
4. 한 프레임 규칙은 `ui/frame/<지역>-frame.ts`에 쓰고 `region-frames.ts`의 `FEATURE_FRAMES`에 한 줄 추가해요. 그리기는 `region-scene.tsx`, 페이지 이벤트는 `ui/hooks/use-<지역>-events.ts`에 두고 씬의 `arrivals` 표에 연결해요.
5. 음표 공이 없는 지역이면 `engine/ball.ts`의 `ballSpawns`에 넣어요.
6. 숨겨진 지역이면: 홀 쪽 포탈을 `invisible`(밟으면 감)이나 `arriveOnly`(다른 방법으로 감. 돌아올 자리만)로 적고, 발견 기록(`ui/hooks/use-<지역>.ts`, `@/shared/lib/storage`)을 만들어 `use-region-travel.ts`의 `initialRegion`에서 직접 링크를 막아요. [SECRETS.md](./SECRETS.md)에도 적어요.

## 서버와 주고받기

- 메시지 모양: `net/protocol.ts` (서버 `world/` 패키지와 짝)
- 프로토콜 버전: 접속할 때 `?v=`로 알리고, 서버는 welcome의 `v`로 답해요. 버전마다 달라지는 동작(예: 공 소식을 보낸 사람에게도 돌려주기)은 서버가 클라이언트 버전을 보고 정해요. 메시지 모양을 바꾸면 `world-contract.json`의 `protocol`을 올려요.
- 보상(달고래, 목걸이)은 서버가 판정해요. 머문 시간, 위치뿐 아니라 들어온 뒤의 **여정**(사람이 낼 수 있는 속도였는지, 동굴은 다리 건너편 쉼터를 지났는지)도 봐요. 목걸이 요청에는 이유와 함께 답이 와요(`CaveReplyMessage`).

숨겨진 콘텐츠(여는 조건, 보상, 관련 파일)는 [SECRETS.md](./SECRETS.md)에 있어요.
