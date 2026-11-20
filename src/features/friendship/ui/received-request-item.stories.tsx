import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { Friendship } from "@/entities/friendship";
import { ReceivedRequestItem } from "./received-request-item";

const request: Friendship = {
  id: 11,
  senderId: 7,
  senderNickname: "재즈냥",
  receiverId: 1,
  receiverNickname: "코드왕",
  status: "PENDING",
};

const meta = {
  title: "Features/Friendship/ReceivedRequestItem",
  component: ReceivedRequestItem,
  tags: ["autodocs"],
  args: { friendship: request },
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
} satisfies Meta<typeof ReceivedRequestItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongName: Story = {
  args: { friendship: { ...request, senderNickname: "세상에서가장긴닉네임을가진재즈피아니스트" } },
};
