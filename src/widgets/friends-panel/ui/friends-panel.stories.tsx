import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { Friendship } from "@/entities/friendship";
import { FriendsPanel } from "./friends-panel";

const ME = { id: 1, nickname: "건반요정" };

const NICKNAMES = [
  "재즈하는고양이",
  "도레미파솔",
  "밤의피아니스트",
  "코드마스터",
  "새벽세시연습",
  "하농중독",
  "쇼팽덕후",
  "오른손왼손",
  "블루노트",
  "메트로놈",
  "세븐스코드",
  "검은건반",
];

/** Accepted friendships, alternating who sent the original request. */
function makeFriends(count: number): Friendship[] {
  return NICKNAMES.slice(0, count).map((nickname, i) => {
    const otherId = 100 + i;
    const iSent = i % 2 === 0;
    return {
      id: 1000 + i,
      senderId: iSent ? ME.id : otherId,
      senderNickname: iSent ? ME.nickname : nickname,
      receiverId: iSent ? otherId : ME.id,
      receiverNickname: iSent ? nickname : ME.nickname,
      status: "ACCEPTED",
    };
  });
}

const received: Friendship[] = [
  { id: 2001, senderId: 201, senderNickname: "피아노치는곰", receiverId: ME.id, receiverNickname: ME.nickname, status: "PENDING" },
  { id: 2002, senderId: 202, senderNickname: "음대생지망", receiverId: ME.id, receiverNickname: ME.nickname, status: "PENDING" },
];

const sent: Friendship[] = [
  { id: 3001, senderId: ME.id, senderNickname: ME.nickname, receiverId: 301, receiverNickname: "화성학공부중", status: "PENDING" },
];

const seed = (friends: Friendship[], recv: Friendship[], snt: Friendship[]) => [
  [["friendship", "friends"], friends],
  [["friendship", "received"], recv],
  [["friendship", "sent"], snt],
];

const meta = {
  title: "Widgets/FriendsPanel",
  component: FriendsPanel,
  tags: ["autodocs"],
  args: { currentUserId: ME.id },
  decorators: [(Story) => <div className="max-w-xl">{Story()}</div>],
} satisfies Meta<typeof FriendsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Incoming and outgoing requests around a short friend list. */
export const WithRequests: Story = {
  parameters: { queries: seed(makeFriends(3), received, sent) },
};

/** Empty state with the add-friend dialog trigger. */
export const NoFriends: Story = {
  parameters: { queries: seed([], [], []) },
};

/** From 8 friends on, a name filter appears next to the heading. */
export const ManyFriends: Story = {
  parameters: { queries: seed(makeFriends(12), [], sent) },
};
