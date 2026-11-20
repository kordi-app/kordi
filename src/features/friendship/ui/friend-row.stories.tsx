import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/shared/ui/button";
import { FriendAvatar } from "./friend-avatar";
import { FriendRow } from "./friend-row";

const meta = {
  title: "Features/Friendship/FriendRow",
  component: FriendRow,
  tags: ["autodocs"],
  args: {
    name: "코드왕",
    avatar: <FriendAvatar name="코드왕" />,
  },
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
} satisfies Meta<typeof FriendRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NameOnly: Story = {};

export const WithNote: Story = { args: { note: "3분 전에 접속" } };

export const WithActions: Story = {
  args: {
    note: "친구 요청을 보냈어요",
    actions: <Button size="sm">수락</Button>,
  },
};

export const LongName: Story = {
  args: {
    name: "세상에서가장긴닉네임을가진재즈피아니스트",
    avatar: <FriendAvatar name="세상에서가장긴닉네임을가진재즈피아니스트" />,
    note: "이 줄도 아주 길어서 한 줄에 다 들어가지 않으면 말줄임표로 잘려야 합니다",
    actions: <Button size="sm">수락</Button>,
  },
};
