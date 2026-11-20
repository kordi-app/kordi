import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { Friendship } from "@/entities/friendship";
import { SentRequestItem } from "./sent-request-item";

const request: Friendship = {
  id: 12,
  senderId: 1,
  senderNickname: "코드왕",
  receiverId: 9,
  receiverNickname: "블루스박",
  status: "PENDING",
};

const meta = {
  title: "Features/Friendship/SentRequestItem",
  component: SentRequestItem,
  tags: ["autodocs"],
  args: { friendship: request },
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
} satisfies Meta<typeof SentRequestItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongName: Story = {
  args: { friendship: { ...request, receiverNickname: "세상에서가장긴닉네임을가진재즈피아니스트" } },
};
